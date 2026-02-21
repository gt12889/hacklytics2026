# Quick Install Guide for Actian VectorAI DB

## Step 1: Download the Wheel File

1. Go to: https://github.com/hackmamba-io/actian-vectorAI-db-beta
2. Download: `actiancortex-0.1.0b1-py3-none-any.whl`
3. Save it in your project directory

## Step 2: Install the Client

```bash
pip install actiancortex-0.1.0b1-py3-none-any.whl
```

## Step 3: Start Docker Container

```bash
docker compose up -d
```

## Step 4: Verify

Run the app and check the sidebar - you should see "✅ Actian VectorAI DB Connected"

That's it! The app will automatically load cases into the database on first run.

For detailed setup and troubleshooting, see [ACTIAN_SETUP.md](ACTIAN_SETUP.md)
