"""
Query Logger Module
Captures comprehensive query run data for analysis
"""
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import time
from contextlib import contextmanager
import numpy as np
from data_models import FAERSCase


class QueryLogger:
    """Logs query runs with full detail to JSON files"""
    
    def __init__(self, log_dir: str = "logs"):
        """
        Initialize logger
        
        Args:
            log_dir: Directory to store log files
        """
        self.log_dir = log_dir
        self.current_run: Dict[str, Any] = {}
        self.timing_data: Dict[str, float] = {}
        self.start_time: Optional[float] = None
        
        # Ensure log directory exists
        os.makedirs(self.log_dir, exist_ok=True)
    
    def start_run(self, query: str):
        """Start logging a new query run"""
        self.current_run = {
            "timestamp": datetime.now().isoformat(),
            "query": {
                "original": query
            },
            "search": {},
            "ranking": {},
            "response": {},
            "timing": {},
            "errors": []
        }
        self.timing_data = {}
        self.start_time = time.time()
    
    def log_query_processing(self, processed: Dict):
        """Log query processing results"""
        self.current_run["query"].update({
            "extracted_drugs": processed.get("drugs", []),
            "patient_context": processed.get("context", {}),
            "embedding_dimension": len(processed.get("embedding", [])) if processed.get("embedding") is not None else None
        })
    
    def log_search(self, engine_version: str, search_results: List[tuple]):
        """Log search execution results"""
        # Convert search results to serializable format
        results_data = []
        for case, score in search_results:
            case_data = {
                "case_id": case.case_id,
                "drugs": case.drugs,
                "age": case.age,
                "sex": case.sex,
                "conditions": case.conditions,
                "outcome_severity": case.outcome_severity,
                "description": case.description[:200] + "..." if len(case.description) > 200 else case.description,
                "faers_matches": case.faers_matches,
                "similarity_score": float(score) if isinstance(score, (int, float, np.number)) else None
            }
            results_data.append(case_data)
        
        self.current_run["search"] = {
            "engine_version": engine_version,
            "results_count": len(search_results),
            "results": results_data
        }
    
    def log_ranking(self, ranked_results: List[tuple]):
        """Log ranking results with detailed scores"""
        ranked_data = []
        for case, score_details in ranked_results:
            case_data = {
                "case_id": case.case_id,
                "drugs": case.drugs,
                "age": case.age,
                "sex": case.sex,
                "conditions": case.conditions,
                "outcome_severity": case.outcome_severity,
                "description": case.description[:200] + "..." if len(case.description) > 200 else case.description,
                "faers_matches": case.faers_matches,
                "scores": {
                    "semantic_similarity": float(score_details.get("semantic_similarity", 0)),
                    "demographic_match": float(score_details.get("demographic_match", 0)),
                    "outcome_severity": float(score_details.get("outcome_severity", 0)),
                    "risk_score": float(score_details.get("risk_score", 0)),
                    "faers_matches": int(score_details.get("faers_matches", 0))
                }
            }
            ranked_data.append(case_data)
        
        self.current_run["ranking"] = {
            "ranked_count": len(ranked_results),
            "top_results": ranked_data
        }
    
    def log_response(self, response: Dict):
        """Log final response data"""
        self.current_run["response"] = {
            "risk_score": float(response.get("risk_score", 0)),
            "risk_level": response.get("risk_level", "UNKNOWN"),
            "summary": response.get("summary", ""),
            "recommendations": response.get("recommendations", ""),
            "total_matches": int(response.get("total_matches", 0)),
            "top_cases_count": len(response.get("top_cases", [])),
            "drugs": response.get("drugs", []),
            "query_context": response.get("query_context", {}),
            "label_hits_count": len(response.get("label_hits", []))
        }
    
    def log_timing(self, stage: str, duration_ms: float):
        """Log timing for a specific stage"""
        self.timing_data[stage] = duration_ms
    
    def log_error(self, error_type: str, error_message: str, stage: str = "unknown"):
        """Log an error that occurred during processing"""
        self.current_run["errors"].append({
            "stage": stage,
            "error_type": error_type,
            "error_message": error_message,
            "timestamp": datetime.now().isoformat()
        })
    
    @contextmanager
    def time_stage(self, stage_name: str):
        """Context manager for timing a stage"""
        start = time.time()
        try:
            yield
        except Exception as e:
            self.log_error(
                error_type=type(e).__name__,
                error_message=str(e),
                stage=stage_name
            )
            raise
        finally:
            duration_ms = (time.time() - start) * 1000
            self.log_timing(stage_name, duration_ms)
    
    def finalize_timing(self):
        """Calculate and store final timing metrics"""
        if self.start_time is not None:
            total_ms = (time.time() - self.start_time) * 1000
            self.current_run["timing"] = {
                **self.timing_data,
                "total_ms": total_ms
            }
    
    def save_run(self) -> Optional[str]:
        """
        Save the current run to a JSON file
        
        Returns:
            Path to saved log file, or None if save failed
        """
        try:
            self.finalize_timing()
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S_%f")
            filename = f"query_run_{timestamp}.json"
            filepath = os.path.join(self.log_dir, filename)
            
            # Write JSON file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.current_run, f, indent=2, ensure_ascii=False)
            
            return filepath
        except Exception as e:
            # Log the error but don't break the app
            print(f"Error saving log file: {e}")
            return None
    
    def get_current_run(self) -> Dict:
        """Get the current run data (for debugging)"""
        return self.current_run.copy()
