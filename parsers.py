import io
from pathlib import Path


def extract_text(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _parse_pdf(content)
    if ext in (".docx", ".doc"):
        return _parse_docx(content)
    if ext == ".txt":
        return content.decode("utf-8", errors="replace")
    raise ValueError(f"Unsupported file type '{ext}'. Upload PDF, DOCX, or TXT.")


def _parse_pdf(content: bytes) -> str:
    import pdfplumber
    parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text and text.strip():
                parts.append(text.strip())
    return "\n\n".join(parts)


def _parse_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(parts)
