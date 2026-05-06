variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name — used for resource naming and tagging"
  type        = string
  default     = "parrot"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m5.xlarge"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 30
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access (injected by CI from EC2_SSH_PUBLIC_KEY secret)"
  type        = string
  sensitive   = true
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH. Defaults to all — restrict in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tf_state_bucket" {
  description = "S3 bucket name for Terraform state (injected by CI from TF_STATE_BUCKET secret)"
  type        = string
  sensitive   = true
  default = "bathbucket31"
}

variable "tf_lock_table" {
  description = "DynamoDB table name for Terraform state locking (injected by CI from TF_LOCK_TABLE secret)"
  type        = string
  sensitive   = true
  default = "dyning_table"
}