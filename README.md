# parrot maibaaki

Listen to any document. Upload a PDF, Word doc, or text file and parrot maibaaki reads it aloud with word-by-word highlighting.

**Live at:** [https://maibaaki.com](https://maibaaki.com)

---

## Features

- Upload PDF, DOCX, or TXT files (up to 50 MB)
- Word-by-word highlight that tracks speech in real time
- Play, pause, stop, and seek controls
- Skip forward/back 50 words
- Voice selector and speed control (0.5×–2.5×)
- Estimated reading time
- Keyboard shortcuts: `Space` play/pause · `Esc` stop · `Alt+←/→` skip
- Fully responsive — works on phones, tablets, and wide screens

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Python 3.11 / FastAPI |
| TTS | Browser Web Speech API |
| Document parsing | pdfplumber (PDF) · python-docx (DOCX) |
| Container | Docker multi-stage build |
| Registry | Docker Hub |
| Compute | AWS EC2 (m5.xlarge, Ubuntu 22.04) |
| Load balancer | AWS ALB (HTTPS, HTTP→HTTPS redirect) |
| TLS | AWS ACM certificate (DNS validated) |
| DNS | AWS Route 53 (existing hosted zone via `HOSTED_ZONE_ID`) |
| Infrastructure | Terraform (S3 backend + DynamoDB locking) |
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

```bash
docker build -t parrot .
docker run -p 8000:8000 parrot
```

Open `http://localhost:8000`.

---

## Infrastructure

Infrastructure is managed by Terraform and lives in `terraform/`. A one-time bootstrap creates the S3 state bucket and DynamoDB lock table before the first pipeline run.

```
terraform/
├── backend.tf        S3 remote state (partial — config injected by CI)
├── main.tf           EC2 instance + Elastic IP
├── alb.tf            Application Load Balancer, listeners, target group
├── acm.tf            ACM certificate + DNS validation records
├── route53.tf        A alias records for apex and www (uses existing zone)
├── iam.tf            EC2 instance role (CloudWatch)
├── security_group.tf EC2 SG (SSH + ALB-only app traffic)
├── data.tf           Provider, AMI, VPC, subnet data sources
├── variables.tf      All input variables with defaults
└── outputs.tf        EC2 IP, ALB DNS, app URL
```

**One-time backend bootstrap** (run once before first pipeline execution):
```bash
bash scripts/bootstrap-tfstate.sh
# Prints TF_STATE_BUCKET and TF_LOCK_TABLE values — add both as GitHub secrets
```

---

## Workflows

Three GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `pipeline.yml` | Push / PR to `main` | Full CI/CD — test, scan, build, apply infra, deploy |
| `deploy.yml` | Manual | Build + deploy only, no Terraform — use when infra is already up |
| `cleanup.yml` | Manual | Fix state locks · prune Docker tags · terraform destroy |

### pipeline.yml — push to `main`

```
PR or push
  │
  ├── test-backend       pytest (unit + integration)
  ├── test-frontend      Vitest
  ├── scan-dependencies  pip-audit + npm audit
  └── terraform-plan     validate + Trivy IaC scan + plan → PR comment
  │
  ╔══ push to main only ═══════════════════════════════════╗
  ║                                                        ║
  ║  build-scan-push ──────────────── terraform-apply      ║
  ║  ├── build Docker image           ├── clean state      ║
  ║  ├── Trivy container scan         ├── import orphans   ║
  ║  └── push :sha + :latest          ├── terraform apply  ║
  ║       to Docker Hub               └── output EC2 + ALB ║
  ║                                                        ║
  ║  bootstrap-ec2                                         ║
  ║  └── install Docker on EC2 (idempotent)                ║
  ║                                                        ║
  ║  deploy                                                ║
  ║  └── SSH → pull image → replace container              ║
  ║       → health check → auto-rollback on failure        ║
  ║                                                        ║
  ║  smoke-test    live checks against https://maibaaki.com║
  ║                                                        ║
  ║  report        GitHub Step Summary + Slack             ║
  ╚════════════════════════════════════════════════════════╝
```

### deploy.yml — manual deploy

Builds, scans, and deploys the current `main` HEAD without running Terraform. Resolves the EC2 host from `vars.EC2_HOST` or by querying AWS for the instance tagged `Project=parrot`.

Go to **Actions → Deploy → Run workflow**.

### cleanup.yml — manual cleanup

| Target | What it does |
|--------|-------------|
| `state` | Releases stale DynamoDB locks, removes orphaned state entries |
| `docker-images` | Prunes Docker Hub tags, keeps newest 10 |
| `infrastructure` | `terraform destroy` — requires typing `destroy` to confirm |

Go to **Actions → Cleanup → Run workflow**.

---

### GitHub secrets required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key (EC2, ALB, ACM, Route 53, S3, DynamoDB) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `TF_STATE_BUCKET` | S3 bucket name for Terraform state |
| `TF_LOCK_TABLE` | DynamoDB table name for state locking |
| `HOSTED_ZONE_ID` | Route 53 hosted zone ID for `maibaaki.com` |
| `EC2_SSH_KEY` | Private key used by the deploy step to SSH into EC2 |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `SLACK_WEBHOOK_URL` | *(optional)* Slack incoming webhook URL |

### GitHub variables (Settings → Variables → Actions)

| Variable | Example | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for all resources |
| `EC2_HOST` | `1.2.3.4` | EC2 public IP — used by the manual deploy workflow |
| `EC2_KEY_PAIR_NAME` | `my-keypair` | *(optional)* EC2 key pair name — auto-discovered if not set |
| `SLACK_NOTIFICATIONS` | `true` | Enable Slack deploy notifications |

---

## Project structure

```
parrot.ai/
├── main.py                    FastAPI app + /api/parse endpoint
├── parsers.py                 PDF, DOCX, TXT text extraction
├── requirements.txt           Runtime Python dependencies
├── requirements-dev.txt       Test dependencies
├── Dockerfile                 Multi-stage: Node builds React → Python serves
├── .trivyignore               Suppressed CVEs (documented justification)
├── frontend/
│   ├── index.html             Page title and font imports
│   ├── src/
│   │   ├── App.jsx            Shell, header, routing between views
│   │   ├── index.css          Design system + full responsive layout
│   │   ├── hooks/useSpeech.js Web Speech API hook
│   │   └── components/
│   │       ├── UploadZone.jsx Hero, drop zone, feature cards
│   │       ├── TextDisplay.jsx Word-by-word highlighted text
│   │       ├── Reader.jsx     Document view wrapper
│   │       └── Player.jsx     Playback controls + live waveform
│   └── src/test/              Vitest suite
├── tests/
│   ├── test_api.py            FastAPI endpoint tests
│   ├── test_parsers.py        Parser unit tests
│   └── smoke/smoke_test.py    Live smoke tests (targets https://maibaaki.com)
├── terraform/                 All infrastructure-as-code
├── scripts/
│   └── bootstrap-tfstate.sh   One-time S3 + DynamoDB state backend setup
└── .github/
    └── workflows/
        ├── pipeline.yml       Full CI/CD pipeline
        ├── deploy.yml         Manual deploy (no Terraform)
        └── cleanup.yml        Manual cleanup and destroy
```

---

## API

`POST /api/parse` — upload a document, receive extracted plain text.

```bash
curl -X POST https://maibaaki.com/api/parse \
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
