resource "aws_security_group" "parrot" {
  name        = "${var.app_name}-${var.environment}"
  description = "${var.app_name} EC2 - SSH ingress and ALB-routed app traffic"
  vpc_id      = data.aws_vpc.default.id

  # SSH — restricted by allowed_ssh_cidrs variable
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  # Port 8000 ingress from ALB is added as a separate aws_security_group_rule
  # in alb.tf to avoid a circular dependency between the two SG resources.

  # Egress — Docker Hub pulls, apt mirrors, DNS
  # 0.0.0.0/0 required: these services use dynamic public IPs.

  egress {
    description = "HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0104
  }

  egress {
    description = "HTTP outbound"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0104
  }

  egress {
    description = "DNS UDP"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0104
  }

  egress {
    description = "DNS TCP"
    from_port   = 53
    to_port     = 53
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0104
  }

  tags = {
    Name = "${var.app_name}-${var.environment}"
  }

  lifecycle {
    create_before_destroy = true
  }
}
