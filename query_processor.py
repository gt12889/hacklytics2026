"""
Query Processor Module
Extracts drug names, patient context, and generates query embeddings
"""
import re
from typing import Dict, List, Tuple, Optional
from sentence_transformers import SentenceTransformer
import numpy as np

# Common drug names dictionary (can be expanded)
DRUG_DICTIONARY = {
    # Original entries
    'warfarin', 'metformin', 'ibuprofen', 'aspirin', 'acetaminophen',
    'naproxen', 'diclofenac', 'celecoxib', 'meloxicam', 'indomethacin',
    'insulin', 'metoprolol', 'lisinopril', 'amlodipine', 'atorvastatin',
    'omeprazole', 'pantoprazole', 'lansoprazole', 'esomeprazole',
    # Added to cover all config.TARGET_DRUGS interaction pairs
    'methotrexate', 'lithium', 'enalapril', 'fluoxetine', 'tramadol',
    'sertraline', 'paroxetine', 'simvastatin', 'clarithromycin',
    'erythromycin', 'digoxin', 'amiodarone', 'ciprofloxacin', 'prednisone',
    'levofloxacin', 'dexamethasone', 'spironolactone', 'metronidazole',
    'verapamil', 'diltiazem', 'cyclosporine', 'furosemide', 'rosuvastatin',
    'citalopram', 'escitalopram', 'phenelzine', 'propranolol', 'heparin',
    'oxycodone', 'diazepam', 'hydrochlorothiazide',
}

# Brand name → generic name mapping (normalizes brand names during extraction)
BRAND_TO_GENERIC = {
    "coumadin": "warfarin", "jantoven": "warfarin",
    "advil": "ibuprofen", "motrin": "ibuprofen",
    "glucophage": "metformin", "lipitor": "atorvastatin",
    "biaxin": "clarithromycin", "prozac": "fluoxetine",
    "zoloft": "sertraline", "paxil": "paroxetine",
    "ultram": "tramadol", "zocor": "simvastatin",
    "lanoxin": "digoxin", "cordarone": "amiodarone",
    "cipro": "ciprofloxacin", "crestor": "rosuvastatin",
    "celexa": "citalopram", "lexapro": "escitalopram",
    "nardil": "phenelzine", "inderal": "propranolol",
    "valium": "diazepam", "oxycontin": "oxycodone",
    "lasix": "furosemide", "aldactone": "spironolactone",
    "deltasone": "prednisone", "decadron": "dexamethasone",
    "calan": "verapamil", "cardizem": "diltiazem",
    "aleve": "naproxen", "vasotec": "enalapril",
    "voltaren": "diclofenac", "celebrex": "celecoxib",
    "mobic": "meloxicam", "prilosec": "omeprazole",
    "protonix": "pantoprazole", "prevacid": "lansoprazole",
    "nexium": "esomeprazole", "lopressor": "metoprolol",
    "norvasc": "amlodipine", "humulin": "insulin",
    "novolin": "insulin", "flagyl": "metronidazole",
    "levaquin": "levofloxacin", "neoral": "cyclosporine",
    "sandimmune": "cyclosporine",
}

class QueryProcessor:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """Initialize with sentence transformer model for embeddings"""
        self.model = SentenceTransformer(model_name)
        
    def extract_drugs(self, query: str) -> List[str]:
        """
        Extract drug names from query using regex and drug dictionary.
        Brand names are automatically normalized to their generic equivalents.
        Returns list of generic drug names found.
        """
        query_lower = query.lower()
        found_drugs = []

        # Check against generic drug dictionary
        for drug in DRUG_DICTIONARY:
            if drug in query_lower and drug not in found_drugs:
                found_drugs.append(drug)

        # Check against brand names and normalize to generic
        for brand, generic in BRAND_TO_GENERIC.items():
            if brand in query_lower and generic not in found_drugs:
                found_drugs.append(generic)

        # Also try to find capitalized drug names (handles PascalCase in text)
        words = re.findall(r'\b[A-Z][a-z]+\b', query)
        for word in words:
            w = word.lower()
            if w in DRUG_DICTIONARY and w not in found_drugs:
                found_drugs.append(w)
            elif w in BRAND_TO_GENERIC and BRAND_TO_GENERIC[w] not in found_drugs:
                found_drugs.append(BRAND_TO_GENERIC[w])

        return found_drugs
    
    def extract_patient_context(self, query: str) -> Dict[str, Optional[str]]:
        """
        Extract patient demographics and context from query
        Returns dict with age, sex, conditions
        """
        context = {
            'age': None,
            'sex': None,
            'conditions': []
        }
        
        # Extract age
        age_pattern = r'(\d+)[-\s]*(?:year|yr|yo|years?)[-\s]*(?:old|of age)?'
        age_match = re.search(age_pattern, query, re.IGNORECASE)
        if age_match:
            context['age'] = int(age_match.group(1))
        
        # Extract sex/gender
        if re.search(r'\b(female|woman|f|girl)\b', query, re.IGNORECASE):
            context['sex'] = 'female'
        elif re.search(r'\b(male|man|m|boy)\b', query, re.IGNORECASE):
            context['sex'] = 'male'
        
        # Extract common conditions (can be expanded)
        conditions_patterns = {
            'atrial fibrillation': r'\b(afib|atrial fibrillation|a\.?f\.?)\b',
            'diabetes': r'\b(diabetes|diabetic|dm|type\s*[12]\s*diabetes)\b',
            'hypertension': r'\b(hypertension|htn|high blood pressure)\b',
            'osteoarthritis': r'\b(osteoarthritis|oa)\b',
            'renal': r'\b(renal|kidney|ckd|chronic kidney)\b'
        }
        
        for condition, pattern in conditions_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                context['conditions'].append(condition)
        
        return context
    
    def generate_embedding(self, query: str) -> np.ndarray:
        """
        Generate query embedding using sentence transformer
        Returns numpy array of embeddings
        """
        embedding = self.model.encode(query, convert_to_numpy=True)
        return embedding
    
    def process_query(self, query: str) -> Dict:
        """
        Main processing function that extracts all information from query
        Returns dict with drugs, context, and embedding
        """
        drugs = self.extract_drugs(query)
        context = self.extract_patient_context(query)
        embedding = self.generate_embedding(query)
        
        return {
            'drugs': drugs,
            'context': context,
            'embedding': embedding,
            'original_query': query
        }
