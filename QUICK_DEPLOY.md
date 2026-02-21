# Quick Deploy - Actian VectorAI DB on Vultr

## ✅ What's Already Done

✅ `docker-compose.yml` - Already configured for team access  
✅ Port binding: `0.0.0.0:50051:50051` (allows external connections)  
✅ Persistent storage: `./data:/data`  
✅ Integration code: `actian_vector_db.py`  

## 🚀 Quick Start on Vultr (66.42.91.56)

### 1. Connect to Server
```bash
ssh root@66.42.91.56
```

### 2. Install Docker
```bash
apt update && apt upgrade -y
apt install docker.io docker-compose -y
systemctl start docker
systemctl enable docker
```

### 3. Get Actian Image

**Check the Actian GitHub repo** (https://github.com/hackmamba-io/actian-vectorAI-db-beta) for:
- Docker image file to download
- OR Dockerfile to build
- OR docker-compose.yml to use

**Then either:**
```bash
# Option A: Load image file
docker load < actian-image.tar

# Option B: Build from source
git clone https://github.com/hackmamba-io/actian-vectorAI-db-beta.git
cd actian-vectorAI-db-beta
docker build -t localhost/actian/vectoraidb:1.0b .
```

### 4. Deploy Your Project
```bash
# Clone/upload your project
cd /root
git clone <your-repo>
cd hacklytics2026

# Start database
docker compose up -d

# Verify
docker ps
docker logs vectoraidb
```

### 5. Configure Firewall
```bash
ufw allow 22/tcp
ufw allow 50051/tcp
ufw enable
```

### 6. Share with Team

Team members update their `.env`:
```bash
ACTIAN_DB_HOST=66.42.91.56:50051
```

## 📝 Notes

- The `docker-compose.yml` is ready - just need the Actian image
- Port 50051 is bound to `0.0.0.0` for team access
- Data persists in `./data` directory
- See `DEPLOYMENT.md` for detailed instructions

## 🔍 Check Actian Repo For:

1. How to get the Docker image
2. Any additional setup steps
3. Image registry or download location
4. Build instructions if needed
