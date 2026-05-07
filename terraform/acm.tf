# ACM certificate for the apex domain + www
resource "aws_acm_certificate" "parrot" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation records — written into the Route53 zone automatically
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.parrot.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  zone_id         = aws_route53_zone.parrot.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
}

# Blocks until the certificate is issued (typically 1-2 min with Route53)
resource "aws_acm_certificate_validation" "parrot" {
  certificate_arn         = aws_acm_certificate.parrot.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
