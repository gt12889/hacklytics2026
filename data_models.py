"""
Data Models for FAERS case reports
"""
from dataclasses import dataclass
from typing import List, Optional
import numpy as np

@dataclass
class FAERSCase:
    """Represents a single FAERS case report"""
    case_id: str
    drugs: List[str]
    age: Optional[int]
    sex: Optional[str]
    conditions: List[str]
    outcome_severity: str  # 'death', 'hospitalization', 'serious', 'non-serious'
    description: str
    faers_matches: int  # Number of FAERS reports matching this case
    embedding: Optional[np.ndarray] = None  # For vector search
    
    def to_text(self) -> str:
        """Convert case to searchable text"""
        parts = [
            f"Case {self.case_id}",
            f"Drugs: {', '.join(self.drugs)}",
            f"Age: {self.age if self.age else 'Unknown'}",
            f"Sex: {self.sex if self.sex else 'Unknown'}",
            f"Conditions: {', '.join(self.conditions) if self.conditions else 'None'}",
            self.description
        ]
        return " ".join(parts)
