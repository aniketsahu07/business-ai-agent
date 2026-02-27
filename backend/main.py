# ============================================================
#  AI-Powered Lead Magnet & Sales Agent – Backend (FastAPI)
# ============================================================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os

from rag_engine import RAGEngine
from document_loader import DocumentLoader
from appointment import AppointmentManager

# ─── App Init ───────────────────────────────────────────────
app = FastAPI(
    title="AI Sales Agent API",
    description="RAG-based lead magnet & sales agent powered by HuggingFace",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Singletons ─────────────────────────────────────────────
rag_engine      = RAGEngine()
doc_loader      = DocumentLoader()
appt_manager    = AppointmentManager()

# ─── Request / Response Models ───────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    language: Optional[str] = "auto"   # "en" | "hi" | "auto"

class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    intent: str                         # "query" | "booking" | "pricing"
    booking_triggered: bool

class BookingRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    service: str
    preferred_time: Optional[str] = None

class IngestionResponse(BaseModel):
    message: str
    chunks_created: int

# ─── Routes ─────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "✅ Sales Agent API is live", "version": "1.0.0"}


# ---------- Chat Endpoint ----------
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Main conversational endpoint.
    • Detects user intent (booking / pricing / general)
    • Returns AI answer with source references
    • Triggers booking flow if user signals intent to book
    """
    try:
        result = await rag_engine.chat(
            message=req.message,
            session_id=req.session_id,
            language=req.language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Document Ingestion ----------
@app.post("/api/ingest/pdf", response_model=IngestionResponse)
async def ingest_pdf(file: UploadFile = File(...)):
    """Upload a PDF (brochure, pricing sheet, FAQ) and index it."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported here.")
    try:
        content = await file.read()
        if len(content) < 10:
            raise HTTPException(400, "Uploaded file is empty or too small.")
        chunks = doc_loader.ingest_pdf_bytes(content, source_name=file.filename)
        if not chunks:
            return IngestionResponse(message="PDF processed but no text extracted (scanned image PDF?)", chunks_created=0)
        rag_engine.add_documents(chunks)
        return IngestionResponse(message="PDF indexed successfully", chunks_created=len(chunks))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing error: {str(e)}")


@app.post("/api/ingest/url", response_model=IngestionResponse)
async def ingest_url(url: str):
    """Scrape a blog/website URL and index its content."""
    chunks = doc_loader.ingest_url(url)
    rag_engine.add_documents(chunks)
    return IngestionResponse(message="URL indexed successfully", chunks_created=len(chunks))


@app.post("/api/ingest/text", response_model=IngestionResponse)
async def ingest_text(text: str, source: str = "manual"):
    """Directly paste business info (services, pricing, FAQs)."""
    chunks = doc_loader.ingest_raw_text(text, source_name=source)
    rag_engine.add_documents(chunks)
    return IngestionResponse(message="Text indexed successfully", chunks_created=len(chunks))


# ---------- Appointment Booking ----------
@app.post("/api/book")
async def book_appointment(req: BookingRequest):
    """Save lead/appointment details to local DB (extendable to Google Calendar)."""
    record = appt_manager.create_booking(
        name=req.name,
        phone=req.phone,
        email=req.email,
        service=req.service,
        preferred_time=req.preferred_time
    )
    return {"status": "booked", "booking_id": record["id"], "details": record}


@app.get("/api/bookings")
async def list_bookings():
    """Admin: list all bookings."""
    return appt_manager.get_all_bookings()


@app.patch("/api/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str):
    """Admin: update booking status (pending → confirmed / cancelled)."""
    record = appt_manager.update_status(booking_id, status)
    if not record:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"status": "updated", "booking": record}


@app.delete("/api/bookings/{booking_id}")
async def delete_booking(booking_id: str):
    """Admin: delete a booking by ID."""
    success = appt_manager.delete_booking(booking_id)
    if not success:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"status": "deleted", "booking_id": booking_id}


# ---------- Vector Store Management ----------
@app.delete("/api/vectorstore/reset")
async def reset_vectorstore():
    """⚠️ Wipe all indexed documents (use carefully)."""
    rag_engine.reset()
    return {"status": "Vector store cleared"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
