# Deployment Guide - Actian VectorAI DB on Vultr

Based on the [Actian VectorAI DB Beta repository](https://github.com/hackmamba-io/actian-vectorAI-db-beta) instructions.

## 📋 Prerequisites

1. Vultr server running (IP: 66.42.91.56)
2. Docker and Docker Compose installed
3. Actian VectorAI DB image

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your Vultr Server

```bash
ssh root@66.42.91.56
```

### Step 2: Install Docker and Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
apt install docker.io docker-compose -y

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker compose version
```

### Step 3: Get the Actian VectorAI DB Image

According to the Actian repo, you need to load the Docker image. Options:

**Option A: If you have the image file:**
```bash
# Upload the image file to your server first, then:
docker load < actian-vectoraidb-image.tar
```

**Option B: If the image is in a registry:**
```bash
docker pull actian/vectoraidb:1.0b
# Then update docker-compose.yml to use: image: actian/vectoraidb:1.0b
```

**Option C: Build from source (if Dockerfile provided):**
```bash
# Clone the Actian repo
git clone https://github.com/hackmamba-io/actian-vectorAI-db-beta.git
cd actian-vectorAI-db-beta

# Build the image (if Dockerfile exists)
docker build -t localhost/actian/vectoraidb:1.0b .
```

### Step 4: Set Up Your Project

```bash
# Clone or upload your project
git clone <your-repo-url>
cd hacklytics2026

# Or if you already have files, navigate to the directory
cd /path/to/hacklytics2026
```

### Step 5: Verify docker-compose.yml

The `docker-compose.yml` is already configured with:
- Image: `localhost/actian/vectoraidb:1.0b`
- Port: `0.0.0.0:50051:50051` (allows external access)
- Volume: `./data:/data` (persistent storage)

### Step 6: Start the Database

```bash
# Start the container
docker compose up -d

# Check it's running
docker ps

# View logs
docker logs vectoraidb

# Follow logs in real-time
docker logs -f vectoraidb
```

### Step 7: Configure Firewall

```bash
# Install UFW if not already installed
apt install ufw -y

# Allow SSH (IMPORTANT - do this first!)
ufw allow 22/tcp

# Allow Actian DB port for team access
ufw allow 50051/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

### Step 8: Verify Database is Accessible

From your local machine or teammate's machine:

```bash
# Test connection (should connect or timeout, not refuse)
telnet 66.42.91.56 50051

# Or using netcat
nc -zv 66.42.91.56 50051
```

## 🔧 Configuration for Team Access

### Update Team Members' .env Files

Each teammate should have:

```bash
ACTIAN_DB_HOST=66.42.91.56:50051
```

### Test from a Teammate's Machine

```python
# In Python
from actian_vector_db import ActianVectorDB
from query_processor import QueryProcessor

query_processor = QueryProcessor()
actian_db = ActianVectorDB(host="66.42.91.56:50051", query_processor=query_processor)

try:
    actian_db.connect()
    print("✅ Connected successfully!")
    stats = actian_db.get_collection_stats()
    print(f"Cases in DB: {stats.get('count', 0)}")
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

## 📊 Monitoring

### Check Container Status

```bash
# List running containers
docker ps

# Check resource usage
docker stats vectoraidb

# View logs
docker logs vectoraidb

# Check data directory
ls -lh ./data
```

### Database Logs

The database logs are available at:
- Container logs: `docker logs vectoraidb`
- Log file: `./data/vde.log` (if mounted)

## 🔄 Maintenance

### Restart the Database

```bash
docker compose restart
```

### Stop the Database

```bash
docker compose stop
```

### Start the Database

```bash
docker compose start
```

### Update the Database

```bash
# Pull new image (if available)
docker pull actian/vectoraidb:1.0b

# Recreate container with new image
docker compose up -d --force-recreate
```

### Backup Data

```bash
# Backup the data directory
tar -czf vectoraidb-backup-$(date +%Y%m%d).tar.gz ./data

# Copy to local machine
scp root@66.42.91.56:/path/to/vectoraidb-backup-*.tar.gz ./
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs vectoraidb

# Check if port is already in use
netstat -tulpn | grep 50051

# Check Docker daemon
systemctl status docker
```

### Can't Connect from Team Members

1. **Check firewall:**
   ```bash
   ufw status
   ufw allow 50051/tcp
   ```

2. **Check Vultr firewall:**
   - Go to Vultr dashboard → Server → Firewall
   - Ensure port 50051 is allowed

3. **Check container is running:**
   ```bash
   docker ps | grep vectoraidb
   ```

4. **Test locally on server:**
   ```bash
   # From the server itself
   telnet localhost 50051
   ```

### Image Not Found

If you get "image not found" error:

1. **Check if image exists:**
   ```bash
   docker images | grep vectoraidb
   ```

2. **Load the image:**
   ```bash
   docker load < image-file.tar
   ```

3. **Or update docker-compose.yml** to use a different image source

## 📝 Quick Reference

```bash
# Connect to server
ssh root@66.42.91.56

# Navigate to project
cd hacklytics2026

# Start database
docker compose up -d

# Check status
docker ps

# View logs
docker logs vectoraidb

# Restart
docker compose restart

# Stop
docker compose stop
```

## 🔐 Security Notes

1. **Firewall**: Only allow necessary ports (22, 50051)
2. **SSH Keys**: Consider disabling password authentication
3. **Network**: Consider using VPN for team access instead of public IP
4. **Monitoring**: Set up alerts for container failures

## ✅ Deployment Checklist

- [ ] Docker and Docker Compose installed
- [ ] Actian VectorAI DB image loaded/available
- [ ] docker-compose.yml configured
- [ ] Container running (`docker ps`)
- [ ] Port 50051 accessible from team
- [ ] Firewall configured
- [ ] Team members have correct IP in .env files
- [ ] Test connection from teammate's machine

## 🆘 Getting Help

- Check Actian repo: https://github.com/hackmamba-io/actian-vectorAI-db-beta
- View container logs: `docker logs vectoraidb`
- Check server logs: `./data/vde.log`
