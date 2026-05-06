# SSH key pair — public key injected by CI from EC2_SSH_PUBLIC_KEY secret
resource "aws_key_pair" "deploy" {
  key_name   = "${var.app_name}-deploy-${var.environment}"
  public_key = var.ssh_public_key

  tags = {
    Name = "${var.app_name}-deploy-${var.environment}"
  }
}

# EC2 instance
resource "aws_instance" "parrot" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deploy.key_name
  vpc_security_group_ids = [aws_security_group.parrot.id]
  iam_instance_profile   = aws_iam_instance_profile.parrot.name
  subnet_id              = data.aws_subnets.default.ids[0]

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name = "${var.app_name}-${var.environment}-root"
    }
  }

  # IMDSv2 required — mitigates SSRF-based metadata attacks
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
    http_endpoint               = "enabled"
  }

  tags = {
    Name = "${var.app_name}-${var.environment}"
  }

  # Don't replace the instance if a newer AMI is released — upgrade via patch
  lifecycle {
    ignore_changes = [ami]
  }
}

# Elastic IP — stable public address survives instance stop/start
resource "aws_eip" "parrot" {
  instance = aws_instance.parrot.id
  domain   = "vpc"

  tags = {
    Name = "${var.app_name}-${var.environment}"
  }

  depends_on = [aws_instance.parrot]
}
