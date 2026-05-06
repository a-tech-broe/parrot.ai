#!/usr/bin/env bash
# Run ONCE before the first pipeline execution to create the Terraform
# remote state backend (S3 bucket + DynamoDB lock table).
#
# Usage: bash scripts/bootstrap-tfstate.sh [region]
# Requires: AWS CLI configured with admin credentials
set -euo pipefail

REGION="${1:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="parrot-tfstate-${ACCOUNT_ID}-${REGION}"
TABLE="parrot-terraform-locks"

echo "=== Bootstrapping Terraform remote state ==="
echo "  Account : $ACCOUNT_ID"
echo "  Region  : $REGION"
echo "  Bucket  : $BUCKET"
echo "  Table   : $TABLE"
echo ""

# ── S3 bucket ─────────────────────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "✓ S3 bucket already exists: $BUCKET"
else
  echo "→ Creating S3 bucket..."
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration "LocationConstraint=$REGION"
  fi

  aws s3api put-bucket-versioning --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption --bucket "$BUCKET" \
    --server-side-encryption-configuration '{
      "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]
    }'

  aws s3api put-public-access-block --bucket "$BUCKET" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  echo "✓ S3 bucket created and hardened"
fi

# ── DynamoDB lock table ────────────────────────────────────────────────────────
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" &>/dev/null; then
  echo "✓ DynamoDB table already exists: $TABLE"
else
  echo "→ Creating DynamoDB table..."
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"
  echo "✓ DynamoDB table created"
fi

echo ""
echo "=== Done. Add these as GitHub secrets: ==="
echo "  TF_STATE_BUCKET = $BUCKET"
echo "  TF_LOCK_TABLE   = $TABLE"
echo ""
echo "Then update terraform/backend.tf if the region differs from us-east-1."
