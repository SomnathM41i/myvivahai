# myvivahai — Setup Guide

## Prerequisites
- Python 3.11+
- Node 20+
- Tesseract OCR (`sudo apt install tesseract-ocr` / `brew install tesseract`)
- Redis (for background tasks — optional in dev)

## Backend

```bash
cd backend
cp .env.example .env
# Fill in: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GROQ_API_KEY
# GROQ_API_KEY: copy directly from your old BioData-AI project!

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Google OAuth Setup
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID → Web application
3. Add Authorized redirect URI: `http://localhost:8000/api/auth/google/callback`
4. Copy Client ID & Secret to `backend/.env`

## Docker (full stack)

```bash
cp backend/.env.example backend/.env  # fill values
docker-compose up -d
```

## Key differences from old BioData-AI project
| Old (BioData-AI)   | New (myvivahai)          |
|--------------------|--------------------------|
| Flask              | FastAPI                  |
| Jinja2 templates   | React + Vite + Tailwind  |
| SQLite only        | SQLite (dev) / PostgreSQL (prod) |
| Sync routes        | Async routes             |
| Single file (app.py)| Layered architecture     |
| In-memory jobs     | Celery + Redis           |

Same: Groq LLaMA, Google OAuth, PyMuPDF, Tesseract, S3-ready storage.
