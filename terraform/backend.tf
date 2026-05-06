terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Partial backend — bucket and dynamodb_table are injected at init time via
  # -backend-config flags in CI (secrets TF_STATE_BUCKET / TF_LOCK_TABLE).
  # Run scripts/bootstrap-tfstate.sh once to create these resources.
  backend "s3" {
    key     = "parrot/production.tfstate"
    encrypt = true
  }
}
