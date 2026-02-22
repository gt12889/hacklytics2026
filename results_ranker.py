"""
Results Ranker Module
Scores and ranks search results by semantic similarity, outcome severity,
demographic match, and generates relevance score
"""
from typing import List, Tuple, Dict
import numpy as np
from data_models import FAERSCase

class ResultsRanker:
    """Ranks and scores search results"""
    
    # Outcome severity weights (higher = more severe)
    SEVERITY_WEIGHTS = {
        'death': 10.0,
        'hospitalization': 7.0,
        'serious': 4.0,
        'non-serious': 1.0
    }
    
    def __init__(self):
        pass
    
    def calculate_demographic_similarity(self, case: FAERSCase, query_context: Dict) -> float:
        """
        Calculate demographic similarity score (0-1)
        Higher score = better match
        """
        score = 0.0
        factors = 0
        
        # Age similarity (within 10 years = good match)
        if case.age and query_context.get('age'):
            age_diff = abs(case.age - query_context['age'])
            if age_diff <= 5:
                score += 1.0
            elif age_diff <= 10:
                score += 0.7
            elif age_diff <= 15:
                score += 0.4
            factors += 1
        
        # Sex match
        if case.sex and query_context.get('sex'):
            if case.sex.lower() == query_context['sex'].lower():
                score += 1.0
            factors += 1
        
        # Condition overlap
        if case.conditions and query_context.get('conditions'):
            case_conditions = set(c.lower() for c in case.conditions)
            query_conditions = set(c.lower() for c in query_context['conditions'])
            if case_conditions and query_conditions:
                overlap = len(case_conditions & query_conditions) / len(case_conditions | query_conditions)
                score += overlap
                factors += 1
        
        # Normalize
        if factors > 0:
            return score / factors
        return 0.5  # Default neutral score if no demographic info
    
    def calculate_outcome_severity_score(self, case: FAERSCase) -> float:
        """Calculate outcome severity score"""
        return self.SEVERITY_WEIGHTS.get(case.outcome_severity.lower(), 1.0)
    
    def calculate_relevance_score(self,
                           semantic_similarity: float,
                           demographic_match: float,
                           outcome_severity: float,
                           faers_matches: int) -> float:
        """
        Calculate overall relevance score (1-10)

        Formula:
        - Base: semantic similarity (0-1) * 5
        - Weighted by: outcome severity (normalized)
        - Boosted by: demographic match
        - Adjusted by: FAERS match count (log scale)
        """
        # Base score from semantic similarity (0-5)
        base_score = semantic_similarity * 5.0

        # Severity multiplier (0.5x to 2.0x)
        severity_multiplier = (outcome_severity / 10.0) * 2.0

        # Demographic boost (0.8x to 1.2x)
        demo_multiplier = 0.8 + (demographic_match * 0.4)

        # FAERS matches boost (log scale, max 1.5x)
        faers_boost = min(1.0 + (np.log10(max(faers_matches, 1)) / 10.0), 1.5)

        # Calculate final score
        relevance_score = base_score * severity_multiplier * demo_multiplier * faers_boost

        # Clamp to 1-10 range
        return min(max(relevance_score, 1.0), 10.0)
    
    def rank_results(self, 
                    search_results: List[Tuple[FAERSCase, float]],
                    query_context: Dict) -> List[Tuple[FAERSCase, Dict]]:
        """
        Rank search results with comprehensive scoring
        Returns list of (case, score_details) tuples
        """
        ranked = []
        
        for case, semantic_score in search_results:
            # Calculate all scores
            demo_score = self.calculate_demographic_similarity(case, query_context)
            severity_score = self.calculate_outcome_severity_score(case)
            relevance_score = self.calculate_relevance_score(
                semantic_score,
                demo_score,
                severity_score,
                case.faers_matches
            )

            score_details = {
                'semantic_similarity': semantic_score,
                'demographic_match': demo_score,
                'outcome_severity': severity_score,
                'relevance_score': relevance_score,
                'faers_matches': case.faers_matches
            }

            ranked.append((case, score_details))

        # Sort by relevance score descending
        ranked.sort(key=lambda x: x[1]['relevance_score'], reverse=True)
        
        return ranked
