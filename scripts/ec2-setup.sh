#!/usr/bin/env bash
# Run once on a fresh Ubuntu 22.04/24.04 EC2 instance.
# Requires root: sudo bash scripts/ec2-setup.sh
set -euo pipefail

echo "=== Installing Docker ==="
apt-get update -y
apt-get install -y ca-certificates curl gnupg unzip

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
systemctl enable docker
systemctl start docker

# Add the deploy user to the docker group so sudo is not needed
DEPLOY_USER="${SUDO_USER:-ubuntu}"
usermod -aG docker "$DEPLOY_USER" || true

echo "=== Installing AWS CLI v2 ==="
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update
rm -rf /tmp/aws /tmp/awscliv2.zip

echo "=== Verifying ==="
docker --version
aws --version

echo ""
echo "=== EC2 setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Attach an IAM role to this instance with ECR pull permissions"
echo "     (AmazonEC2ContainerRegistryReadOnly is sufficient)"
echo "  2. Open port 80 in the EC2 security group"
echo "  3. Add these GitHub Actions secrets to your repo:"
echo "       EC2_HOST       — public IP or hostname of this instance"
echo "       EC2_USERNAME   — SSH user (usually 'ubuntu')"
echo "       EC2_SSH_KEY    — contents of your private key (.pem file)"
echo "       AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — for ECR push from CI"
echo "       SLACK_WEBHOOK_URL — (optional) for Slack notifications"
echo "  4. Add GitHub Actions variables (Settings → Variables):"
echo "       AWS_REGION      — e.g. us-east-1"
echo "       ECR_REPOSITORY  — e.g. parrot"
