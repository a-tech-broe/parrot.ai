# Use the existing hosted zone created by Route 53 when the domain was registered.
# Do NOT create a new zone — the registrar already delegates to this one.
data "aws_route53_zone" "parrot" {
  name         = var.domain_name
  private_zone = false
}

# Apex: maibaaki.com → ALB
resource "aws_route53_record" "apex" {
  zone_id         = data.aws_route53_zone.parrot.zone_id
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
  zone_id         = data.aws_route53_zone.parrot.zone_id
  name            = "www.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.parrot.dns_name
    zone_id                = aws_lb.parrot.zone_id
    evaluate_target_health = true
  }
}
