# Look up the existing ACM certificate already issued in the account.
# The certificate must cover var.domain_name (and ideally www.*).
data "aws_acm_certificate" "parrot" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}
