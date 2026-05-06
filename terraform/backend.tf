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
    key     = "parrot/production.tfstate"
    encrypt = true
  }
}
