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

variable "key_pair_name" {
  description = "Name of the existing EC2 key pair in the AWS account"
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "CIDR blocks allowed to SSH. Defaults to all — restrict in production."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
