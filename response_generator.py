"""
Response Generator Module
Formats results with LLM summarization via Gemini API
"""
import os
from typing import List, Dict, Tuple
import google.generativeai as genai
from data_models import FAERSCase
from dotenv import load_dotenv

load_dotenv()

class ResponseGenerator:
    """Generates natural language responses using Gemini API"""
    
    def __init__(self, api_key: str = None):
        """Initialize Gemini API"""
        api_key = api_key or os.getenv('GEMINI_API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
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
        high_risk_count = sum(1 for _, scores in top_cases if scores['risk_score'] >= 7.0)
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
                           risk_score: float) -> str:
        """Generate natural language summary using Gemini API"""
        if not self.model:
            return self.generate_recommendations(drugs, top_cases, {})
        
        # Build prompt
        cases_text = "\n\n".join([
            f"Case {i+1}: {case.description} (Outcome: {case.outcome_severity}, FAERS: {case.faers_matches})"
            for i, (case, _) in enumerate(top_cases[:3])
        ])
        
        prompt = f"""You are a clinical pharmacist analyzing drug interaction risks. 

Query: "{query}"
Drugs identified: {', '.join(drugs)}
Overall Risk Score: {risk_score:.1f}/10

Similar cases found:
{cases_text}

Provide a concise clinical summary (2-3 sentences) highlighting:
1. The primary drug interaction risk
2. Key findings from similar cases
3. A brief recommendation

Keep it professional and clinical."""
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating LLM summary: {e}")
            return self.generate_recommendations(drugs, top_cases, {})
    
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
        risk_score = top_scores['risk_score']
        
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
        if use_llm and self.model:
            summary = self.generate_llm_summary(query, drugs, top_cases, risk_score)
        else:
            summary = self.generate_recommendations(drugs, top_cases, query_context)
        
        # Format case summaries
        case_summaries = [
            self.format_case_summary(case, scores) 
            for case, scores in top_cases
        ]
        
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
        }
