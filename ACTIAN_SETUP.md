# Actian VectorAI DB Setup Guide

This guide will help you set up and use Actian VectorAI DB for production-scale vector search in the Drug Interaction Risk Assessment System.

## 📋 Prerequisites

- Docker and Docker Compose installed
- Python 3.8+
- Access to the Actian VectorAI DB beta repository

## 🚀 Quick Setup

### Step 1: Download the Actian Client

1. Visit the [Actian VectorAI DB Beta repository](https://github.com/hackmamba-io/actian-vectorAI-db-beta)
2. Download the wheel file: `actiancortex-0.1.0b1-py3-none-any.whl`
3. Install it in your Python environment:

```bash
pip install actiancortex-0.1.0b1-py3-none-any.whl
```

**Note**: The dependencies (grpcio, protobuf, pydantic) are already in `requirements.txt`, but you need to install the wheel file separately as it's not on PyPI.

### Step 2: Get the Actian VectorAI DB Docker Image

The Actian repo provides a Docker image. You need to load it first:

**Option A: Load from image file (if provided in repo):**
```bash
# Download the image file from the GitHub repo
# Then load it:
docker load < actian-vectoraidb-image.tar
```

**Option B: Build from source (if Dockerfile in repo):**
```bash
git clone https://github.com/hackmamba-io/actian-vectorAI-db-beta.git
cd actian-vectorAI-db-beta
docker build -t localhost/actian/vectoraidb:1.0b .
```

**Option C: Use their docker-compose.yml:**
The Actian repo includes a `docker-compose.yml`. You can:
1. Copy their docker-compose.yml, OR
2. Use ours (already configured) after loading the image

### Step 3: Start the VectorAI DB Container

The project includes a `docker-compose.yml` file configured for team access. Start the database:

```bash
docker compose up -d
```

This will:
- Use the loaded Actian VectorAI DB image
- Start the container on port 50051 (bound to all interfaces for team access)
- Create a `./data` directory for persistent storage

### Step 4: Verify Connection

Check if the container is running:

```bash
docker ps
```

You should see a container named `vectoraidb` running.

View logs:

```bash
docker logs vectoraidb
```

### Step 5: Run the Application

Start the Streamlit app:

```bash
streamlit run app.py
```

The app will automatically:
1. Connect to Actian VectorAI DB
2. Create the `faers_cases` collection
3. Load sample cases into the database
4. Make "V3Actian: Vector Search (Actian DB)" available in the search options

## 🔧 Configuration

### Database Host

By default, the app connects to `localhost:50051`. To change this, modify the initialization in `app.py`:

```python
st.session_state.actian_db = ActianVectorDB(
    host="your-host:50051",  # Change here
    query_processor=st.session_state.query_processor
)
```

### Collection Settings

The collection is created with these default settings (in `actian_vector_db.py`):

- **Dimension**: 384 (for all-MiniLM-L6-v2 embeddings)
- **Distance Metric**: COSINE
- **HNSW Parameters**:
  - `hnsw_m`: 32 (edges per node)
  - `hnsw_ef_construct`: 256 (build-time neighbors)
  - `hnsw_ef_search`: 100 (search-time neighbors)

To modify these, edit the `ensure_collection()` method in `actian_vector_db.py`.

## 📊 Using Actian DB

### In the Streamlit App

1. Start the app and ensure Actian DB is connected (check sidebar)
2. Select **"V3Actian: Vector Search (Actian DB)"** from the search engine dropdown
3. Enter your query and click "Analyze Risk"

### Programmatic Usage

```python
from actian_vector_db import ActianVectorDB
from query_processor import QueryProcessor
from sample_data import get_sample_cases

# Initialize
query_processor = QueryProcessor()
actian_db = ActianVectorDB(host="localhost:50051", query_processor=query_processor)

# Connect
actian_db.connect()

# Ensure collection exists
actian_db.ensure_collection()

# Load cases
cases = get_sample_cases()
actian_db.load_cases(cases)

# Search
query_embedding = query_processor.generate_embedding("your query here")
results = actian_db.search(query_embedding, top_k=10)

# Disconnect
actian_db.disconnect()
```

## 🐛 Troubleshooting

### "Connection refused" or "Failed to connect"

**Problem**: The Docker container isn't running or isn't accessible.

**Solution**:
1. Check if container is running: `docker ps`
2. If not, start it: `docker compose up -d`
3. Check logs: `docker logs vectoraidb`
4. Verify port 50051 is not in use by another service

### "Collection does not exist"

**Problem**: The collection wasn't created or was deleted.

**Solution**: The app will automatically create the collection on first use. If it doesn't, manually call:

```python
actian_db.ensure_collection()
```

### "Module not found: cortex"

**Problem**: The Actian client wheel file isn't installed.

**Solution**:
1. Download the wheel file from the GitHub repository
2. Install: `pip install actiancortex-0.1.0b1-py3-none-any.whl`

### macOS Issues

If you're on macOS (especially Apple Silicon), you may need to uncomment the platform line in `docker-compose.yml`:

```yaml
platform: linux/amd64
```

## 📈 Performance

Actian VectorAI DB provides:

- **Persistent Storage**: Data survives container restarts
- **Production-Grade**: Transactional safety and high-performance I/O
- **Scalability**: Can handle millions of vectors efficiently
- **Fast Search**: Optimized HNSW algorithm for approximate nearest neighbor search

## 🔄 Data Management

### View Collection Stats

```python
stats = actian_db.get_collection_stats()
print(f"Cases in database: {stats['count']}")
```

### Clear and Reload Data

```python
actian_db.clear_collection()  # Deletes and recreates
actian_db.load_cases(cases)    # Reload cases
```

### Backup Data

The database data is stored in `./data` directory. To backup:

```bash
tar -czf vectoraidb-backup.tar.gz ./data
```

To restore:

```bash
tar -xzf vectoraidb-backup.tar.gz
```

## 📚 Additional Resources

- [Actian VectorAI DB Repository](https://github.com/hackmamba-io/actian-vectorAI-db-beta)
- [API Documentation](https://github.com/hackmamba-io/actian-vectorAI-db-beta/blob/main/docs/api.md)
- [RAG Example](https://github.com/hackmamba-io/actian-vectorAI-db-beta/tree/main/examples/rag)

## ⚠️ Known Issues

From the Actian VectorAI DB documentation:

- **CRTX-202**: Closing or deleting collections while read/write operations are in progress is not supported
- **CRTX-232**: scroll API uses the term cursor to indicate the offset
- **CRTX-233**: get_many API does not return the vector IDs

## 🆘 Getting Help

If you encounter issues:

1. Check the Docker logs: `docker logs vectoraidb`
2. Check the application logs in the Streamlit interface
3. Review the error messages in the sidebar (if Actian DB fails to connect)
4. Consult the [Actian VectorAI DB documentation](https://github.com/hackmamba-io/actian-vectorAI-db-beta)
