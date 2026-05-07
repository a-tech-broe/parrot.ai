output "ec2_public_ip" {
  description = "Elastic IP assigned to the EC2 instance"
  value       = aws_eip.parrot.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.parrot.id
}

output "alb_dns_name" {
  description = "ALB DNS name (use this for smoke tests and health checks)"
  value       = aws_lb.parrot.dns_name
}

output "app_url" {
  description = "Public application URL"
  value       = "https://${var.domain_name}"
}

output "route53_nameservers" {
  description = "Nameservers to set at your domain registrar for maibaaki.com"
  value       = aws_route53_zone.parrot.name_servers
}

output "ssh_command" {
  description = "SSH command to connect to the EC2 instance"
  value       = "ssh ubuntu@${aws_eip.parrot.public_ip}"
}
