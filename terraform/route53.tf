# Apex: maibaaki.com → ALB
resource "aws_route53_record" "apex" {
  zone_id         = var.hosted_zone_id
  name            = var.domain_name
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.parrot.dns_name
    zone_id                = aws_lb.parrot.zone_id
    evaluate_target_health = true
  }
}

# www.maibaaki.com → ALB
resource "aws_route53_record" "www" {
  zone_id         = var.hosted_zone_id
  name            = "www.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.parrot.dns_name
    zone_id                = aws_lb.parrot.zone_id
    evaluate_target_health = true
  }
}
