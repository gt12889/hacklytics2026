# Actian VectorAI DB Integration - Changelog

## What Was Added

### New Files

1. **`actian_vector_db.py`** - Complete Actian VectorAI DB integration module
   - `ActianVectorDB` class for database operations
   - Connection management
   - Collection creation and management
   - Case loading and vector storage
   - Vector search functionality

2. **`docker-compose.yml`** - Docker configuration for Actian VectorAI DB
   - Pre-configured service definition
   - Port mapping (50051)
   - Persistent data storage

3. **`DEPLOYMENT.md`** - Comprehensive setup guide
   - Installation instructions
   - Configuration options
   - Troubleshooting guide
   - Usage examples

4. **`INSTALL_ACTIAN.md`** - Quick start guide

### Modified Files

1. **`search_engines.py`**
   - Added `V3ActianVectorSearch` class
   - Integrates with Actian VectorAI DB

2. **`app.py`**
   - Added Actian DB initialization
   - Added "V3Actian" search option
   - Added connection status display in sidebar
   - Automatic collection creation and data loading

3. **`requirements.txt`**
   - Added `grpcio>=1.68.1`
   - Added `protobuf>=5.29.2`
   - Added `pydantic>=2.10.4`

4. **`README.md`**
   - Updated with Actian DB information
   - Added setup instructions reference

## Features

### Production-Scale Vector Search
- Persistent storage of FAERS cases as vectors
- High-performance HNSW-based approximate nearest neighbor search
- Scalable to millions of vectors

### Automatic Integration
- App automatically detects if Actian DB is available
- Gracefully falls back to in-memory search if DB unavailable
- Automatic collection creation and data loading on first use

### User-Friendly
- Connection status displayed in sidebar
- Clear error messages if connection fails
- Instructions provided in UI if setup needed

## Usage

### Basic Setup
1. Install wheel file: `pip install actiancortex-0.1.0b1-py3-none-any.whl`
2. Start Docker: `docker compose up -d`
3. Run app: `streamlit run app.py`
4. Select "V3Actian: Vector Search (Actian DB)" from dropdown

### Programmatic Usage
```python
from actian_vector_db import ActianVectorDB
from query_processor import QueryProcessor

# Initialize
query_processor = QueryProcessor()
actian_db = ActianVectorDB(host="localhost:50051", query_processor=query_processor)

# Connect and setup
actian_db.connect()
actian_db.ensure_collection()
actian_db.load_cases(cases)

# Search
results = actian_db.search(query_embedding, top_k=10)
```

## Benefits Over In-Memory Search

1. **Persistence**: Data survives app restarts
2. **Scalability**: Can handle much larger datasets
3. **Performance**: Optimized for production workloads
4. **Concurrent Access**: Multiple clients can query simultaneously
5. **Data Safety**: Transactional guarantees

## Backward Compatibility

- All existing search engines (V1, V2, V3) continue to work
- Actian DB is optional - app works without it
- No breaking changes to existing functionality
