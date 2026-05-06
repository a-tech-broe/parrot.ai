from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from parsers import extract_text

app = FastAPI(title="Parrot AI", description="Listen to any document")

STATIC_DIR = Path(__file__).parent / "static"


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/parse")
async def parse_document(file: UploadFile = File(...)):
    allowed = {".pdf", ".docx", ".doc", ".txt"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Please upload PDF, DOCX, or TXT.",
        )

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds the 50 MB limit.")

    try:
        text = extract_text(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not read document: {e}")

    text = text.strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="Document appears to be empty or contains no readable text.",
        )

    return {
        "filename": file.filename,
        "text": text,
        "word_count": len(text.split()),
        "char_count": len(text),
    }


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
