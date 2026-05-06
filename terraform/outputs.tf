output "ec2_public_ip" {
  description = "Elastic IP assigned to the EC2 instance"
  value       = aws_eip.parrot.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_eip.parrot.public_dns
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.parrot.id
}

output "ec2_ami" {
  description = "AMI used for the instance"
  value       = data.aws_ami.ubuntu.id
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh ubuntu@${aws_eip.parrot.public_ip}"
}

output "app_url" {
  description = "Application URL"
  value       = "http://${aws_eip.parrot.public_ip}"
}
