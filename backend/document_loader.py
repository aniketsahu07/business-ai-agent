# ============================================================
#  Document Loader – PDF, URL (web scraping), Raw Text
# ============================================================

import io
import re
import requests
from typing import List
from bs4 import BeautifulSoup

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

# ─── Splitter Config ─────────────────────────────────────────
CHUNK_SIZE    = 600
CHUNK_OVERLAP = 80

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", "।", ".", " ", ""]  # supports Hindi "।"
)


def _split(text: str, metadata: dict) -> List[Document]:
    chunks = splitter.split_text(text)
    return [Document(page_content=c, metadata=metadata) for c in chunks if c.strip()]


class DocumentLoader:

    # ── PDF ──────────────────────────────────────────────────
    def ingest_pdf_bytes(self, pdf_bytes: bytes, source_name: str = "pdf") -> List[Document]:
        """Parse a PDF from raw bytes (uploaded via API)."""
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = ""
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            full_text += f"\n[Page {page_num + 1}]\n{text}"

        return _split(full_text, {"source": source_name, "type": "pdf"})

    def ingest_pdf_path(self, path: str) -> List[Document]:
        """Parse a PDF from a local file path."""
        with open(path, "rb") as f:
            return self.ingest_pdf_bytes(f.read(), source_name=path)

    # ── URL / Blog ───────────────────────────────────────────
    def ingest_url(self, url: str) -> List[Document]:
        """
        Scrape a webpage and extract meaningful text.
        Works for blogs, pricing pages, about-us pages, etc.
        """
        headers = {"User-Agent": "Mozilla/5.0 (compatible; SalesAgentBot/1.0)"}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove noise
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            tag.decompose()

        text = soup.get_text(separator="\n")
        # Collapse excessive whitespace
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r" {2,}", " ", text)

        return _split(text.strip(), {"source": url, "type": "webpage"})

    # ── Raw Text ─────────────────────────────────────────────
    def ingest_raw_text(self, text: str, source_name: str = "manual") -> List[Document]:
        """Index any raw text – FAQs, pricing tables, service descriptions."""
        return _split(text, {"source": source_name, "type": "text"})

    # ── Bulk Ingest (dir of PDFs) ────────────────────────────
    def ingest_directory(self, dir_path: str) -> List[Document]:
        """Recursively load all PDFs from a local directory."""
        import os
        all_docs = []
        for root, _, files in os.walk(dir_path):
            for fname in files:
                if fname.lower().endswith(".pdf"):
                    full_path = os.path.join(root, fname)
                    docs = self.ingest_pdf_path(full_path)
                    all_docs.extend(docs)
                    print(f"  📄 Loaded: {fname} ({len(docs)} chunks)")
        return all_docs
