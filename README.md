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
- Keyboard shortcuts: `Space` play/pause · `Esc` stop · `Alt+←/→` skip

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Python 3.11 / FastAPI |
| TTS | Browser Web Speech API |
| Document parsing | pdfplumber (PDF) · python-docx (DOCX) |
| Container | Docker (multi-stage build) |
| Registry | Amazon ECR |
| Hosting | AWS EC2 |
| CI/CD | GitHub Actions |

---

## Local development

**Requirements:** Python 3.11+, Node.js 20+

**Terminal 1 — backend:**
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend (hot reload):**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` calls to the FastAPI backend automatically.

**Run tests:**
```bash
# Backend
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend && npm test
```

---

## Docker

**Build and run locally:**
```bash
docker compose up --build
```

Open `http://localhost:8000`.

---

## CI/CD pipeline

Every push to `main` runs the full pipeline automatically. Pull requests run tests and a security scan but do not deploy.

```
push to main
  │
  ├── bootstrap-ec2      install Docker + AWS CLI on EC2 (idempotent, parallel)
  ├── test-backend       pytest — 11 tests
  ├── test-frontend      Vitest — 4 tests
  └── scan-dependencies  pip-audit + npm audit
  │
  build-scan-push
    ├── create ECR repository (idempotent)
    ├── build Docker image (layer-cached)
    ├── Trivy scan → GitHub Security tab (fails on CRITICAL CVEs)
    └── push :sha + :latest tags to ECR
  │
  deploy
    └── SSH → pull image → replace container → health check → auto-rollback
  │
  smoke-test             5 live checks against the running EC2 instance
  │
  report                 GitHub Step Summary + Slack notification
```

### GitHub secrets required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM key with ECR push + `ecr:CreateRepository` permissions |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `EC2_HOST` | Public IP or hostname of the EC2 instance |
| `EC2_USERNAME` | SSH user — typically `ubuntu` |
| `EC2_SSH_KEY` | Full contents of the `.pem` private key |
| `SLACK_WEBHOOK_URL` | *(optional)* Slack incoming webhook for notifications |

### GitHub variables (Settings → Variables)

| Variable | Example |
|----------|---------|
| `AWS_REGION` | `us-east-1` |
| `ECR_REPOSITORY` | `parrot` |
| `SLACK_NOTIFICATIONS` | `true` |

### EC2 prerequisites

- Ubuntu 22.04 or 24.04
- Port 22 (SSH) and port 80 (HTTP) open in the security group
- IAM instance role with `AmazonEC2ContainerRegistryReadOnly` attached

The pipeline bootstraps Docker and the AWS CLI automatically on first run — no manual setup needed on the instance.

---

## Project structure

```
parrot.ai/
├── main.py                  FastAPI app and /api/parse endpoint
├── parsers.py               PDF, DOCX, TXT text extraction
├── requirements.txt         Runtime Python dependencies
├── requirements-dev.txt     Test dependencies
├── pytest.ini
├── Dockerfile               Multi-stage: Node builds React → Python serves it
├── docker-compose.yml       Single-service production compose
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useSpeech.js
│   │   └── components/
│   │       ├── UploadZone.jsx
│   │       ├── Reader.jsx
│   │       ├── TextDisplay.jsx
│   │       └── Player.jsx
│   └── src/test/            Vitest test suite
├── tests/
│   ├── test_api.py          FastAPI endpoint tests
│   ├── test_parsers.py      Parser unit tests
│   └── smoke/smoke_test.py  Live smoke tests (run post-deploy)
├── scripts/
│   └── ec2-setup.sh         Manual EC2 bootstrap (also run by pipeline)
└── .github/
    └── workflows/ci-cd.yml  Full CI/CD pipeline
```

## API

`POST /api/parse` — upload a document, receive extracted plain text.

```bash
curl -X POST http://localhost:8000/api/parse \
  -F "file=@document.pdf"
```

```json
{
  "filename": "document.pdf",
  "text": "...",
  "word_count": 1234,
  "char_count": 7890
}
```
