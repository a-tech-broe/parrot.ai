# IAM role — lets the EC2 instance pull images from ECR without static credentials
resource "aws_iam_role" "parrot" {
  name = "${var.app_name}-ec2-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.parrot.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# CloudWatch logs (optional — allows the instance to ship docker logs)
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.parrot.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "parrot" {
  name = "${var.app_name}-ec2-${var.environment}"
  role = aws_iam_role.parrot.name
}
