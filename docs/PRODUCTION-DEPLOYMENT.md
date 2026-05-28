# Production Deployment Runbook

**Audience:** A junior DevOps engineer with basic AWS familiarity (you've used the Console, you know what an EC2 instance is) but who hasn't shipped a production NestJS + Next.js app before.

**Goal:** Take Annex Workforce from a zip file on your laptop to a live production deployment at `https://app.annexworkforce.com` and `https://api.annexworkforce.com`, with monitoring, backups, and a rollback plan.

**Time:** 6–10 hours for the first deployment. Subsequent deployments take 5 minutes.

**Cost:** ~$180–250/month for the AWS infrastructure described here. Can be reduced to ~$80/month for a smaller staging environment by halving instance sizes.

---

## How to use this document

- **Steps are numbered and meant to be done in order.** Skipping ahead will cause failures because later steps depend on earlier ones.
- **Every command is meant to be copy-pasted.** Where you need to substitute a real value, the placeholder is in `<ANGLE_BRACKETS>`.
- **Verify checkpoints** appear after every major section. Don't proceed until the checkpoint passes — you will save hours of debugging later by stopping early.
- **If something fails**, jump to [§ 14 Troubleshooting](#14-troubleshooting) before reading on. Don't guess.
- **Keep a notebook.** Every time AWS gives you an ARN, ID, hostname, or password, paste it into a local file. You will need them later.

---

## Table of contents

1. [Pre-flight checklist](#1-pre-flight-checklist)
2. [Provision the foundation: domain, AWS account, and tools](#2-provision-the-foundation-domain-aws-account-and-tools)
3. [Set up Secrets Manager](#3-set-up-secrets-manager)
4. [Create the network (VPC + subnets)](#4-create-the-network-vpc--subnets)
5. [Provision the database (RDS PostgreSQL)](#5-provision-the-database-rds-postgresql)
6. [Provision Redis (ElastiCache)](#6-provision-redis-elasticache)
7. [Provision OpenSearch (managed Elasticsearch)](#7-provision-opensearch-managed-elasticsearch)
8. [Provision S3 for uploads](#8-provision-s3-for-uploads)
9. [Build and push Docker images to ECR](#9-build-and-push-docker-images-to-ecr)
10. [Run database migrations](#10-run-database-migrations)
11. [Create the ECS cluster and services](#11-create-the-ecs-cluster-and-services)
12. [Configure the ALB, DNS, and TLS](#12-configure-the-alb-dns-and-tls)
13. [Smoke test + go live](#13-smoke-test--go-live)
14. [Troubleshooting](#14-troubleshooting)
15. [Day-2: deploys, rollbacks, monitoring, backups](#15-day-2-deploys-rollbacks-monitoring-backups)

---

## 1. Pre-flight checklist

Before you start, gather everything you need. **Do not start step 2 until every box below is ticked.**

### 1.1 Things you need from the business

- [ ] A registered domain name (e.g. `annexworkforce.com`). If you don't have one, buy it now from Cloudflare Registrar (~$10/yr) or AWS Route 53. **Wait 1 hour after registration before continuing.**
- [ ] AWS account with billing enabled and budget alerts configured at $250/mo.
- [ ] A SendGrid account with an API key (or skip and add later — emails won't send until you do).
- [ ] The Annex Workforce source code (the `annex-workforce.zip` file).

### 1.2 Tools to install on your laptop

Open a terminal and run each command. If any fails, install the missing tool before continuing.

```bash
# Check versions
docker --version          # need 24.0+
docker compose version    # need v2+
aws --version             # need 2.13+
node --version            # need 20+
git --version             # any recent version
psql --version            # need 16 (only used for one-off DB inspection)
jq --version              # used for parsing AWS CLI JSON output
```

**Install missing tools:**

```bash
# macOS
brew install awscli docker node@20 postgresql@16 jq

# Ubuntu/Debian
sudo apt update
sudo apt install -y awscli postgresql-client-16 jq nodejs npm
# Docker: follow https://docs.docker.com/engine/install/ubuntu/
```

### 1.3 Configure AWS CLI

```bash
aws configure
```

When prompted:
- **AWS Access Key ID:** create one at IAM → Users → Your User → Security Credentials → Create access key
- **AWS Secret Access Key:** copied from the same screen
- **Default region:** `us-east-1` (or your preferred region — but be consistent everywhere)
- **Default output format:** `json`

**Verify it works:**

```bash
aws sts get-caller-identity
```

You should see your AWS account ID, IAM user ARN, and user ID. If you see an error, your keys are wrong.

### 1.4 Pick a region and stick to it

Throughout this document, replace `us-east-1` with the region you chose. **Pick one and never deviate** — every resource must be in the same region or networking will break.

```bash
# Set this once for your shell session — used in every command below
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Verify
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
```

### 1.5 Create your notebook

Create a file `~/annex-deploy-notebook.txt` on your laptop. Every time this guide says "**WRITE DOWN**", paste the value into this file with a label. Example:

```
=== Annex Workforce Production Deploy ===
AWS Account ID: 123456789012
Region: us-east-1
Domain: annexworkforce.com

VPC ID: vpc-xxxxxxxxxxxxxxxxx
RDS endpoint: ...
RDS master password: ...
```

You will reference this file 30+ times today. Keeping it organized is the difference between an 8-hour deploy and a 2-day deploy.

### ✓ Checkpoint 1

Run this — every line must succeed:

```bash
aws sts get-caller-identity > /dev/null && echo "✓ AWS configured"
docker info > /dev/null 2>&1 && echo "✓ Docker running"
test -n "$AWS_REGION" && echo "✓ Region set: $AWS_REGION"
test -n "$AWS_ACCOUNT_ID" && echo "✓ Account: $AWS_ACCOUNT_ID"
test -f ~/annex-deploy-notebook.txt && echo "✓ Notebook ready"
```

---

## 2. Provision the foundation: domain, AWS account, and tools

### 2.1 Set up Route 53 hosted zone for your domain

Even if your domain is registered elsewhere, you'll use Route 53 for DNS because it integrates with ACM (TLS certificates) and ALB.

```bash
aws route53 create-hosted-zone \
  --name annexworkforce.com \
  --caller-reference "annex-$(date +%s)"
```

The output includes four name servers under `DelegationSet.NameServers`:

```json
{
    "DelegationSet": {
        "NameServers": [
            "ns-123.awsdns-12.com",
            "ns-456.awsdns-34.net",
            "ns-789.awsdns-56.org",
            "ns-012.awsdns-78.co.uk"
        ]
    }
}
```

**WRITE DOWN** the hosted zone ID (`Id` field, looks like `/hostedzone/Z123ABCDEF`) and the four name servers.

**Now go to your domain registrar** (Cloudflare, Namecheap, GoDaddy, wherever you bought the domain) and replace the existing nameservers with these four AWS ones. **DNS propagation takes 1-48 hours.** While you wait, you can continue with steps 2.2 onwards.

**Verify propagation later with:**

```bash
dig NS annexworkforce.com +short
```

You should see the four AWS nameservers. Until you do, your TLS certificates won't validate (step 12).

### 2.2 Request a TLS certificate (do this early — validation takes 30+ minutes)

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name annexworkforce.com \
  --subject-alternative-names "*.annexworkforce.com" \
  --validation-method DNS \
  --region $AWS_REGION \
  --query CertificateArn --output text)

echo "Certificate ARN: $CERT_ARN"
```

**WRITE DOWN** the certificate ARN.

Now get the DNS validation records:

```bash
sleep 10  # ACM needs a moment to generate the records

aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions[].ResourceRecord" --output json
```

This returns one or two CNAME records like:

```json
[
    {
        "Name": "_abc123.annexworkforce.com.",
        "Type": "CNAME",
        "Value": "_xyz789.acm-validations.aws."
    }
]
```

Add each as a CNAME record in Route 53:

```bash
HOSTED_ZONE_ID=<paste from step 2.1, just the Z... part>

# Get the record details
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord" > /tmp/cert-validation.json

NAME=$(jq -r '.Name' /tmp/cert-validation.json)
VALUE=$(jq -r '.Value' /tmp/cert-validation.json)

cat > /tmp/cert-validate-change.json <<EOF
{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "$NAME",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "$VALUE"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/cert-validate-change.json
```

**Now wait.** After your nameservers propagate (step 2.1), ACM will detect the validation records and issue the cert. Check status:

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.Status" --output text
```

It will show `PENDING_VALIDATION` until validation completes, then `ISSUED`. **Don't proceed past step 12 until it says `ISSUED`.** Steps 3–11 don't need the cert, so continue with them while you wait.

### ✓ Checkpoint 2

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='annexworkforce.com.']" --output text \
  | grep -q "annexworkforce.com" && echo "✓ Hosted zone exists"
test -n "$CERT_ARN" && echo "✓ Cert ARN saved: $CERT_ARN"
```

---

## 3. Set up Secrets Manager

We're going to generate strong passwords and JWT secrets, then store them centrally so the ECS tasks can pull them at runtime.

### 3.1 Generate strong secrets

```bash
# 64-char hex JWT secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 32-char passwords for DB and Redis
DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

# Show them so you can copy to your notebook
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
```

**WRITE DOWN all four values.**

### 3.2 Store secrets in AWS Secrets Manager

```bash
aws secretsmanager create-secret --name annex/prod/jwt-secret \
  --secret-string "$JWT_SECRET" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/jwt-refresh-secret \
  --secret-string "$JWT_REFRESH_SECRET" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/db-password \
  --secret-string "$DB_PASSWORD" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/redis-password \
  --secret-string "$REDIS_PASSWORD" --region $AWS_REGION

# Placeholder for SendGrid — update later
aws secretsmanager create-secret --name annex/prod/sendgrid-api-key \
  --secret-string "REPLACE_ME_WITH_SENDGRID_KEY" --region $AWS_REGION
```

### 3.3 Note the secret ARNs

```bash
for name in jwt-secret jwt-refresh-secret db-password redis-password sendgrid-api-key; do
  arn=$(aws secretsmanager describe-secret --secret-id annex/prod/$name --region $AWS_REGION --query ARN --output text)
  echo "annex/prod/$name → $arn"
done
```

**WRITE DOWN all five ARNs.** They'll go into the ECS task definition.

### ✓ Checkpoint 3

```bash
aws secretsmanager list-secrets --region $AWS_REGION \
  --query "SecretList[?starts_with(Name, 'annex/prod/')].Name" --output text \
  | tr '\t' '\n' | sort | wc -l | grep -q "5" && echo "✓ 5 secrets created"
```

---

## 4. Create the network (VPC + subnets)

We need a VPC with two public subnets (for the load balancer) and two private subnets (for the database, Redis, and ECS tasks). Two of each so we can survive an AZ outage.

### 4.1 Create the VPC

```bash
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=annex-prod-vpc}]' \
  --region $AWS_REGION \
  --query Vpc.VpcId --output text)

echo "VPC_ID=$VPC_ID"

aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
```

**WRITE DOWN** `VPC_ID`.

### 4.2 Create two public subnets (different AZs)

```bash
PUBLIC_SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-public-a}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

PUBLIC_SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-public-b}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

# Auto-assign public IP on launch
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_A --map-public-ip-on-launch --region $AWS_REGION
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_B --map-public-ip-on-launch --region $AWS_REGION

echo "PUBLIC_SUBNET_A=$PUBLIC_SUBNET_A"
echo "PUBLIC_SUBNET_B=$PUBLIC_SUBNET_B"
```

### 4.3 Create two private subnets

```bash
PRIVATE_SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-private-a}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

PRIVATE_SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-private-b}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

echo "PRIVATE_SUBNET_A=$PRIVATE_SUBNET_A"
echo "PRIVATE_SUBNET_B=$PRIVATE_SUBNET_B"
```

**WRITE DOWN all four subnet IDs.**

### 4.4 Create internet gateway (for public subnets)

```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=annex-igw}]' \
  --region $AWS_REGION --query InternetGateway.InternetGatewayId --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $AWS_REGION

# Create public route table
PUBLIC_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=annex-public-rt}]' \
  --region $AWS_REGION --query RouteTable.RouteTableId --output text)

aws ec2 create-route --route-table-id $PUBLIC_RT --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID --region $AWS_REGION

aws ec2 associate-route-table --route-table-id $PUBLIC_RT --subnet-id $PUBLIC_SUBNET_A --region $AWS_REGION
aws ec2 associate-route-table --route-table-id $PUBLIC_RT --subnet-id $PUBLIC_SUBNET_B --region $AWS_REGION
```

### 4.5 Create NAT Gateway (so private subnets can pull Docker images, call SendGrid, etc.)

NAT Gateway costs ~$33/month. It's required for the ECS tasks in private subnets to reach the internet.

```bash
EIP_ID=$(aws ec2 allocate-address --domain vpc --region $AWS_REGION --query AllocationId --output text)

NAT_GW_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_A \
  --allocation-id $EIP_ID \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=annex-nat}]' \
  --region $AWS_REGION --query NatGateway.NatGatewayId --output text)

echo "NAT Gateway $NAT_GW_ID is being created. Wait ~2 minutes."

# Wait for it to become available
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_ID --region $AWS_REGION
echo "✓ NAT Gateway available"

# Create private route table pointing 0.0.0.0/0 → NAT
PRIVATE_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=annex-private-rt}]' \
  --region $AWS_REGION --query RouteTable.RouteTableId --output text)

aws ec2 create-route --route-table-id $PRIVATE_RT --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID --region $AWS_REGION

aws ec2 associate-route-table --route-table-id $PRIVATE_RT --subnet-id $PRIVATE_SUBNET_A --region $AWS_REGION
aws ec2 associate-route-table --route-table-id $PRIVATE_RT --subnet-id $PRIVATE_SUBNET_B --region $AWS_REGION
```

### 4.6 Create security groups

We need four separate security groups: one for the ALB (open to internet), one for ECS tasks, one for RDS, one for Redis.

```bash
# ALB SG — allows HTTPS from anywhere
ALB_SG=$(aws ec2 create-security-group \
  --group-name annex-alb-sg --description "ALB security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION

# ECS tasks SG — allows traffic only from ALB
ECS_SG=$(aws ec2 create-security-group \
  --group-name annex-ecs-sg --description "ECS tasks SG" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 4000 --source-group $ALB_SG --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 3000 --source-group $ALB_SG --region $AWS_REGION

# RDS SG — allows port 5432 from ECS tasks only
RDS_SG=$(aws ec2 create-security-group \
  --group-name annex-rds-sg --description "RDS PostgreSQL SG" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $ECS_SG --region $AWS_REGION

# Redis SG — allows port 6379 from ECS tasks only
REDIS_SG=$(aws ec2 create-security-group \
  --group-name annex-redis-sg --description "ElastiCache SG" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $REDIS_SG \
  --protocol tcp --port 6379 --source-group $ECS_SG --region $AWS_REGION

echo "ALB_SG=$ALB_SG"
echo "ECS_SG=$ECS_SG"
echo "RDS_SG=$RDS_SG"
echo "REDIS_SG=$REDIS_SG"
```

**WRITE DOWN all four security group IDs.**

### ✓ Checkpoint 4

```bash
# All resources should exist
aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $AWS_REGION > /dev/null && echo "✓ VPC"
aws ec2 describe-subnets --subnet-ids $PUBLIC_SUBNET_A $PUBLIC_SUBNET_B $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \
  --region $AWS_REGION > /dev/null && echo "✓ 4 subnets"
aws ec2 describe-nat-gateways --nat-gateway-ids $NAT_GW_ID --region $AWS_REGION \
  --query "NatGateways[0].State" --output text | grep -q "available" && echo "✓ NAT Gateway"
aws ec2 describe-security-groups --group-ids $ALB_SG $ECS_SG $RDS_SG $REDIS_SG \
  --region $AWS_REGION > /dev/null && echo "✓ 4 security groups"
```

---

## 5. Provision the database (RDS PostgreSQL)

### 5.1 Create a DB subnet group

RDS requires its own "subnet group" — a list of subnets it can use. We use the two private subnets.

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name annex-db-subnet-group \
  --db-subnet-group-description "Annex DB subnet group" \
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \
  --region $AWS_REGION
```

### 5.2 Create the RDS instance

This takes 10-15 minutes. **Run it now and continue with section 6 while it provisions.**

```bash
# Pull the password we generated earlier
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id annex/prod/db-password --region $AWS_REGION \
  --query SecretString --output text)

aws rds create-db-instance \
  --db-instance-identifier annex-prod-db \
  --db-instance-class db.t4g.small \
  --engine postgres \
  --engine-version 16.3 \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --master-username annex \
  --master-user-password "$DB_PASSWORD" \
  --db-name annex \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name annex-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --no-publicly-accessible \
  --no-multi-az \
  --auto-minor-version-upgrade \
  --deletion-protection \
  --region $AWS_REGION
```

> Notes:
> - `db.t4g.small` (2 vCPU, 2 GB RAM) is sufficient for hundreds of users. Bump to `db.t4g.medium` later if needed.
> - 20 GB starting storage with `gp3` is fine; RDS will auto-scale up to 1 TB.
> - `--no-multi-az` saves ~$25/mo. **For real production with paying customers, change to `--multi-az`** for AZ failover.
> - `--deletion-protection` prevents accidental termination via the console. Required for production.

### 5.3 Wait for it to become available, then capture the endpoint

```bash
echo "Waiting for RDS to be available (10-15 minutes)..."
aws rds wait db-instance-available --db-instance-identifier annex-prod-db --region $AWS_REGION

DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier annex-prod-db \
  --region $AWS_REGION --query "DBInstances[0].Endpoint.Address" --output text)

echo "DB_ENDPOINT=$DB_ENDPOINT"
```

**WRITE DOWN** `DB_ENDPOINT` — looks like `annex-prod-db.xxxxx.us-east-1.rds.amazonaws.com`.

### 5.4 Build and store the DATABASE_URL

```bash
DATABASE_URL="postgresql://annex:$DB_PASSWORD@$DB_ENDPOINT:5432/annex?schema=public&sslmode=require"

aws secretsmanager create-secret --name annex/prod/database-url \
  --secret-string "$DATABASE_URL" --region $AWS_REGION

DATABASE_URL_ARN=$(aws secretsmanager describe-secret \
  --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

echo "DATABASE_URL_ARN=$DATABASE_URL_ARN"
```

**WRITE DOWN** the ARN.

### ✓ Checkpoint 5

```bash
aws rds describe-db-instances --db-instance-identifier annex-prod-db --region $AWS_REGION \
  --query "DBInstances[0].DBInstanceStatus" --output text | grep -q "available" && echo "✓ RDS available"
```

---

## 6. Provision Redis (ElastiCache)

### 6.1 Create a cache subnet group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name annex-cache-subnet-group \
  --cache-subnet-group-description "Annex Redis subnet group" \
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \
  --region $AWS_REGION
```

### 6.2 Create the Redis cluster

ElastiCache Redis with auth token (password) requires *replication groups* (not the simpler "cache cluster").

```bash
REDIS_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id annex/prod/redis-password --region $AWS_REGION \
  --query SecretString --output text)

aws elasticache create-replication-group \
  --replication-group-id annex-redis \
  --replication-group-description "Annex Redis prod" \
  --engine redis \
  --engine-version 7.1 \
  --cache-node-type cache.t4g.micro \
  --num-cache-clusters 1 \
  --cache-subnet-group-name annex-cache-subnet-group \
  --security-group-ids $REDIS_SG \
  --transit-encryption-enabled \
  --auth-token "$REDIS_PASSWORD" \
  --automatic-failover-enabled false \
  --region $AWS_REGION
```

> For production with paying customers, change `--num-cache-clusters 2` and `--automatic-failover-enabled true` for failover. Costs an extra $13/mo.

### 6.3 Wait, then capture the endpoint

```bash
echo "Waiting for Redis (5-8 minutes)..."
aws elasticache wait replication-group-available \
  --replication-group-id annex-redis --region $AWS_REGION

REDIS_ENDPOINT=$(aws elasticache describe-replication-groups \
  --replication-group-id annex-redis --region $AWS_REGION \
  --query "ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address" --output text)

echo "REDIS_ENDPOINT=$REDIS_ENDPOINT"

# Build the URL — note rediss:// (with double-s) for TLS
REDIS_URL="rediss://:$REDIS_PASSWORD@$REDIS_ENDPOINT:6379"

aws secretsmanager create-secret --name annex/prod/redis-url \
  --secret-string "$REDIS_URL" --region $AWS_REGION

REDIS_URL_ARN=$(aws secretsmanager describe-secret \
  --secret-id annex/prod/redis-url --region $AWS_REGION --query ARN --output text)

echo "REDIS_URL_ARN=$REDIS_URL_ARN"
```

**WRITE DOWN** `REDIS_ENDPOINT` and `REDIS_URL_ARN`.

### ✓ Checkpoint 6

```bash
aws elasticache describe-replication-groups --replication-group-id annex-redis --region $AWS_REGION \
  --query "ReplicationGroups[0].Status" --output text | grep -q "available" && echo "✓ Redis available"
```

---

## 7. Provision OpenSearch (managed Elasticsearch)

OpenSearch is AWS's fork of Elasticsearch. It's API-compatible with the version our app uses, so it works as a drop-in.

> If cost is a concern, you can skip OpenSearch — the app falls back to Postgres for search automatically. To skip, leave `ELASTICSEARCH_URL` blank in the ECS task definition. You can add OpenSearch later without code changes.

### 7.1 Create the domain

This takes 15-20 minutes. **Run it now and move on.**

```bash
aws opensearch create-domain \
  --domain-name annex-search \
  --engine-version "OpenSearch_2.13" \
  --cluster-config "InstanceType=t3.small.search,InstanceCount=1" \
  --ebs-options "EBSEnabled=true,VolumeType=gp3,VolumeSize=20" \
  --vpc-options "SubnetIds=$PRIVATE_SUBNET_A,SecurityGroupIds=$ECS_SG" \
  --node-to-node-encryption-options "Enabled=true" \
  --encryption-at-rest-options "Enabled=true" \
  --domain-endpoint-options "EnforceHTTPS=true,TLSSecurityPolicy=Policy-Min-TLS-1-2-2019-07" \
  --advanced-security-options 'Enabled=false' \
  --region $AWS_REGION
```

### 7.2 Wait and capture the endpoint

```bash
echo "Waiting for OpenSearch (15-20 minutes)..."
while true; do
  STATUS=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION \
    --query "DomainStatus.Processing" --output text)
  if [ "$STATUS" = "False" ]; then break; fi
  echo "  still processing..."
  sleep 60
done

OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION \
  --query "DomainStatus.Endpoints.vpc" --output text)

echo "OPENSEARCH_ENDPOINT=$OPENSEARCH_ENDPOINT"
echo "ELASTICSEARCH_URL=https://$OPENSEARCH_ENDPOINT"
```

**WRITE DOWN** the OpenSearch endpoint.

> Note: Because we configured the domain inside the VPC and reused the ECS security group, only ECS tasks can talk to it. The endpoint is not reachable from the internet — that's intentional.

### ✓ Checkpoint 7

```bash
aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION \
  --query "DomainStatus.Processing" --output text | grep -q "False" && echo "✓ OpenSearch ready"
```

---

## 8. Provision S3 for uploads

### 8.1 Create the bucket

```bash
BUCKET_NAME="annex-documents-prod-$AWS_ACCOUNT_ID"

aws s3api create-bucket --bucket $BUCKET_NAME --region $AWS_REGION \
  $(if [ "$AWS_REGION" != "us-east-1" ]; then echo "--create-bucket-configuration LocationConstraint=$AWS_REGION"; fi)

# Block all public access
aws s3api put-public-access-block --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning (in case files get accidentally deleted)
aws s3api put-bucket-versioning --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

echo "BUCKET_NAME=$BUCKET_NAME"
```

**WRITE DOWN** the bucket name.

### 8.2 Create an IAM user for S3 access

The ECS task role will get S3 access via IAM policy (cleaner). But for first-run testing it's simpler to use access keys. We'll create both — use access keys for the initial bring-up, then switch to IAM roles in step 11.

```bash
aws iam create-user --user-name annex-prod-s3-user

aws iam create-access-key --user-name annex-prod-s3-user
```

The output:

```json
{
    "AccessKey": {
        "UserName": "annex-prod-s3-user",
        "AccessKeyId": "AKIA....",
        "SecretAccessKey": "...."
    }
}
```

**WRITE DOWN** both `AccessKeyId` and `SecretAccessKey`.

```bash
# Attach S3 policy
cat > /tmp/s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
    "Resource": ["arn:aws:s3:::$BUCKET_NAME","arn:aws:s3:::$BUCKET_NAME/*"]
  }]
}
EOF

aws iam put-user-policy --user-name annex-prod-s3-user \
  --policy-name annex-s3-access \
  --policy-document file:///tmp/s3-policy.json
```

### 8.3 Store S3 credentials

```bash
# Replace ACCESS_KEY_ID and SECRET below with the values from step 8.2
read -p "Paste S3 Access Key ID: " S3_ACCESS_KEY
read -sp "Paste S3 Secret Key: " S3_SECRET_KEY
echo

aws secretsmanager create-secret --name annex/prod/s3-access-key \
  --secret-string "$S3_ACCESS_KEY" --region $AWS_REGION
aws secretsmanager create-secret --name annex/prod/s3-secret-key \
  --secret-string "$S3_SECRET_KEY" --region $AWS_REGION
```

### ✓ Checkpoint 8

```bash
aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -qv "NoSuchBucket" && echo "✓ S3 bucket reachable"
```

---

## 9. Build and push Docker images to ECR

### 9.1 Create ECR repositories

```bash
aws ecr create-repository --repository-name annex/api --region $AWS_REGION
aws ecr create-repository --repository-name annex/web --region $AWS_REGION
```

### 9.2 Authenticate Docker to ECR

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

You should see `Login Succeeded`.

### 9.3 Extract the source code

```bash
cd ~
unzip annex-workforce.zip
cd annex-workforce
```

### 9.4 Build and push the API image

```bash
# Tag with both 'latest' and a git-sha-style version for rollback
VERSION=$(date +%Y%m%d-%H%M%S)
ECR_API_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api

docker build --platform linux/amd64 -t annex/api:$VERSION -f apps/api/Dockerfile apps/api

docker tag annex/api:$VERSION $ECR_API_URI:$VERSION
docker tag annex/api:$VERSION $ECR_API_URI:latest

docker push $ECR_API_URI:$VERSION
docker push $ECR_API_URI:latest

echo "API image: $ECR_API_URI:$VERSION"
```

> The `--platform linux/amd64` flag is **critical if you're on an Apple Silicon Mac.** Without it, you'll build an arm64 image that won't run on Fargate (which uses x86_64 by default), and the deploy will silently fail.

### 9.5 Build and push the web image

The web image is special because Next.js bakes `NEXT_PUBLIC_*` values into the bundle at build time. So we need to pass the production API URL as a build argument:

```bash
ECR_WEB_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/web

docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.annexworkforce.com \
  -t annex/web:$VERSION -f apps/web/Dockerfile apps/web

docker tag annex/web:$VERSION $ECR_WEB_URI:$VERSION
docker tag annex/web:$VERSION $ECR_WEB_URI:latest

docker push $ECR_WEB_URI:$VERSION
docker push $ECR_WEB_URI:latest

echo "Web image: $ECR_WEB_URI:$VERSION"
```

**WRITE DOWN both image URIs** (with the version tag, not just `latest`).

### ✓ Checkpoint 9

```bash
aws ecr describe-images --repository-name annex/api --region $AWS_REGION \
  --query "imageDetails[].imageTags[]" --output text | grep -q "latest" && echo "✓ API image pushed"
aws ecr describe-images --repository-name annex/web --region $AWS_REGION \
  --query "imageDetails[].imageTags[]" --output text | grep -q "latest" && echo "✓ Web image pushed"
```

---

## 10. Run database migrations

The schema doesn't exist yet. Before any app starts, we need to create the tables. We'll do this with a one-off ECS task.

### 10.1 Create a CloudWatch log group

```bash
aws logs create-log-group --log-group-name /ecs/annex-prod --region $AWS_REGION
aws logs put-retention-policy --log-group-name /ecs/annex-prod --retention-in-days 30 --region $AWS_REGION
```

### 10.2 Create the ECS task execution role

This role lets ECS pull from ECR and read secrets:

```bash
cat > /tmp/ecs-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role --role-name annex-ecs-execution-role \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json

aws iam attach-role-policy --role-name annex-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Custom policy for Secrets Manager access
cat > /tmp/secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:annex/prod/*"
  }]
}
EOF

aws iam put-role-policy --role-name annex-ecs-execution-role \
  --policy-name annex-secrets-access \
  --policy-document file:///tmp/secrets-policy.json

EXECUTION_ROLE_ARN=$(aws iam get-role --role-name annex-ecs-execution-role \
  --query Role.Arn --output text)

echo "EXECUTION_ROLE_ARN=$EXECUTION_ROLE_ARN"

# IAM changes can take a few seconds to propagate
sleep 10
```

**WRITE DOWN** `EXECUTION_ROLE_ARN`.

### 10.3 Create ECS cluster

```bash
aws ecs create-cluster --cluster-name annex-prod \
  --capacity-providers FARGATE --region $AWS_REGION
```

### 10.4 Register a one-off migration task

```bash
# Look up the secret ARNs again (or paste from your notebook)
DATABASE_URL_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

cat > /tmp/migration-task.json <<EOF
{
  "family": "annex-api-migrate",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [{
    "name": "migrate",
    "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api:latest",
    "essential": true,
    "command": ["sh", "-c", "npx prisma migrate deploy && npx ts-node prisma/seed.ts"],
    "secrets": [
      {"name": "DATABASE_URL", "valueFrom": "$DATABASE_URL_ARN"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/annex-prod",
        "awslogs-region": "$AWS_REGION",
        "awslogs-stream-prefix": "migrate"
      }
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/migration-task.json --region $AWS_REGION
```

### 10.5 Run the migration task

```bash
TASK_ARN=$(aws ecs run-task \
  --cluster annex-prod \
  --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --region $AWS_REGION \
  --query "tasks[0].taskArn" --output text)

echo "Task started: $TASK_ARN"
```

### 10.6 Watch logs and wait for completion

```bash
TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')

echo "Waiting for migration to complete..."
aws ecs wait tasks-stopped --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION

# Check exit code
EXIT_CODE=$(aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].containers[0].exitCode" --output text)

echo "Migration exit code: $EXIT_CODE"

# Print logs
aws logs tail /ecs/annex-prod --log-stream-name-prefix migrate/migrate/$TASK_ID --region $AWS_REGION
```

If `EXIT_CODE` is `0`, migration succeeded. If anything else, see [§ 14.3](#143-migration-task-failed).

### ✓ Checkpoint 10

The migration log should end with `✅ Seed complete`. If you see that line, the database has tables, demo data, and is ready.

```bash
test "$EXIT_CODE" = "0" && echo "✓ Database migrated and seeded"
```

---

## 11. Create the ECS cluster and services

Now we register the long-running task definitions for the API and web app, then create services that keep them running.

### 11.1 Register the API task definition

```bash
# Look up all secret ARNs
JWT_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/jwt-secret --region $AWS_REGION --query ARN --output text)
JWT_REFRESH_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/jwt-refresh-secret --region $AWS_REGION --query ARN --output text)
REDIS_URL_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/redis-url --region $AWS_REGION --query ARN --output text)
S3_ACCESS_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-access-key --region $AWS_REGION --query ARN --output text)
S3_SECRET_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-secret-key --region $AWS_REGION --query ARN --output text)
SENDGRID_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/sendgrid-api-key --region $AWS_REGION --query ARN --output text)
DATABASE_URL_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

# Look up other resource values
OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION --query "DomainStatus.Endpoints.vpc" --output text)
BUCKET_NAME="annex-documents-prod-$AWS_ACCOUNT_ID"

cat > /tmp/api-task.json <<EOF
{
  "family": "annex-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [{
    "name": "api",
    "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api:latest",
    "essential": true,
    "portMappings": [{"containerPort": 4000, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "API_PORT", "value": "4000"},
      {"name": "API_HOST", "value": "0.0.0.0"},
      {"name": "ALLOWED_ORIGINS", "value": "https://app.annexworkforce.com"},
      {"name": "ELASTICSEARCH_URL", "value": "https://$OPENSEARCH_ENDPOINT"},
      {"name": "S3_BUCKET", "value": "$BUCKET_NAME"},
      {"name": "S3_REGION", "value": "$AWS_REGION"},
      {"name": "S3_FORCE_PATH_STYLE", "value": "false"},
      {"name": "JWT_ACCESS_TTL", "value": "15m"},
      {"name": "JWT_REFRESH_TTL", "value": "7d"},
      {"name": "SENDGRID_FROM_EMAIL", "value": "noreply@annexworkforce.com"},
      {"name": "NEXT_PUBLIC_API_URL", "value": "https://app.annexworkforce.com"}
    ],
    "secrets": [
      {"name": "DATABASE_URL", "valueFrom": "$DATABASE_URL_ARN"},
      {"name": "REDIS_URL", "valueFrom": "$REDIS_URL_ARN"},
      {"name": "JWT_SECRET", "valueFrom": "$JWT_SECRET_ARN"},
      {"name": "JWT_REFRESH_SECRET", "valueFrom": "$JWT_REFRESH_SECRET_ARN"},
      {"name": "S3_ACCESS_KEY", "valueFrom": "$S3_ACCESS_KEY_ARN"},
      {"name": "S3_SECRET_KEY", "valueFrom": "$S3_SECRET_KEY_ARN"},
      {"name": "SENDGRID_API_KEY", "valueFrom": "$SENDGRID_KEY_ARN"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/annex-prod",
        "awslogs-region": "$AWS_REGION",
        "awslogs-stream-prefix": "api"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -q --spider http://localhost:4000/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 45
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/api-task.json --region $AWS_REGION
```

### 11.2 Register the web task definition

```bash
cat > /tmp/web-task.json <<EOF
{
  "family": "annex-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [{
    "name": "web",
    "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/web:latest",
    "essential": true,
    "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
    "environment": [
      {"name": "NODE_ENV", "value": "production"},
      {"name": "PORT", "value": "3000"},
      {"name": "HOSTNAME", "value": "0.0.0.0"},
      {"name": "NEXT_PUBLIC_API_URL", "value": "https://api.annexworkforce.com"},
      {"name": "NEXT_PUBLIC_APP_NAME", "value": "Annex Workforce"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/annex-prod",
        "awslogs-region": "$AWS_REGION",
        "awslogs-stream-prefix": "web"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "wget -q --spider http://localhost:3000/ || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 30
    }
  }]
}
EOF

aws ecs register-task-definition --cli-input-json file:///tmp/web-task.json --region $AWS_REGION
```

### ✓ Checkpoint 11.A

```bash
aws ecs describe-task-definition --task-definition annex-api --region $AWS_REGION > /dev/null && echo "✓ API task def registered"
aws ecs describe-task-definition --task-definition annex-web --region $AWS_REGION > /dev/null && echo "✓ Web task def registered"
```

We'll create the actual services in step 12 after the load balancer exists.

---

## 12. Configure the ALB, DNS, and TLS

### 12.1 Verify the ACM certificate has been issued

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.Status" --output text
```

Must show `ISSUED`. If `PENDING_VALIDATION`, wait for DNS to propagate from step 2.1. **Don't proceed until status is `ISSUED`.**

### 12.2 Create the Application Load Balancer

```bash
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name annex-alb \
  --subnets $PUBLIC_SUBNET_A $PUBLIC_SUBNET_B \
  --security-groups $ALB_SG \
  --type application \
  --scheme internet-facing \
  --region $AWS_REGION \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $AWS_REGION \
  --query "LoadBalancers[0].DNSName" --output text)

ALB_HOSTED_ZONE=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $AWS_REGION \
  --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)

echo "ALB_ARN=$ALB_ARN"
echo "ALB_DNS=$ALB_DNS"
echo "ALB_HOSTED_ZONE=$ALB_HOSTED_ZONE"
```

**WRITE DOWN** all three.

### 12.3 Create target groups

```bash
# API target group (port 4000)
API_TG_ARN=$(aws elbv2 create-target-group \
  --name annex-api-tg \
  --protocol HTTP --port 4000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query "TargetGroups[0].TargetGroupArn" --output text)

# Web target group (port 3000)
WEB_TG_ARN=$(aws elbv2 create-target-group \
  --name annex-web-tg \
  --protocol HTTP --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
  --query "TargetGroups[0].TargetGroupArn" --output text)

echo "API_TG_ARN=$API_TG_ARN"
echo "WEB_TG_ARN=$WEB_TG_ARN"
```

### 12.4 Create HTTPS listener

```bash
# HTTPS listener — defaults to web target group
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN \
  --region $AWS_REGION \
  --query "Listeners[0].ListenerArn" --output text)

# Add rule: api.annexworkforce.com → API target group
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 100 \
  --conditions Field=host-header,Values=api.annexworkforce.com \
  --actions Type=forward,TargetGroupArn=$API_TG_ARN \
  --region $AWS_REGION

# HTTP listener — redirect to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region $AWS_REGION
```

### 12.5 Point DNS records at the ALB

```bash
cat > /tmp/dns-records.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.annexworkforce.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$ALB_HOSTED_ZONE",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.annexworkforce.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$ALB_HOSTED_ZONE",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/dns-records.json
```

### 12.6 Create the ECS services

Now wire ECS to the ALB:

```bash
# API service
aws ecs create-service \
  --cluster annex-prod \
  --service-name annex-api \
  --task-definition annex-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$API_TG_ARN,containerName=api,containerPort=4000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},minimumHealthyPercent=50,maximumPercent=200" \
  --region $AWS_REGION

# Web service
aws ecs create-service \
  --cluster annex-prod \
  --service-name annex-web \
  --task-definition annex-web \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$WEB_TG_ARN,containerName=web,containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},minimumHealthyPercent=50,maximumPercent=200" \
  --region $AWS_REGION
```

> The deployment circuit breaker is important — it will automatically roll back a deploy if the new tasks fail to become healthy. This prevents you from leaving a broken version in production while you're sleeping.

### 12.7 Wait for services to be stable

This takes 3-5 minutes. The ECS scheduler is pulling images, starting containers, waiting for health checks, and registering with the ALB.

```bash
echo "Waiting for API service..."
aws ecs wait services-stable --cluster annex-prod --services annex-api --region $AWS_REGION

echo "Waiting for web service..."
aws ecs wait services-stable --cluster annex-prod --services annex-web --region $AWS_REGION

echo "✓ Both services stable"
```

If either wait command fails or times out, see [§ 14.4](#144-ecs-service-wont-stabilize).

### ✓ Checkpoint 12

```bash
# Both services should show running count = desired count
aws ecs describe-services --cluster annex-prod --services annex-api annex-web --region $AWS_REGION \
  --query "services[].{name:serviceName,desired:desiredCount,running:runningCount}" --output table
```

You should see both services with `desired=2` and `running=2`.

---

## 13. Smoke test + go live

### 13.1 Verify health endpoints

```bash
# May take 30-60 seconds for DNS to propagate to your machine after step 12.5
sleep 30

curl -i https://api.annexworkforce.com/health
```

Expected:

```
HTTP/2 200
content-type: application/json
{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
```

```bash
curl -I https://app.annexworkforce.com/
```

Expected: `HTTP/2 200`.

### 13.2 Verify Swagger docs are reachable

Open in browser: `https://api.annexworkforce.com/docs`

You should see the Swagger UI with all endpoints listed.

### 13.3 Test login with seeded admin

```bash
curl -X POST https://api.annexworkforce.com/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@annexworkforce.com","password":"Admin@12345"}'
```

You should get a response with `accessToken`, `refreshToken`, and `user`.

### 13.4 Test the web app end-to-end

In a browser:

1. Open `https://app.annexworkforce.com` — you should see the landing page.
2. Click **Sign in** → use `candidate@example.com` / `Pass@1234`.
3. You should land on `/dashboard` with the candidate dashboard.
4. Click **Find jobs** — you should see one published job.

### 13.5 Critical: change the demo passwords

The seed data created accounts with public passwords. Change them immediately:

```bash
# Connect to the DB through a temporary container (the DB is in a private subnet)
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id annex/prod/db-password --region $AWS_REGION --query SecretString --output text)

# Run a one-off task that connects to the DB and updates passwords
# (or use bastion host approach below)
```

A simpler way: log into the app as `admin@annexworkforce.com` and use the user management UI to suspend the demo accounts. Or change them via a one-off ECS task using `npx prisma studio`. Or use a bastion host:

```bash
# Launch a small EC2 instance in the public subnet with the same VPC
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.micro \
  --subnet-id $PUBLIC_SUBNET_A \
  --security-group-ids $ALB_SG \
  --key-name <YOUR_SSH_KEY_NAME> \
  --region $AWS_REGION
# SSH in, run psql, update passwords. Terminate when done.
```

For an MVP without real users yet, simply log in as admin and suspend or delete the demo accounts via the admin UI at `/admin/users`.

### 13.6 Verify logging works

```bash
aws logs tail /ecs/annex-prod --follow --region $AWS_REGION
```

You should see log lines from both services. Press Ctrl+C to stop.

### ✓ Checkpoint 13 — you are live

If all of 13.1-13.4 passed, **Annex Workforce is now in production.** Take a screenshot. Send it to the team. Take a break.

---

## 14. Troubleshooting

### 14.1 ACM certificate stuck in `PENDING_VALIDATION`

**Cause:** DNS hasn't propagated, or the validation CNAME record is wrong.

**Fix:**

```bash
# Verify DNS resolution from outside AWS
dig CNAME _abc123.annexworkforce.com +short

# If empty, your nameservers haven't propagated. Wait, or check at your registrar.

# Verify the validation record matches what ACM expects
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions"

# Look at "ValidationStatus" and "ResourceRecord" fields. The ResourceRecord should
# match what's in your Route 53 hosted zone.
```

### 14.2 Cannot push Docker image — `denied: Your authorization token has expired`

ECR auth tokens last 12 hours. Re-authenticate:

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 14.3 Migration task failed

Pull the logs:

```bash
aws logs filter-log-events --log-group-name /ecs/annex-prod \
  --log-stream-name-prefix migrate --region $AWS_REGION \
  --query "events[].message" --output text
```

**Common causes and fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `connect ECONNREFUSED` | DB not reachable | Check RDS security group allows ECS SG on 5432; check DB is `available` |
| `password authentication failed` | Wrong password in DATABASE_URL | Recreate `annex/prod/database-url` with correct password |
| `The server's certificate is not trusted` | SSL config | Ensure the URL has `?sslmode=require` (already in our template) |
| `relation "_prisma_migrations" already exists` | Re-running on already-migrated DB | Safe to ignore — Prisma is idempotent. Or remove `--force` if you ran reset. |
| Migration succeeds but seed errors with `Unique constraint failed on the fields: (email)` | Seed already ran | Safe to ignore — seed uses `upsert`, this is from a transient race. |

If migration fails, **fix the cause and re-run step 10.5.** Don't proceed until exit code is 0.

### 14.4 ECS service won't stabilize

Symptom: `aws ecs wait services-stable` hangs for 10+ minutes, or tasks keep stopping.

**Step 1: Check service events:**

```bash
aws ecs describe-services --cluster annex-prod --services annex-api --region $AWS_REGION \
  --query "services[0].events[0:5]" --output table
```

**Step 2: Check why the most recent task stopped:**

```bash
TASK_ARN=$(aws ecs list-tasks --cluster annex-prod --service-name annex-api --desired-status STOPPED --region $AWS_REGION \
  --query "taskArns[0]" --output text)

aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].{stoppedReason:stoppedReason,exitCode:containers[0].exitCode,reason:containers[0].reason}"
```

**Common cases:**

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `CannotPullContainerError` | ECR auth or wrong image tag | Verify image exists: `aws ecr describe-images --repository-name annex/api` |
| `ResourceInitializationError: unable to pull secrets` | Execution role missing Secrets Manager perms | Re-run the IAM policy in 10.2 |
| `Task failed ELB health checks` | App is starting but `/health` not responding fast enough | Increase `healthCheckGracePeriodSeconds` to 120 |
| `exited with code 1` immediately | App crash on startup | See container logs (next item) |

**Step 3: Read the container's stdout:**

```bash
aws logs tail /ecs/annex-prod --log-stream-name-prefix api/api/$(echo $TASK_ARN | awk -F'/' '{print $NF}') \
  --region $AWS_REGION
```

You'll likely see the actual NestJS error. The most common ones:

- `Cannot find module '@prisma/client'` → Prisma client not generated during build. Re-run `docker build` and verify the Dockerfile runs `npx prisma generate`.
- `JWT_SECRET is required` → Secret didn't load. Verify the secret exists and the execution role can read it.
- `connect ECONNREFUSED 127.0.0.1:5432` → App is using the wrong DATABASE_URL. Check the secret value: `aws secretsmanager get-secret-value --secret-id annex/prod/database-url`

After fixing any environment or task definition issue, you must register a new task definition revision and update the service:

```bash
# Re-register
aws ecs register-task-definition --cli-input-json file:///tmp/api-task.json --region $AWS_REGION

# Force new deploy
aws ecs update-service --cluster annex-prod --service annex-api \
  --task-definition annex-api --force-new-deployment --region $AWS_REGION
```

### 14.5 Health check timeouts

If you see ALB target group showing all targets `unhealthy`:

```bash
aws elbv2 describe-target-health --target-group-arn $API_TG_ARN --region $AWS_REGION \
  --query "TargetHealthDescriptions[].{ip:Target.Id,state:TargetHealth.State,reason:TargetHealth.Reason}" \
  --output table
```

**Common reasons:**

- `Target.FailedHealthChecks` with reason `Health checks failed` → The app is running but `/health` is returning non-2xx. Check container logs.
- `Target.Timeout` → The container is slow to start. Increase `healthCheckGracePeriodSeconds` on the service.
- `Target.NotRegistered` → ECS hasn't registered the IP with the TG yet. Wait 60 seconds.

### 14.6 ALB returns 502 / 503

- **502 Bad Gateway** = ALB connected to target but got an invalid response. Usually the app crashed mid-request. Check container logs.
- **503 Service Unavailable** = No healthy targets. See 14.5.
- **504 Gateway Timeout** = App is too slow. Check DB connection (RDS in different AZ?), or scale up CPU.

### 14.7 The web app loads but API calls fail with CORS errors

Check the `ALLOWED_ORIGINS` env var on the API task. It must exactly match the web app's origin, including https://. After fixing:

```bash
# Re-register task def with corrected ALLOWED_ORIGINS, then:
aws ecs update-service --cluster annex-prod --service annex-api \
  --task-definition annex-api --force-new-deployment --region $AWS_REGION
```

### 14.8 Connection pool errors after high traffic

`PrismaClientKnownRequestError: Too many connections` means RDS hit max_connections (default 80 on `db.t4g.small`).

**Quick fix:** Scale RDS up to `db.t4g.medium` (300 max connections):

```bash
aws rds modify-db-instance --db-instance-identifier annex-prod-db \
  --db-instance-class db.t4g.medium --apply-immediately --region $AWS_REGION
```

**Long-term fix:** Add a connection pooler (PgBouncer, or Prisma Accelerate, or RDS Proxy).

---

## 15. Day-2: deploys, rollbacks, monitoring, backups

### 15.1 Deploying a code change

The complete deploy script for an existing engineer:

```bash
#!/usr/bin/env bash
# save as: scripts/deploy.sh
set -euo pipefail

VERSION=$(git rev-parse --short HEAD)
ECR_API_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api
ECR_WEB_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/web

echo "→ Logging into ECR"
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "→ Building images"
docker build --platform linux/amd64 -t $ECR_API_URI:$VERSION -f apps/api/Dockerfile apps/api
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.annexworkforce.com \
  -t $ECR_WEB_URI:$VERSION -f apps/web/Dockerfile apps/web

echo "→ Pushing images"
docker tag $ECR_API_URI:$VERSION $ECR_API_URI:latest
docker tag $ECR_WEB_URI:$VERSION $ECR_WEB_URI:latest
docker push $ECR_API_URI:$VERSION
docker push $ECR_API_URI:latest
docker push $ECR_WEB_URI:$VERSION
docker push $ECR_WEB_URI:latest

# Run migrations if there are new ones (idempotent — safe to always run)
echo "→ Running migrations"
aws ecs run-task --cluster annex-prod --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --region $AWS_REGION > /tmp/migrate-task.json

MIGRATE_TASK=$(jq -r '.tasks[0].taskArn' /tmp/migrate-task.json)
aws ecs wait tasks-stopped --cluster annex-prod --tasks $MIGRATE_TASK --region $AWS_REGION
EXIT=$(aws ecs describe-tasks --cluster annex-prod --tasks $MIGRATE_TASK --region $AWS_REGION \
  --query "tasks[0].containers[0].exitCode" --output text)
if [ "$EXIT" != "0" ]; then
  echo "✗ Migration failed with exit code $EXIT"
  exit 1
fi

echo "→ Deploying services"
aws ecs update-service --cluster annex-prod --service annex-api --force-new-deployment --region $AWS_REGION > /dev/null
aws ecs update-service --cluster annex-prod --service annex-web --force-new-deployment --region $AWS_REGION > /dev/null

echo "→ Waiting for stable deploy"
aws ecs wait services-stable --cluster annex-prod --services annex-api annex-web --region $AWS_REGION

echo "✓ Deployed version $VERSION"
```

### 15.2 Rolling back

If a deploy goes bad and the circuit breaker doesn't catch it:

```bash
# Find the previous task definition revision
aws ecs list-task-definitions --family-prefix annex-api --status ACTIVE \
  --sort DESC --max-items 5 --region $AWS_REGION

# Roll back to a specific revision (e.g. annex-api:42)
aws ecs update-service --cluster annex-prod --service annex-api \
  --task-definition annex-api:42 --region $AWS_REGION

# Wait for rollback to complete
aws ecs wait services-stable --cluster annex-prod --services annex-api --region $AWS_REGION
```

**Schema rollbacks are different.** Prisma migrations are forward-only by default. If a migration causes an issue:

1. **Don't run `prisma migrate reset`** in production — it drops everything.
2. Write a *new* migration that reverts the change manually.
3. Deploy that as a normal forward migration.

This is why **every schema change should be backwards-compatible** with the previous code version (e.g., add nullable columns first, then deploy app code that uses them, then make non-nullable in a follow-up migration).

### 15.3 Monitoring + alerts

Create CloudWatch alarms for the things that matter:

```bash
# Alert on ALB 5xx rate > 1%
aws cloudwatch put-metric-alarm \
  --alarm-name annex-alb-5xx \
  --alarm-description "ALB 5xx rate exceeds 1%" \
  --metric-name HTTPCode_ELB_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum --period 300 --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=LoadBalancer,Value=$(echo $ALB_ARN | awk -F'/' '{print $2"/"$3"/"$4}') \
  --region $AWS_REGION

# Alert on RDS CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name annex-rds-cpu \
  --metric-name CPUUtilization --namespace AWS/RDS \
  --statistic Average --period 300 --threshold 80 \
  --comparison-operator GreaterThanThreshold --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=annex-prod-db \
  --region $AWS_REGION

# Alert on ECS task count below desired
aws cloudwatch put-metric-alarm \
  --alarm-name annex-api-low-tasks \
  --metric-name RunningTaskCount --namespace ECS/ContainerInsights \
  --statistic Average --period 300 --threshold 2 \
  --comparison-operator LessThanThreshold --evaluation-periods 2 \
  --dimensions Name=ClusterName,Value=annex-prod Name=ServiceName,Value=annex-api \
  --region $AWS_REGION
```

For each alarm, attach an SNS topic that notifies your on-call (Slack, PagerDuty, email):

```bash
SNS_TOPIC_ARN=$(aws sns create-topic --name annex-prod-alerts --region $AWS_REGION --query TopicArn --output text)
aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint oncall@yourcompany.com --region $AWS_REGION
# Then: aws cloudwatch put-metric-alarm ... --alarm-actions $SNS_TOPIC_ARN
```

For application-level errors, install Sentry. Add to `apps/api/src/main.ts`:

```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
```

Add `@sentry/node` to package.json, store `SENTRY_DSN` in Secrets Manager, plumb through to the task definition.

### 15.4 Backups + disaster recovery

**RDS backups:**
- Automated daily backups + point-in-time recovery is on by default (you set `--backup-retention-period 7` in step 5.2).
- For extra safety, enable cross-region snapshots: `aws rds modify-db-instance --db-instance-identifier annex-prod-db --copy-tags-to-snapshot --region $AWS_REGION`
- Manually snapshot before risky migrations: `aws rds create-db-snapshot --db-instance-identifier annex-prod-db --db-snapshot-identifier pre-deploy-$(date +%Y%m%d) --region $AWS_REGION`

**S3 versioning:**
- Already enabled in step 8.1. Deleted files can be recovered from the version history.

**Secrets:**
- Secrets Manager keeps the last 100 versions. Easy to recover an accidentally-overwritten secret.

**Practice your restore:**
- Once a quarter, restore the latest snapshot to a temporary RDS instance and verify data integrity. A backup you've never restored is not a backup.

### 15.5 Cost optimization (after launch)

Once you've been running for a month and have usage data:

- Buy **Compute Savings Plans** for ECS Fargate (1-year, no upfront, ~30% off): https://console.aws.amazon.com/cost-management/home#/savings-plans
- Buy **RDS Reserved Instances** if you'll keep the same DB size for a year (~40% off).
- Move OpenSearch to a Reserved Instance after validating sizing.

### 15.6 Production hardening checklist

Things to do **after** the initial deploy is stable, before onboarding real customers:

- [ ] Enable Multi-AZ on RDS (`--multi-az`) — survives AZ outage
- [ ] Enable Multi-AZ on ElastiCache — survives AZ outage
- [ ] Set up WAF on the ALB to block common attack patterns
- [ ] Enable VPC Flow Logs for forensics
- [ ] Enable AWS GuardDuty for security monitoring
- [ ] Enable AWS CloudTrail for API audit logs
- [ ] Set up automatic patching: RDS automatic minor version upgrades (already enabled)
- [ ] Document the on-call rotation and escalation path
- [ ] Run a load test (k6, Locust) to find your real capacity ceiling
- [ ] Set up a staging environment that mirrors prod (one task each, smaller DB)
- [ ] Set up CI/CD (GitHub Actions, CodePipeline) to automate deploys

---

## What's not in this guide

- **Kubernetes (EKS):** This guide uses ECS Fargate, which is simpler for a 2-service app. EKS is appropriate if you'll have 10+ services, need finer scheduling control, or your team already runs K8s.
- **Terraform:** All AWS resources here can and should be moved to Terraform once stable. Do that *after* the manual deploy works — it's much easier to import working resources than to debug a failing Terraform run.
- **Multi-region:** This is a single-region deploy. Multi-region adds substantial complexity (RDS replicas, S3 cross-region replication, Route 53 latency-based routing). Don't do it until you have customers in multiple geographies AND the latency hurts.
- **CDN:** CloudFront in front of the web app would speed up first-paint globally. Not strictly required for launch but recommended within the first month.

---

## Sign-off

When you complete this guide, you should have:

- [ ] A live production deployment at `https://app.annexworkforce.com`
- [ ] A working API at `https://api.annexworkforce.com` with Swagger docs
- [ ] All secrets in AWS Secrets Manager (no plaintext anywhere)
- [ ] Logs flowing to CloudWatch
- [ ] Alarms set up for ALB 5xx, RDS CPU, and ECS task count
- [ ] A documented deploy script you can run with one command
- [ ] Demo passwords changed or accounts disabled
- [ ] Your `~/annex-deploy-notebook.txt` complete with all ARNs, IDs, and endpoints

If any of these are missing, go back and finish them. Then update this document with anything that didn't match reality — every production deploy is slightly different, and the next person will thank you.
