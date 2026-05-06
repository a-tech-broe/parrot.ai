terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Partial backend — bucket and dynamodb_table are passed via -backend-config
  # in CI (stored as GitHub secrets TF_STATE_BUCKET / TF_LOCK_TABLE).
  # Run scripts/bootstrap-tfstate.sh once to create these resources.
  backend "s3" {
    name    = var.tf_state_bucket
    key     = "parrot/production.tfstate"
    encrypt = true
  }
}

resource "aws_dynamodb_table" "tf_lock_table" {
  name         = var.tf_lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
