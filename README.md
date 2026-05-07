# Parrot

Listen to any document. Upload a PDF, Word doc, or text file and Parrot reads it aloud with word-by-word highlighting.

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
| TLS | AWS ACM certificate |
| DNS | AWS Route 53 |
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
├── route53.tf        Hosted zone + A alias records for apex and www
├── iam.tf            EC2 instance role (ECR read + CloudWatch)
├── security_group.tf EC2 SG (SSH + ALB-only app traffic)
├── data.tf           Provider, AMI, VPC, subnet data sources
├── variables.tf      All input variables with defaults
└── outputs.tf        EC2 IP, ALB DNS, app URL, Route 53 nameservers
```

**One-time backend bootstrap** (run once before first pipeline execution):
```bash
bash scripts/bootstrap-tfstate.sh
# Prints TF_STATE_BUCKET and TF_LOCK_TABLE values — add both as GitHub secrets
```

**Stale state lock** (if a pipeline run was killed mid-apply):
```bash
cd terraform
terraform init -backend-config="bucket=<TF_STATE_BUCKET>" \
               -backend-config="dynamodb_table=parrot-terraform-locks" \
               -backend-config="region=us-east-1"
terraform force-unlock <LOCK_ID>
```

---

## CI/CD pipeline

Every push to `main` runs the full pipeline. Pull requests run tests, security scans, and a Terraform plan (posted as a PR comment) but do not deploy.

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
  ║  ├── build Docker image           ├── terraform apply  ║
  ║  ├── Trivy container scan         ├── provision EC2    ║
  ║  └── push :sha + :latest          ├── create ALB       ║
  ║       to Docker Hub               ├── wire Route 53    ║
  ║                         └── output EC2 IP + ALB DNS    ║
  ║                                                        ║
  ║  bootstrap-ec2                                         ║
  ║  └── install Docker on EC2 (idempotent)                ║
  ║                                                        ║
  ║  deploy                                                ║
  ║  └── SSH → pull image → replace container              ║
  ║       → health check → auto-rollback on failure        ║
  ║                                                        ║
  ║  smoke-test    5 live checks via ALB DNS               ║
  ║                                                        ║
  ║  report        GitHub Step Summary + Slack             ║
  ╚════════════════════════════════════════════════════════╝
```

### GitHub secrets required

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key (EC2, ALB, ACM, Route 53, S3, DynamoDB) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `TF_STATE_BUCKET` | S3 bucket name for Terraform state |
| `TF_LOCK_TABLE` | DynamoDB table name for state locking |
| `EC2_SSH_KEY` | Private key used by the deploy step to SSH into EC2 |
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `SLACK_WEBHOOK_URL` | *(optional)* Slack incoming webhook URL |

### GitHub variables (Settings → Variables → Actions)

| Variable | Example | Description |
|----------|---------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for all resources |
| `EC2_KEY_PAIR_NAME` | `my-keypair` | *(optional)* Existing EC2 key pair name — auto-discovered if not set |
| `SLACK_NOTIFICATIONS` | `true` | Enable Slack deploy notifications |

### DNS delegation (automatic)

After `terraform apply`, the pipeline automatically calls `route53domains update-domain-nameservers` to point `maibaaki.com` at the new Route 53 hosted zone. ACM then validates the certificate against those DNS records within ~2 minutes and the HTTPS listener comes online.

If you ever need the nameservers manually, they are printed in the pipeline step summary under `route53_nameservers`.

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
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useSpeech.js
│   │   └── components/
│   │       ├── UploadZone.jsx
│   │       ├── TextDisplay.jsx
│   │       └── Player.jsx
│   └── src/test/              Vitest suite
├── tests/
│   ├── test_api.py            FastAPI endpoint tests
│   ├── test_parsers.py        Parser unit tests
│   └── smoke/smoke_test.py    Live smoke tests (post-deploy, targets ALB)
├── terraform/                 All infrastructure-as-code
├── scripts/
│   └── bootstrap-tfstate.sh   One-time S3 + DynamoDB state backend setup
└── .github/
    └── workflows/pipeline.yml Full CI/CD pipeline
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
