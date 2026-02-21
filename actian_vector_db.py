"""
Actian VectorAI DB Integration Module
Handles connection, collection management, and vector operations
"""
import os
from typing import List, Optional, Tuple
import numpy as np
from data_models import FAERSCase
from query_processor import QueryProcessor

try:
    from cortex import CortexClient, DistanceMetric
    ACTIAN_AVAILABLE = True
except ImportError:
    ACTIAN_AVAILABLE = False
    print("Warning: Actian VectorAI DB client not installed. Install from: https://github.com/hackmamba-io/actian-vectorAI-db-beta")


class ActianVectorDB:
    """Wrapper for Actian VectorAI DB operations"""
    
    COLLECTION_NAME = "faers_cases"
    DEFAULT_DIMENSION = 384  # all-MiniLM-L6-v2 produces 384-dimensional vectors
    
    def __init__(self, host: str = "localhost:50051", query_processor: Optional[QueryProcessor] = None):
        """
        Initialize Actian VectorAI DB client
        
        Args:
            host: Database host and port (default: localhost:50051)
            query_processor: QueryProcessor instance for generating embeddings
        """
        if not ACTIAN_AVAILABLE:
            raise ImportError(
                "Actian VectorAI DB client not available. "
                "Install the wheel file from: https://github.com/hackmamba-io/actian-vectorAI-db-beta"
            )
        
        self.host = host
        self.client = None
        self.query_processor = query_processor
        self._connected = False
    
    def connect(self):
        """Connect to the VectorAI DB server"""
        if not self._connected:
            try:
                # Create client (it's a context manager, but we'll use it directly)
                self.client = CortexClient(self.host)
                # For persistent connection, we don't use context manager
                # Instead, we'll manage the connection manually
                self._connected = True
                
                # Health check
                version, uptime = self.client.health_check()
                print(f"Connected to Actian VectorAI DB: {version}")
                return True
            except Exception as e:
                print(f"Failed to connect to Actian VectorAI DB at {self.host}: {e}")
                print("Make sure the Docker container is running: docker compose up")
                self._connected = False
                raise
    
    def disconnect(self):
        """Disconnect from the VectorAI DB server"""
        if self._connected and self.client:
            try:
                # Clean up if needed
                self._connected = False
                self.client = None
            except Exception:
                pass
    
    def ensure_collection(self, dimension: int = None):
        """
        Ensure the FAERS cases collection exists, create if it doesn't
        
        Args:
            dimension: Vector dimension (default: 384 for all-MiniLM-L6-v2)
        """
        if not self._connected:
            self.connect()
        
        dimension = dimension or self.DEFAULT_DIMENSION
        
        if not self.client.has_collection(self.COLLECTION_NAME):
            print(f"Creating collection '{self.COLLECTION_NAME}' with dimension {dimension}...")
            self.client.create_collection(
                name=self.COLLECTION_NAME,
                dimension=dimension,
                distance_metric=DistanceMetric.COSINE,
                hnsw_m=32,
                hnsw_ef_construct=256,
                hnsw_ef_search=100
            )
            print(f"Collection '{self.COLLECTION_NAME}' created successfully")
        else:
            print(f"Collection '{self.COLLECTION_NAME}' already exists")
    
    def load_cases(self, cases: List[FAERSCase], query_processor: Optional[QueryProcessor] = None):
        """
        Load FAERS cases into the vector database
        
        Args:
            cases: List of FAERSCase objects to load
            query_processor: QueryProcessor for generating embeddings (uses self.query_processor if not provided)
        """
        if not self._connected:
            self.connect()
        
        processor = query_processor or self.query_processor
        if not processor:
            raise ValueError("QueryProcessor required for generating embeddings")
        
        # Check if collection exists and has data
        if self.client.has_collection(self.COLLECTION_NAME):
            count = self.client.count(self.COLLECTION_NAME)
            if count > 0:
                print(f"Collection already contains {count} vectors. Skipping load.")
                return
        
        print(f"Loading {len(cases)} cases into VectorAI DB...")
        
        # Generate embeddings for all cases
        case_texts = [case.to_text() for case in cases]
        embeddings = processor.model.encode(
            case_texts,
            convert_to_numpy=True,
            show_progress_bar=True
        )
        
        # Prepare data for batch upsert
        ids = list(range(len(cases)))
        vectors = [emb.tolist() for emb in embeddings]
        payloads = [
            {
                "case_id": case.case_id,
                "drugs": case.drugs,
                "age": case.age,
                "sex": case.sex,
                "conditions": case.conditions,
                "outcome_severity": case.outcome_severity,
                "description": case.description,
                "faers_matches": case.faers_matches
            }
            for case in cases
        ]
        
        # Batch upsert
        self.client.batch_upsert(
            self.COLLECTION_NAME,
            ids=ids,
            vectors=vectors,
            payloads=payloads
        )
        
        # Flush to ensure persistence
        self.client.flush(self.COLLECTION_NAME)
        
        print(f"Successfully loaded {len(cases)} cases into VectorAI DB")
    
    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Tuple[FAERSCase, float]]:
        """
        Search for similar cases using vector similarity
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            
        Returns:
            List of (FAERSCase, similarity_score) tuples
        """
        if not self._connected:
            self.connect()
        
        if not self.client.has_collection(self.COLLECTION_NAME):
            raise ValueError(f"Collection '{self.COLLECTION_NAME}' does not exist. Load cases first.")
        
        # Convert embedding to list
        query_vector = query_embedding.tolist()
        
        # Perform search
        results = self.client.search(
            self.COLLECTION_NAME,
            query=query_vector,
            top_k=top_k
        )
        
        # Convert results back to FAERSCase objects
        case_results = []
        for result in results:
            payload = result.payload
            case = FAERSCase(
                case_id=payload.get("case_id", "unknown"),
                drugs=payload.get("drugs", []),
                age=payload.get("age"),
                sex=payload.get("sex"),
                conditions=payload.get("conditions", []),
                outcome_severity=payload.get("outcome_severity", "unknown"),
                description=payload.get("description", ""),
                faers_matches=payload.get("faers_matches", 0)
            )
            # Score is similarity (higher = more similar)
            # For cosine similarity, scores are typically 0-1, but can be negative
            similarity_score = max(0.0, float(result.score))
            case_results.append((case, similarity_score))
        
        return case_results
    
    def get_collection_stats(self) -> dict:
        """Get statistics about the collection"""
        if not self._connected:
            self.connect()
        
        if not self.client.has_collection(self.COLLECTION_NAME):
            return {"exists": False}
        
        stats = self.client.get_stats(self.COLLECTION_NAME)
        count = self.client.count(self.COLLECTION_NAME)
        
        return {
            "exists": True,
            "count": count,
            "stats": stats
        }
    
    def clear_collection(self):
        """Delete and recreate the collection (useful for testing)"""
        if not self._connected:
            self.connect()
        
        if self.client.has_collection(self.COLLECTION_NAME):
            self.client.delete_collection(self.COLLECTION_NAME)
            print(f"Deleted collection '{self.COLLECTION_NAME}'")
        
        self.ensure_collection()
