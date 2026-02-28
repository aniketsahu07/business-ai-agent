# ============================================================
#  RAG Engine – Groq (Free) LLM + ChromaDB + ONNX Embeddings
# ============================================================

import os
import asyncio

# Redirect all cache dirs to /tmp (writable on any host incl. Render)
for _k, _v in [
    ("HOME",               "/tmp"),
    ("XDG_CACHE_HOME",     "/tmp/cache"),
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
HISTORY_WINDOW     = 5     # number of past conversation pairs to retain

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
PRICING_KEYWORDS = ["price", "cost", "fee", "charge", "kitna", "rate", "package",
                    "pricing", "plan", "paisa", "rupee", "how much", "fees"]

# Informational question indicators — these mean user is ASKING, not REQUESTING
_QUESTION_SIGNALS = [
    # English
    "how to", "how do", "how can", "how does", "what is", "what are", "what's",
    "do you", "do i", "can i", "can you", "is there", "are there", "tell me",
    "explain", "describe", "information", "details", "about", "process",
    "works", "working",
    # Hindi
    "kaise", "kya hai", "kya hota", "kya h", "batao", "bata do", "samjhao",
    "ke baare", "ke baarein", "kaise hoti", "kaise hota", "kya process",
    "kya karna", "kya karu",
]

# Explicit booking ACTION phrases — user wants to book RIGHT NOW
_BOOKING_ACTIONS = [
    # English
    "book now", "book it", "book an appointment", "book a slot", "please book",
    "i want to book", "i'd like to book", "i would like to book",
    "schedule an appointment", "fix an appointment", "make an appointment",
    "set up an appointment",
    # Hindi
    "book karna hai", "book kar do", "book karo", "book kar lo",
    "appointment karo", "appointment kar do", "appointment chahiye",
    "appointment lena hai", "milna hai", "slot chahiye", "booking karni hai",
    "booking kar do", "haan book", "ha book", "appointment fix",
    "schedule kar", "abhi book", "abhi appointment",
]

def is_booking_action(message: str) -> bool:
    """Returns True ONLY when user is actively requesting to book (not just asking about it)."""
    msg = message.lower().strip()
    # Question mark → informational query, not an action
    if msg.endswith("?"):
        return False
    # If message contains question/informational signals → not a booking action
    if any(q in msg for q in _QUESTION_SIGNALS):
        return False
    # Check for explicit booking action phrases
    return any(k in msg for k in _BOOKING_ACTIONS)

def detect_intent(message: str) -> str:
    msg = message.lower()
    if is_booking_action(msg): return "booking"
    if any(k in msg for k in PRICING_KEYWORDS): return "pricing"
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
        print("🔧 Initializing RAG Engine with Groq + ChromaDB...")

        # ONNX embeddings — no PyTorch, no Rust
        self.embeddings = _ChromaEmbeddings()

        # ChromaDB — persisted to /tmp on Render
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

        print(f"✅ RAG Engine ready. LLM: {LLM_MODEL} via Groq | VectorDB: ChromaDB")

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

        # booking_triggered: only when user made an explicit booking request
        booking_triggered = is_booking_action(message)

        self._save_exchange(session_id, message, answer)
        sources = list({d.metadata.get("source", "business_data") for d in docs})

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
