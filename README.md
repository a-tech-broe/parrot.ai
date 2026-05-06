# Parrot

Listen to any document. Upload a PDF, Word doc, or text file and Parrot reads it aloud with word-by-word highlighting.

**Domain:** [maibaaki.com](https://maibaaki.com)

---

## Features

- Upload PDF, DOCX, or TXT files (up to 50 MB)
- Word-by-word highlight that tracks speech in real time
- Play, pause, stop, and seek controls
- Skip forward/back 50 words
- Voice selector and speed control (0.5×–2.5×)
- Estimated reading time
- Fully keyboard accessible (Space, Esc, Alt+←/→)

## Stack

- **Backend:** Python / FastAPI
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **TTS:** Browser Web Speech API
- **Document parsing:** pdfplumber (PDF), python-docx (DOCX)

## Getting started

**1. Install dependencies**

```bash
pip install -r requirements.txt
```

**2. Run the server**

```bash
uvicorn main:app --reload --port 8000
```

**3. Open the app**

```
http://localhost:8000
```

## Project structure

```
parrot.ai/
├── main.py          # FastAPI app and API routes
├── parsers.py       # Document text extraction
├── requirements.txt
└── static/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## API

`POST /api/parse`

Upload a document and receive extracted plain text.

| Field | Type | Description |
|---|---|---|
| `file` | form-data | PDF, DOCX, or TXT file |

Response:
```json
{
  "filename": "report.pdf",
  "text": "...",
  "word_count": 1234,
  "char_count": 7890
}
```
