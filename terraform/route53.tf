# Hosted zone — Terraform owns the zone; point your registrar to the NS records
# printed in the route53_nameservers output after first apply.
resource "aws_route53_zone" "parrot" {
  name = var.domain_name
}

# Apex: maibaaki.com → ALB
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.parrot.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.parrot.dns_name
    zone_id                = aws_lb.parrot.zone_id
    evaluate_target_health = true
  }
}

# www.maibaaki.com → ALB
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.parrot.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.parrot.dns_name
    zone_id                = aws_lb.parrot.zone_id
    evaluate_target_health = true
  }
}
