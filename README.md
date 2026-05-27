# 💍 myvivahai

**AI-powered matrimonial biodata extraction & matching platform.**

Upload PDFs, DOCX, or photos of Indian matrimonial biodata — OCR + Vision AI extracts structured profiles automatically. Supports English, Hindi, and Marathi.

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=fff" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=fff" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=000" alt="React">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=fff" alt="Vite">
  <img src="https://img.shields.io/badge/Groq-LLaMA-F55036?logo=groq&logoColor=fff" alt="Groq">
  <img src="https://img.shields.io/badge/Gemini-2.5-4285F4?logo=google&logoColor=fff" alt="Gemini">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## ✨ Features

- **3 Extraction Modes** — OCR + LLM, Groq Vision, or Gemini Vision — switch per upload
- **📄 Multi-format** — PDF, DOCX, JPG, PNG, TXT
- **🌐 Multilingual** — English, Hindi, Marathi (Devanagari OCR)
- **🧠 Automatic parsing** — Name, DOB, education, occupation, family, horoscope, partner preferences → structured JSON
- **🔄 Background processing** — Upload & go, SSE progress streaming
- **🔐 Google OAuth + JWT** — Secure authentication
- **🐳 Docker-ready** — Full stack with one command

## 🚀 Quick Start

```bash
# 1. Backend
cd backend
cp .env.example .env          # Fill in: GROQ_API_KEY, GEMINI_API_KEY, Google OAuth
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

**App:** http://localhost:5173 &nbsp;·&nbsp; **API Docs:** http://localhost:8000/docs

## 🔧 Configuration

Set models in `backend/.env` — no code changes needed:

| Variable | Default | Purpose |
|----------|---------|---------|
| `GROQ_API_KEY` | — | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | OCR mode text parser |
| `GROQ_VISION_MODEL` | `llama-4-scout-17b-16e-instruct` | Vision mode (Groq) |
| `GEMINI_API_KEY` | — | Google AI Studio key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Vision mode (Gemini) |

## 🏗️ Architecture

```
Upload → extraction_mode? ─┬─ "ocr"    → OCR (Tesseract+EasyOCR) → Groq LLM → JSON
                           ├─ "vision"  → Image → Groq Llama 4 Scout (vision) → JSON
                           └─ "gemini"  → Image → Gemini 2.5 Flash/Pro (vision) → JSON
                                                      ↓
                                      Confidence scoring → Schema mapping → DB save
```

## 🐳 Docker

```bash
cp backend/.env.example backend/.env   # fill values
docker compose up -d
```

## 📖 Setup Guide

See [docs/setup-guide.md](docs/setup-guide.md) for detailed instructions (Tesseract, OAuth, Redis, production).

## 🧩 Stack

| Layer | Tech |
|-------|------|
| **Backend** | FastAPI (async) + SQLAlchemy 2.0 |
| **Frontend** | React 18 + Vite + Tailwind CSS + Framer Motion |
| **AI** | Groq (LLaMA 3.3 / Llama 4 Scout), Google Gemini 2.5 |
| **OCR** | Tesseract (hin+mar+eng) + EasyOCR fallback |
| **Auth** | Google OAuth 2.0 + JWT |
| **Background** | Celery + Redis (optional) |
| **Storage** | Local / S3-compatible |

## 📜 License

MIT
