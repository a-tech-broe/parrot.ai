# ── ALB Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-${var.environment}"
  description = "${var.app_name} ALB - public HTTP and HTTPS ingress"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0107
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] #trivy:ignore:AVD-AWS-0107
  }

  tags = {
    Name = "${var.app_name}-alb-${var.environment}"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Cross-SG rules — avoids circular dependency between the two SG resources
resource "aws_security_group_rule" "alb_egress_to_ec2" {
  type                     = "egress"
  description              = "Forward to app"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.alb.id
  source_security_group_id = aws_security_group.parrot.id
}

resource "aws_security_group_rule" "ec2_ingress_from_alb" {
  type                     = "ingress"
  description              = "App traffic from ALB"
  from_port                = 8000
  to_port                  = 8000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.parrot.id
  source_security_group_id = aws_security_group.alb.id
}

# ── Target Group ─────────────────────────────────────────────────────────────
resource "aws_lb_target_group" "parrot" {
  name        = "${var.app_name}-${var.environment}"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.app_name}-${var.environment}"
  }
}

resource "aws_lb_target_group_attachment" "parrot" {
  target_group_arn = aws_lb_target_group.parrot.arn
  target_id        = aws_instance.parrot.id
  port             = 8000
}

# ── Application Load Balancer ─────────────────────────────────────────────────
resource "aws_lb" "parrot" {
  name               = "${var.app_name}-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection = false

  tags = {
    Name = "${var.app_name}-${var.environment}"
  }
}

# HTTP → HTTPS permanent redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.parrot.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener — TLS terminated at the ALB
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.parrot.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.parrot.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.parrot.arn
  }
}
