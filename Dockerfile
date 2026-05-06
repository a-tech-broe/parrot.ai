# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build
# Output lands at /app/dist (vite outDir: '../dist')


# ── Stage 2: Python backend + built frontend ───────────────────────────────────
FROM python:3.11-slim AS app

WORKDIR /app

# Install Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY main.py parsers.py ./

# Copy built frontend from stage 1
COPY --from=frontend /app/dist ./dist

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
