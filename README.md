# AI-Powered Lead Magnet & Sales Agent (RAG)

> A 24/7 AI sales assistant that reads **your** business data (PDFs, websites, text)
> and converts visitors into booked appointments — in Hindi or English.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                    │
│  Chat UI  |  Booking Modal  |  Admin Panel           │
└───────────────────┬─────────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────────┐
│               FastAPI Backend                        │
│  /api/chat   /api/ingest/*   /api/book   /api/book.. │
└──────┬──────────────────┬───────────────────────────┘
       │                  │
  ┌────▼────┐       ┌─────▼──────┐
  │ ChromaDB │       │ HuggingFace│
  │ (local)  │       │ Inference  │
  │ Vectors  │       │ API (LLM)  │
  └──────────┘       └────────────┘
       ▲
  HuggingFace Embeddings
  (sentence-transformers, local)
```

---

## Quick Start

### 1. Clone / Open the project

```bash
cd "c:\rag model"
```

### 2. Set up your HuggingFace token

1. Create a free account at https://huggingface.co
2. Go to **Settings → Access Tokens** → create a **Read** token
3. Edit `.env` and paste your token:

```env
HUGGINGFACE_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Seed your business data (edit seed_data.py first!)
python seed_data.py

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd ..\frontend

# Install packages
npm install

# Start dev server
npm run dev
```

Open: http://localhost:3000

---

## Customising for Your Business

### Step 1 – Edit Business Data (`backend/seed_data.py`)

Replace the `BUSINESS_INFO` string with your real data:
- Business name & location
- Services & pricing
- FAQs
- Team members
- Special offers

Then re-run:
```bash
python seed_data.py
```

### Step 2 – Upload PDFs via Admin Panel

1. Open http://localhost:3000
2. Click **Admin** (top right)
3. Upload PDFs or paste text in the **Data Ingestion** tab

### Step 3 – Change the LLM (optional)

Edit `.env`:
```env
# Faster, lighter:
LLM_MODEL=google/flan-t5-xxl

# Better quality (recommended):
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2

# Good chat-tuned model:
LLM_MODEL=HuggingFaceH4/zephyr-7b-beta
```

### Step 4 – Brand the UI

In `.env`:
```env
NEXT_PUBLIC_BUSINESS_NAME=Your Gym Name
NEXT_PUBLIC_AGENT_NAME=Maya
NEXT_PUBLIC_PRIMARY_COLOR=#6366f1
```

---

## Features

| Feature | Status |
|---|---|
| Semantic search over business data | ✅ |
| Multi-turn conversation memory | ✅ |
| Hindi + English auto-detection | ✅ |
| Intent detection (booking / pricing / query) | ✅ |
| In-chat appointment booking | ✅ |
| PDF ingestion | ✅ |
| URL/blog scraping | ✅ |
| Admin panel (ingest + view leads) | ✅ |
| ChromaDB persistent vector store | ✅ |
| HuggingFace free tier LLM | ✅ |
| Source citation in responses | ✅ |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send a chat message |
| POST | `/api/ingest/pdf` | Upload & index a PDF |
| POST | `/api/ingest/url` | Scrape & index a URL |
| POST | `/api/ingest/text` | Index raw text |
| POST | `/api/book` | Save a lead/appointment |
| GET  | `/api/bookings` | List all leads (admin) |
| DELETE | `/api/vectorstore/reset` | Clear all indexed data |

Full interactive docs: http://localhost:8000/docs

---

## Extending the Project

### Google Calendar Integration
In `backend/appointment.py`, after saving to JSON, add:
```python
from googleapiclient.discovery import build
# ... create event using Google Calendar API
```

### WhatsApp Notifications
Add Twilio WhatsApp API call in `create_booking()`:
```python
from twilio.rest import Client
client = Client(TWILIO_SID, TWILIO_TOKEN)
client.messages.create(to="whatsapp:+91...", from_="whatsapp:+1...", body=f"New booking: {name}")
```

### Deploy to Production
- Backend: **Railway** or **Render** (free tier)
- Frontend: **Vercel** (free tier, one-click deploy)
- Set `NEXT_PUBLIC_API_URL` env var in Vercel to your Railway URL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+ |
| AI Workflow | LangChain |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace, local) |
| LLM | HuggingFace Inference API (Mistral-7B / Flan-T5) |
| Vector DB | ChromaDB (local persistent) |
| Data parsing | PyPDF, BeautifulSoup4 |
| Memory | ConversationBufferWindowMemory (per session) |
