"""
Search Engine Implementations
V1: Keyword exact match
V2: TFIDF + Cosine Similarity
V3: Vector Search with embeddings (in-memory)
V3Actian: Vector Search with Actian VectorAI DB
"""
from typing import List, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from data_models import FAERSCase
from query_processor import QueryProcessor

class V1KeywordSearch:
    """V1: Exact keyword matching baseline"""
    
    def search(self, query_drugs: List[str], cases: List[FAERSCase], top_k: int = 10) -> List[Tuple[FAERSCase, float]]:
        """
        Search cases by exact drug name matching
        Returns list of (case, score) tuples
        """
        results = []
        
        for case in cases:
            score = 0.0
            # Count how many query drugs appear in case
            for drug in query_drugs:
                if drug.lower() in [d.lower() for d in case.drugs]:
                    score += 1.0
            
            # Normalize score
            if len(query_drugs) > 0:
                score = score / len(query_drugs)
            
            if score > 0:
                results.append((case, score))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]


class V2TFIDFSearch:
    """V2: TFIDF + Cosine Similarity"""
    
    def __init__(self):
        self.vectorizer = None
        self.case_vectors = None
        self.cases = None
    
    def fit(self, cases: List[FAERSCase]):
        """Fit TFIDF vectorizer on all cases"""
        self.cases = cases
        case_texts = [case.to_text() for case in cases]
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.case_vectors = self.vectorizer.fit_transform(case_texts)
    
    def search(self, query_text: str, top_k: int = 10) -> List[Tuple[FAERSCase, float]]:
        """Search using TFIDF cosine similarity"""
        if self.vectorizer is None or self.cases is None:
            raise ValueError("Must call fit() before search()")
        
        # Transform query
        query_vector = self.vectorizer.transform([query_text])
        
        # Calculate cosine similarities
        similarities = cosine_similarity(query_vector, self.case_vectors)[0]
        
        # Get top k results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = [(self.cases[i], float(similarities[i])) for i in top_indices if similarities[i] > 0]
        return results


class V3ActianVectorSearch:
    """V3: Vector Search using Actian VectorAI DB"""
    
    def __init__(self, actian_db):
        """
        Initialize with Actian VectorAI DB instance
        
        Args:
            actian_db: ActianVectorDB instance
        """
        self.actian_db = actian_db
    
    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[FAERSCase, float]]:
        """
        Search using Actian VectorAI DB
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            
        Returns:
            List of (case, similarity_score) tuples
        """
        return self.actian_db.search(query_embedding, top_k=top_k)


class V3VectorSearch:
    """V3: Vector Search using sentence transformer embeddings"""
    
    def __init__(self, query_processor: QueryProcessor):
        self.query_processor = query_processor
        self.case_embeddings = None
        self.cases = None
    
    def fit(self, cases: List[FAERSCase]):
        """Generate embeddings for all cases"""
        self.cases = cases
        case_texts = [case.to_text() for case in cases]
        self.case_embeddings = self.query_processor.model.encode(
            case_texts, 
            convert_to_numpy=True,
            show_progress_bar=False
        )
    
    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[FAERSCase, float]]:
        """Search using cosine similarity on embeddings"""
        if self.case_embeddings is None or self.cases is None:
            raise ValueError("Must call fit() before search()")
        
        # Calculate cosine similarities
        query_embedding_norm = query_embedding / np.linalg.norm(query_embedding)
        case_embeddings_norm = self.case_embeddings / np.linalg.norm(
            self.case_embeddings, axis=1, keepdims=True
        )
        
        similarities = np.dot(case_embeddings_norm, query_embedding_norm)

        # Get top k results
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = [(self.cases[i], float(similarities[i])) for i in top_indices if similarities[i] > 0]
        return results
