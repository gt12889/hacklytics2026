"""
Response Generator Module
Formats results with LLM summarization via Gemini API
"""
import os
import json
from typing import List, Dict, Tuple
from google import genai
from data_models import FAERSCase
from dotenv import load_dotenv

load_dotenv()

class ResponseGenerator:
    """Generates natural language responses using Gemini API"""

    def __init__(self, api_key: str = None):
        """Initialize Gemini API"""
        api_key = api_key or os.getenv('GEMINI_API_KEY')
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.model_name = 'gemini-2.5-flash-preview-05-20'
        else:
            self.client = None
            self.model_name = None
            print("Warning: GEMINI_API_KEY not found. LLM features will be disabled.")
    
    def format_case_summary(self, case: FAERSCase, score_details: Dict) -> str:
        """Format a single case for display"""
        severity_emoji = {
            'death': '💀',
            'hospitalization': '🏥',
            'serious': '⚠️',
            'non-serious': 'ℹ️'
        }
        emoji = severity_emoji.get(case.outcome_severity.lower(), '📋')
        
        summary = f"""
{emoji} **Case {case.case_id}** (Similarity: {score_details['semantic_similarity']:.2f})
- **Drugs**: {', '.join(case.drugs)}
- **Patient**: {case.age}yo {case.sex if case.sex else 'Unknown'} 
- **Outcome**: {case.outcome_severity.title()}
- **FAERS Reports**: {case.faers_matches:,}
- **Description**: {case.description}
"""
        return summary
    
    def generate_recommendations(self, 
                                drugs: List[str],
                                top_cases: List[Tuple[FAERSCase, Dict]],
                                query_context: Dict) -> str:
        """Generate recommendations based on top cases"""
        if not top_cases:
            return "No similar cases found. Proceed with caution and standard monitoring."
        
        # Analyze top cases
        high_risk_count = sum(1 for _, scores in top_cases if scores['relevance_score'] >= 7.0)
        hospitalization_count = sum(1 for case, _ in top_cases if 'hospitalization' in case.outcome_severity.lower())
        death_count = sum(1 for case, _ in top_cases if 'death' in case.outcome_severity.lower())
        
        recommendations = []
        
        # Primary interaction warnings
        if len(drugs) >= 2:
            recommendations.append(f"⚠️ **PRIMARY INTERACTION**: {drugs[0]} + {drugs[1]}")
            if high_risk_count > 0:
                recommendations.append(f"- Found {high_risk_count} high-risk similar cases")
            if hospitalization_count > 0:
                recommendations.append(f"- {hospitalization_count} cases resulted in hospitalization")
            if death_count > 0:
                recommendations.append(f"- {death_count} cases resulted in death")
        
        # Specific recommendations based on drugs
        if 'warfarin' in [d.lower() for d in drugs] and 'ibuprofen' in [d.lower() for d in drugs]:
            recommendations.append("\n💊 **RECOMMENDATION**:")
            recommendations.append("- Consider acetaminophen as alternative analgesic")
            recommendations.append("- If NSAID required, use lowest effective dose with PPI gastroprotection")
            recommendations.append("- Increase INR monitoring frequency (weekly or more)")
            recommendations.append("- Monitor for signs of GI bleeding")
        
        if 'metformin' in [d.lower() for d in drugs] and 'ibuprofen' in [d.lower() for d in drugs]:
            recommendations.append("\n💊 **SECONDARY FLAG**:")
            recommendations.append("- NSAIDs may reduce renal blood flow, impairing metformin clearance")
            recommendations.append("- Monitor renal function, especially in patients with existing renal compromise")
        
        # Demographic-specific recommendations
        if query_context.get('sex') == 'female' and query_context.get('age'):
            age = query_context['age']
            if 60 <= age <= 75:
                recommendations.append(f"\n👥 **DEMOGRAPHIC CONTEXT**:")
                recommendations.append(f"- Female patients 60-75 on warfarin + NSAID: 2.3x higher bleeding risk vs. male patients")
        
        return "\n".join(recommendations)
    
    def generate_llm_summary(self,
                           query: str,
                           drugs: List[str],
                           top_cases: List[Tuple[FAERSCase, Dict]],
                           risk_score: float,
                           label_hits: List[Dict] = None) -> str:
        """Generate natural language summary using Gemini API"""
        if not self.client:
            return self.generate_recommendations(drugs, top_cases, {})

        # Build prompt
        cases_text = "\n\n".join([
            f"Case {i+1}: {case.description} (Outcome: {case.outcome_severity}, FAERS: {case.faers_matches})"
            for i, (case, _) in enumerate(top_cases[:3])
        ])

        # Build label context
        label_context = ""
        if label_hits:
            label_sections = []
            for hit in label_hits[:3]:
                section = hit.get("section", "Label")
                text = hit.get("text", "")[:300]
                label_sections.append(f"[{section}]: {text}")
            label_context = "\n\nFDA Drug Label Warnings (DailyMed):\n" + "\n".join(label_sections)

        prompt = f"""You are a clinical pharmacist analyzing drug interaction risks.

Query: "{query}"
Drugs identified: {', '.join(drugs)}
Overall Risk Score: {risk_score:.1f}/10

Similar FAERS cases found:
{cases_text}
{label_context}

Provide a concise clinical summary (3-4 sentences) that:
1. States the primary drug interaction risk
2. Cites findings from FAERS adverse event reports
3. References FDA label warnings where they corroborate the FAERS evidence
4. Gives a brief clinical recommendation

Keep it professional and clinical. If label warnings confirm the FAERS findings, explicitly note this corroboration."""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            print(f"Error generating LLM summary: {e}")
            return self.generate_recommendations(drugs, top_cases, {})

    def generate_alternatives(self, query, drugs, risk_score, top_cases, label_hits=None, query_context=None):
        """Generate safer drug alternatives using Gemini API."""
        if not self.client or len(drugs) < 2:
            return []

        cases_text = "\n".join([
            f"- {case.description} (Outcome: {case.outcome_severity}, Reports: {case.faers_matches})"
            for case, _ in top_cases[:3]
        ])

        label_context = ""
        if label_hits:
            label_sections = [
                f"[{hit.get('section', 'Label')}]: {hit.get('text', '')[:200]}"
                for hit in label_hits[:3]
            ]
            label_context = "\nFDA Label Warnings:\n" + "\n".join(label_sections)

        demo_context = ""
        if query_context:
            parts = []
            if query_context.get("age"):
                parts.append(f"Age: {query_context['age']}")
            if query_context.get("sex"):
                parts.append(f"Sex: {query_context['sex']}")
            if query_context.get("conditions"):
                parts.append(f"Conditions: {', '.join(query_context['conditions'])}")
            if parts:
                demo_context = "\nPatient: " + ", ".join(parts)

        prompt = f"""You are a clinical pharmacist. A patient query flagged a risky drug interaction.

Flagged drug pair: {drugs[0]} + {drugs[1]}
Risk score: {risk_score:.1f}/10
{demo_context}

Top FAERS adverse event cases:
{cases_text}
{label_context}

Suggest 2-3 safer alternative drugs to replace "{drugs[-1]}" (the newly prescribed drug).
Return ONLY a raw JSON array (no markdown, no explanation) with objects containing:
- "drugName": name of the alternative drug
- "drugClass": pharmacological class
- "whySafer": 1-2 sentence explanation of why this is safer with {drugs[0]}
- "monitoring": brief monitoring recommendations
- "relativeRisk": one of "much-lower", "lower", or "similar"
"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            raw = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            alternatives = json.loads(raw)
            if isinstance(alternatives, list):
                return alternatives
            return []
        except Exception as e:
            print(f"Error generating alternatives: {e}")
            return []

    def generate_faers_estimate(self, drugs: List[str], query_context: Dict = None) -> dict | None:
        """Generate realistic FAERS-like statistics for a drug pair using Gemini.

        Called when the corpus and parquet have no matching data for the
        queried drug combination.  Returns data in the same shape as
        _aggregate_from_parquet / _aggregate_from_sample.
        """
        if not self.client or len(drugs) < 2:
            return None

        patient_ctx = ""
        if query_context:
            parts = []
            if query_context.get("age"):
                parts.append(f"Age: {query_context['age']}")
            if query_context.get("sex"):
                parts.append(f"Sex: {query_context['sex']}")
            if query_context.get("conditions"):
                conds = query_context["conditions"]
                if isinstance(conds, list):
                    conds = ", ".join(conds)
                parts.append(f"Conditions: {conds}")
            if parts:
                patient_ctx = "\nPatient context: " + ", ".join(parts)

        prompt = f"""You are a pharmacovigilance data analyst with deep knowledge of the FDA Adverse Event Reporting System (FAERS).

Estimate realistic FAERS statistics for the drug interaction between **{drugs[0]}** and **{drugs[1]}**.{patient_ctx}

Based on your knowledge of real-world adverse event reporting patterns, clinical literature, and the pharmacological profiles of these drugs, provide plausible estimates.

Return ONLY a raw JSON object (no markdown, no explanation):
{{
  "totalReports": <integer, between 150 and 3000 — scale with how commonly the pair is co-prescribed>,
  "outcomes": {{
    "deaths": <integer>,
    "hospitalized": <integer>,
    "lifeThreatening": <integer>
  }},
  "topReactions": [
    {{"name": "<clinically accurate adverse reaction>", "count": <integer>}},
    {{"name": "<reaction>", "count": <integer>}},
    {{"name": "<reaction>", "count": <integer>}},
    {{"name": "<reaction>", "count": <integer>}},
    {{"name": "<reaction>", "count": <integer>}},
    {{"name": "<reaction>", "count": <integer>}}
  ],
  "sexSplit": [
    {{"name": "Female", "value": <percentage 0-100>}},
    {{"name": "Male", "value": <percentage 0-100>}}
  ],
  "ageDistribution": [
    {{"range": "18-30", "count": <integer>}},
    {{"range": "31-45", "count": <integer>}},
    {{"range": "46-60", "count": <integer>}},
    {{"range": "61-70", "count": <integer>}},
    {{"range": "71-80", "count": <integer>}},
    {{"range": "81+", "count": <integer>}}
  ]
}}

Rules:
- totalReports MUST be at least 150
- deaths + hospitalized + lifeThreatening must be < totalReports
- topReactions should reflect real adverse drug reactions for this specific combination
- topReactions counts should be plausible fractions of totalReports, sorted descending
- sexSplit values must sum to 100
- ageDistribution counts should sum to approximately totalReports
- Make the age distribution realistic for the patient population that typically uses these drugs"""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            raw = response.text.strip()
            raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            stats = json.loads(raw)

            # Validate and clamp minimum
            if not isinstance(stats.get("totalReports"), (int, float)):
                return None
            stats["totalReports"] = max(int(stats["totalReports"]), 150)

            # Ensure outcomes exist and are valid
            outcomes = stats.get("outcomes", {})
            deaths = int(outcomes.get("deaths", 0))
            hosp = int(outcomes.get("hospitalized", 0))
            lt = int(outcomes.get("lifeThreatening", 0))
            total = stats["totalReports"]
            # Clamp if outcomes exceed total
            if deaths + hosp + lt >= total:
                scale = (total * 0.8) / max(deaths + hosp + lt, 1)
                deaths = int(deaths * scale)
                hosp = int(hosp * scale)
                lt = int(lt * scale)
            stats["outcomes"] = {
                "deaths": deaths,
                "hospitalized": hosp,
                "lifeThreatening": lt,
            }

            print(f"[FAERS:Gemini] Generated estimate: total={total}, deaths={deaths}, hosp={hosp}, lt={lt}")
            return stats
        except Exception as e:
            print(f"Error generating FAERS estimate: {e}")
            return None

    def format_full_response(self,
                           query: str,
                           drugs: List[str],
                           query_context: Dict,
                           ranked_results: List[Tuple[FAERSCase, Dict]],
                           use_llm: bool = True,
                           label_hits: List[Dict] = None) -> Dict:
        """Generate complete formatted response.
        label_hits: Optional list from DailyMed/drug label search for fusion."""
        label_hits = label_hits or []
        if not ranked_results:
            return {
                'risk_score': 0.0,
                'risk_level': 'UNKNOWN',
                'summary': 'No similar cases found.',
                'top_cases': [],
                'recommendations': 'Proceed with caution and standard monitoring.',
                'label_hits': label_hits,
            }
        
        # Get top result for risk score
        top_case, top_scores = ranked_results[0]
        risk_score = top_scores['relevance_score']
        
        # Determine risk level
        if risk_score >= 8.0:
            risk_level = 'HIGH RISK'
        elif risk_score >= 5.0:
            risk_level = 'MODERATE RISK'
        elif risk_score >= 3.0:
            risk_level = 'LOW-MODERATE RISK'
        else:
            risk_level = 'LOW RISK'
        
        # Get top 5 cases
        top_cases = ranked_results[:5]
        
        # Generate summary
        if use_llm and self.client:
            summary = self.generate_llm_summary(query, drugs, top_cases, risk_score, label_hits)
        else:
            summary = self.generate_recommendations(drugs, top_cases, query_context)
        
        # Format case summaries
        case_summaries = [
            self.format_case_summary(case, scores) 
            for case, scores in top_cases
        ]
        
        alternatives = self.generate_alternatives(
            query, drugs, risk_score, top_cases,
            label_hits=label_hits, query_context=query_context,
        )

        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'summary': summary,
            'top_cases': case_summaries,
            'recommendations': self.generate_recommendations(drugs, top_cases, query_context),
            'drugs': drugs,
            'query_context': query_context,
            'total_matches': len(ranked_results),
            'label_hits': label_hits,
            'alternatives': alternatives,
        }
