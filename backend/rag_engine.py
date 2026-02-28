# ============================================================
#  RAG Engine – Groq (Free) LLM + ChromaDB + ONNX Embeddings
# ============================================================

import os
import asyncio

# Redirect all cache dirs to /tmp (writable on any host incl. Render)
for _k, _v in [
    ("HOME",               "/tmp"),
    ("XDG_CACHE_HOME",     "/tmp/cache"),
    ("CHROMA_CACHE_DIR",   "/tmp/chroma_cache"),
    ("HF_HOME",            "/tmp/hf_home"),
    ("TRANSFORMERS_CACHE", "/tmp/hf_cache"),
]:
    os.environ.setdefault(_k, _v)

from dotenv import load_dotenv

from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document

load_dotenv()

# ─── Config ─────────────────────────────────────────────────
GROQ_API_KEY       = os.getenv("GROQ_API_KEY", "")
LLM_MODEL          = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/tmp/chroma_db")
COLLECTION_NAME    = "business_knowledge"
HISTORY_WINDOW     = 6

# ─── Sales System Prompt ─────────────────────────────────────
SALES_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an expert AI sales assistant and lead magnet for this business.
Your goals:
1. Answer questions using ONLY the business context provided below.
2. Highlight benefits and value like a professional salesperson.
3. Gently guide the user toward booking an appointment or making a purchase.
4. For pricing questions, present confidently and offer a free consultation.
5. If user shows interest, ask for their name and phone to book an appointment.
6. Respond in the SAME language the user uses (Hindi or English).
7. Never make up info not in the context. Say "Please contact our team" if unsure.
8. Keep answers concise, warm and helpful.

Business Context:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

# ─── Intent Detection ─────────────────────────────────────────
BOOKING_KEYWORDS = ["book", "appointment", "schedule", "visit", "consult", "meeting",
                    "book karna", "appointment chahiye", "milna hai", "book karo"]
PRICING_KEYWORDS = ["price", "cost", "fee", "charge", "kitna", "rate", "package",
                    "pricing", "plan", "paisa", "rupee", "how much", "fees"]

def detect_intent(message: str) -> str:
    msg = message.lower()
    if any(k in msg for k in BOOKING_KEYWORDS): return "booking"
    if any(k in msg for k in PRICING_KEYWORDS):  return "pricing"
    return "query"

def format_docs(docs: list) -> str:
    if not docs:
        return "No specific business information found for this query."
    return "\n\n".join(d.page_content for d in docs)


# ─── Lightweight Embeddings (ChromaDB ONNX, no PyTorch/Rust) ─
class _ChromaEmbeddings(Embeddings):
    """Wraps ChromaDB's built-in all-MiniLM-L6-v2 ONNX model."""
    def __init__(self):
        self._ef = DefaultEmbeddingFunction()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # Convert np.float32 → plain Python float (ChromaDB strict requirement)
        return [[float(x) for x in v] for v in self._ef(texts)]

    def embed_query(self, text: str) -> list[float]:
        return [float(x) for x in self._ef([text])[0]]


# ─── RAG Engine ───────────────────────────────────────────────
class RAGEngine:
    def __init__(self):
        print("🔧 Initializing RAG Engine with Groq (Free)...")

        # ChromaDB built-in ONNX embedding — no PyTorch, no Rust, ~80MB RAM
        self.embeddings = _ChromaEmbeddings()

        # ChromaDB — persistent local vector store
        self.vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=self.embeddings,
            persist_directory=CHROMA_PERSIST_DIR,
        )

        # Groq LLM — FREE, very fast
        self.llm = ChatGroq(
            api_key=GROQ_API_KEY,
            model=LLM_MODEL,
            temperature=0.5,
            max_tokens=512,
        )

        # Per-session chat history
        self._histories: dict[str, list] = {}

        print(f"✅ RAG Engine ready. LLM: {LLM_MODEL} via Groq (FREE)")

    def _get_history(self, session_id: str) -> list:
        history = self._histories.get(session_id, [])
        # Keep last N pairs
        pairs = history[-HISTORY_WINDOW:]
        messages = []
        for human, ai in pairs:
            messages.append(HumanMessage(content=human))
            messages.append(AIMessage(content=ai))
        return messages

    def _save_exchange(self, session_id: str, human: str, ai: str):
        self._histories.setdefault(session_id, []).append((human, ai))

    async def chat(self, message: str, session_id: str = "default",
                   language: str = "auto") -> dict:
        intent  = detect_intent(message)
        history = self._get_history(session_id)

        retriever = self.vectorstore.as_retriever(
            search_type="similarity", search_kwargs={"k": 4}
        )

        loop    = asyncio.get_event_loop()
        docs    = await loop.run_in_executor(None, lambda: retriever.invoke(message))
        context = format_docs(docs)

        question = message
        if language == "hi": question += " (Jawab Hindi mein dena)"
        elif language == "en": question += " (Please respond in English)"

        chain = SALES_PROMPT | self.llm | StrOutputParser()

        answer = await loop.run_in_executor(
            None,
            lambda: chain.invoke({
                "context":      context,
                "chat_history": history,
                "question":     question,
            })
        )
        answer = answer.strip()

        self._save_exchange(session_id, message, answer)
        sources = list({d.metadata.get("source", "business_data") for d in docs})

        booking_triggered = intent == "booking"

        return {
            "answer":            answer,
            "sources":           sources,
            "intent":            intent,
            "booking_triggered": booking_triggered,
        }

    def add_documents(self, documents: list[Document]):
        if documents:
            self.vectorstore.add_documents(documents)
            print(f"✅ Added {len(documents)} chunks to vector store.")

    def reset(self):
        self.vectorstore.delete_collection()
        self.vectorstore = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=self.embeddings,
            persist_directory=CHROMA_PERSIST_DIR,
        )
        self._histories.clear()
        print("🗑️  Vector store reset.")
