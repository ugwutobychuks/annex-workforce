# Step-by-Step Deployment Guide for Beginners

**Who this is for:** A junior IT admin who has an AWS account with admin permissions but has **never deployed an application to AWS before**. If you've used the AWS Console to maybe create an EC2 instance once, you're our target reader.

**What you'll have at the end:** A live website at `https://app.annexworkforce.com` and an API at `https://api.annexworkforce.com`, running on AWS. Real users can sign up, post jobs, apply, and use every feature.

**How long this takes:** Plan for **two full working days** the first time. Day 1: infrastructure (about 5 hours, mostly waiting for things to provision). Day 2: deploy the apps and test (about 3 hours).

**How much this costs:** About **$180–250/month** for the infrastructure described. You can shut it down anytime by deleting the resources.

---

## Before you start: read this carefully

This guide is **opinionated**. It tells you exactly which buttons to click and which commands to run, in a specific order. **Don't skip steps.** Don't substitute "I'll come back to this later." Each step depends on the ones before it.

If you get stuck, **go to the troubleshooting section at the end (§ 16) before asking for help.** Most problems are common and documented there.

**Take notes as you go.** You will create about 30 AWS resources, and each one has an ID or name you'll need later. Write them down in a text file as you go. There's a template at the end of § 1.

### Three things this guide assumes

1. You have an AWS account with **administrator access** (you can create any resource in any region).
2. You have a credit card on the AWS account (Free Tier won't cover everything, but most AWS resources have free-tier eligible options for the first 12 months which will help reduce costs).
3. You have a **domain name** you own — like `annexworkforce.com`. You bought it somewhere (Cloudflare, Namecheap, GoDaddy, or Route 53 itself). If you don't have one yet, **stop and buy one before starting**. It costs about $10/year. The domain needs to exist for 24 hours before DNS will work properly.

### How to read commands in this guide

When you see something like this:

```bash
aws ec2 describe-vpcs
```

That means: open your terminal and type or paste that command, then press Enter.

When you see something with angle brackets like `<YOUR_VALUE>`:

```bash
aws s3 ls s3://<YOUR_BUCKET_NAME>
```

You need to **replace** `<YOUR_BUCKET_NAME>` with the actual value. Don't leave the angle brackets in.

When you see "**WRITE DOWN**" — that means save the value into your notes file. You'll use it later.

---

## Table of contents

1. [Day 1: Get your tools ready](#1-day-1-get-your-tools-ready)
2. [Set up AWS CLI on your computer](#2-set-up-aws-cli-on-your-computer)
3. [Get the Annex Workforce code](#3-get-the-annex-workforce-code)
4. [Decide on your AWS region](#4-decide-on-your-aws-region)
5. [Set up your domain name in AWS](#5-set-up-your-domain-name-in-aws)
6. [Request a free SSL certificate](#6-request-a-free-ssl-certificate)
7. [Generate and store passwords (Secrets Manager)](#7-generate-and-store-passwords-secrets-manager)
8. [Create the network (VPC)](#8-create-the-network-vpc)
9. [Create the database (PostgreSQL on RDS)](#9-create-the-database-postgresql-on-rds)
10. [Create the cache (Redis on ElastiCache)](#10-create-the-cache-redis-on-elasticache)
11. [Create the search engine (OpenSearch)](#11-create-the-search-engine-opensearch)
12. [Create file storage (S3)](#12-create-file-storage-s3)
13. [Day 2: Build and push Docker images](#13-day-2-build-and-push-docker-images)
14. [Set up the database schema](#14-set-up-the-database-schema)
15. [Create ECS cluster and run the apps](#15-create-ecs-cluster-and-run-the-apps)
16. [Set up the load balancer and DNS](#16-set-up-the-load-balancer-and-dns)
17. [Test that everything works](#17-test-that-everything-works)
18. [Troubleshooting](#18-troubleshooting)
19. [How to deploy code updates later](#19-how-to-deploy-code-updates-later)

---

## 1. Day 1: Get your tools ready

### 1.1 What you're going to install

Three things on your laptop:

1. **AWS CLI** — a command-line tool to talk to AWS
2. **Docker Desktop** — to build the application containers
3. **Node.js** — the application code is JavaScript/TypeScript

Even though the app runs in AWS, you need these locally to **build** and **deploy** it. Think of your laptop as the "control center" that pushes things to AWS.

### 1.2 Install AWS CLI

**If you're on a Mac:**

Open the Terminal app (press Cmd+Space, type "Terminal", press Enter). Then run:

```bash
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install AWS CLI
brew install awscli
```

**If you're on Windows:**

1. Download the installer from https://awscli.amazonaws.com/AWSCLIV2.msi
2. Double-click the file and follow the wizard. Accept all defaults.
3. Open **Command Prompt** (press Windows key, type "cmd", press Enter).

**If you're on Linux (Ubuntu):**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify it worked:**

In your terminal, type:

```bash
aws --version
```

You should see something like `aws-cli/2.15.x`. If you get "command not found", restart your terminal and try again.

### 1.3 Install Docker Desktop

Go to https://www.docker.com/products/docker-desktop and download the version for your operating system.

Run the installer. After it installs, **launch the Docker Desktop app** from your applications. You'll see a Docker whale icon in your menu bar/system tray when it's running.

**Important:** Docker Desktop must be running every time you want to deploy. You don't need to do anything with it — just make sure the whale icon is there.

**Verify it worked:**

In your terminal, type:

```bash
docker --version
```

You should see something like `Docker version 24.x`.

Then test it can actually run:

```bash
docker run hello-world
```

You should see "Hello from Docker!" If you see an error like "Cannot connect to the Docker daemon", Docker Desktop isn't running yet. Open it and wait for the whale icon to stop animating.

### 1.4 Install Node.js

Go to https://nodejs.org and click the big **LTS** (Long Term Support) button to download. Run the installer with all default options.

**Verify:**

```bash
node --version
```

You should see something like `v20.x.x`. If the version is below 20, you have an old Node — uninstall it and reinstall from nodejs.org.

### 1.5 Install some smaller helper tools

**On Mac:**

```bash
brew install jq git
```

**On Windows:**

- For `jq`: Download from https://jqlang.github.io/jq/download/, save the `.exe` file as `jq.exe` somewhere in your PATH (the easiest place: `C:\Windows\System32`).
- For `git`: Download from https://git-scm.com/download/win and run the installer.

**On Linux (Ubuntu):**

```bash
sudo apt update
sudo apt install -y jq git unzip
```

### 1.6 Verify everything is installed

Run all of these. Every line should print a version number, not an error:

```bash
aws --version
docker --version
node --version
git --version
jq --version
```

If any one fails, fix it before proceeding. You cannot continue with a missing tool.

### 1.7 Create your notes file

Open a text editor (Notepad on Windows, TextEdit on Mac in plain-text mode, or any code editor). Create a file called `annex-deploy-notes.txt` somewhere you can find it. Paste this template in:

```
=== ANNEX WORKFORCE PRODUCTION DEPLOYMENT NOTES ===
Started: __________

AWS Account ID: __________
AWS Region: __________
Domain name: __________

--- Section 5: Domain ---
Hosted Zone ID: __________
4 Nameservers from AWS:
  1. __________
  2. __________
  3. __________
  4. __________

--- Section 6: Certificate ---
Certificate ARN: __________

--- Section 7: Secrets ---
JWT_SECRET: __________
JWT_REFRESH_SECRET: __________
DB password: __________
Redis password: __________

JWT_SECRET ARN: __________
JWT_REFRESH_SECRET ARN: __________
DB password ARN: __________
Redis password ARN: __________
SendGrid placeholder ARN: __________

--- Section 8: Network ---
VPC ID: __________
Public Subnet A: __________
Public Subnet B: __________
Private Subnet A: __________
Private Subnet B: __________
Internet Gateway ID: __________
NAT Gateway ID: __________
ALB Security Group: __________
ECS Security Group: __________
RDS Security Group: __________
Redis Security Group: __________

--- Section 9: Database ---
RDS endpoint: __________
DATABASE_URL ARN: __________

--- Section 10: Redis ---
Redis endpoint: __________
REDIS_URL ARN: __________

--- Section 11: OpenSearch ---
OpenSearch endpoint: __________

--- Section 12: S3 ---
Bucket name: __________
S3 Access Key: __________
S3 Secret Key: __________
S3 access key ARN: __________
S3 secret key ARN: __________

--- Section 13: ECR ---
API image URI: __________
Web image URI: __________

--- Section 15: ECS ---
Execution role ARN: __________

--- Section 16: Load balancer ---
ALB ARN: __________
ALB DNS: __________
ALB Hosted Zone: __________
API Target Group ARN: __________
Web Target Group ARN: __________
```

You'll fill in the blanks as you go. **Don't skip this step.** Without these notes you'll waste hours hunting for values later.

---

## 2. Set up AWS CLI on your computer

### 2.1 Create access keys for yourself in AWS

You need an "access key" so the AWS CLI on your laptop can act on your behalf.

1. Sign into the AWS Console at https://console.aws.amazon.com
2. Click your username at the top right → **Security credentials**
3. Scroll down to **Access keys** section
4. Click **Create access key**
5. Choose **Command Line Interface (CLI)** as the use case
6. Check the confirmation box and click **Next**
7. Skip the description, click **Create access key**
8. **THIS IS THE ONLY TIME** you'll see the secret key. Click **Show** and copy both:
   - Access key ID (looks like `AKIAIOSFODNN7EXAMPLE`)
   - Secret access key (longer string)
9. **WRITE BOTH DOWN** in your notes file temporarily. You can delete them from notes after this section.

### 2.2 Configure AWS CLI

In your terminal, run:

```bash
aws configure
```

It will prompt you for four values:

1. **AWS Access Key ID:** paste the access key from step 2.1
2. **AWS Secret Access Key:** paste the secret key from step 2.1
3. **Default region name:** type `us-east-1` (we'll talk about this in step 4)
4. **Default output format:** type `json`

### 2.3 Verify it worked

```bash
aws sts get-caller-identity
```

You should see something like:

```json
{
    "UserId": "AIDAI23HXD2O5EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-name"
}
```

**WRITE DOWN** your Account ID (the 12-digit number) in your notes file. You'll need it many times.

If you see an error like "Could not connect" or "InvalidClientTokenId", your access keys are wrong. Re-do step 2.1 carefully.

### 2.4 Set helpful environment variables

These save typing for the rest of the guide. Run these in your terminal:

**Mac/Linux:**

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Region: $AWS_REGION"
echo "Account: $AWS_ACCOUNT_ID"
```

**Windows (Command Prompt):**

```cmd
set AWS_REGION=us-east-1
for /f %i in ('aws sts get-caller-identity --query Account --output text') do set AWS_ACCOUNT_ID=%i
echo Region: %AWS_REGION%
echo Account: %AWS_ACCOUNT_ID%
```

> **Important:** these variables only last as long as your terminal window is open. If you close it and open a new one, you need to set them again. Keep your terminal open for the whole deployment.

> **Note for Windows users:** the rest of this guide uses Mac/Linux command syntax (with `$VARIABLE`). For Windows Command Prompt, replace `$VARIABLE` with `%VARIABLE%`. Or — easier — install **WSL** (Windows Subsystem for Linux) from the Microsoft Store, then use Ubuntu inside WSL. All Linux commands will work.

---

## 3. Get the Annex Workforce code

### 3.1 Extract the zip file

You should have received `annex-workforce.zip`. Extract it somewhere easy to find. For this guide, we'll assume it's at `~/annex-workforce` (your home folder).

```bash
# Mac/Linux
cd ~
unzip annex-workforce.zip
cd annex-workforce
ls
```

You should see folders: `apps`, `docs`, and files like `README.md`, `docker-compose.yml`, `.env.example`.

```bash
# Windows: just right-click the zip, choose "Extract All", pick your home folder
# Then open Command Prompt and:
cd %USERPROFILE%\annex-workforce
dir
```

### 3.2 Verify the structure

```bash
ls apps
```

You should see two folders: `api` and `web`.

```bash
ls apps/api/src
```

You should see folders like `auth`, `candidates`, `employers`, etc.

If any of this is missing, the zip extraction didn't work. Try extracting it again.

---

## 4. Decide on your AWS region

A "region" is which physical AWS data center your app runs in. **Pick one and never change it** during this deployment — every resource must be in the same region or they can't talk to each other.

**Common choices:**

| Region | Code | Good for |
|--------|------|----------|
| US East (N. Virginia) | `us-east-1` | Cheapest, default in this guide |
| EU (Ireland) | `eu-west-1` | European users |
| Africa (Cape Town) | `af-south-1` | African users — lower latency for Annex's target market |

This guide uses `us-east-1`. If you want a different one:

1. Find the region code in the table above
2. Wherever you see `us-east-1` in this guide, use your code instead
3. Update the environment variable: `export AWS_REGION=<your-region>`

> **A note about Cape Town (`af-south-1`):** It's an "opt-in" region. Go to the AWS Console → top right account menu → **AWS Account** → **AWS Regions** → enable `af-south-1`. Wait 5 minutes for it to activate. Also, some services like OpenSearch may not be available there yet — check before committing.

For this guide, I'll continue with `us-east-1`. **WRITE DOWN** your chosen region.

---

## 5. Set up your domain name in AWS

### 5.1 What we're doing

Right now your domain (e.g. `annexworkforce.com`) lives at whoever you bought it from (Cloudflare, GoDaddy, etc.). We're going to tell that registrar "let AWS manage the DNS for this domain." This is called "delegating DNS to Route 53."

We need this because:
- The SSL certificate (next step) is easier to get when AWS controls the DNS
- The load balancer (step 16) integrates with Route 53 to point your domain at it

### 5.2 Create a hosted zone in Route 53

A "hosted zone" is AWS's name for a collection of DNS records for one domain.

```bash
aws route53 create-hosted-zone \
  --name <YOUR_DOMAIN.com> \
  --caller-reference "annex-deploy-$(date +%s)"
```

Replace `<YOUR_DOMAIN.com>` with your actual domain (e.g. `annexworkforce.com`). Don't include `www.` or `https://`.

The output will be a big JSON blob. Look for these two things:

1. **`Id`** — under `HostedZone`, looks like `/hostedzone/Z1ABCDEF12345`. The part after `/hostedzone/` is your Hosted Zone ID. **WRITE DOWN** the part after the slash (just `Z1ABCDEF12345`).

2. **`NameServers`** — under `DelegationSet`, four strings like:
   ```
   ns-123.awsdns-12.com
   ns-456.awsdns-34.net
   ns-789.awsdns-56.org
   ns-012.awsdns-78.co.uk
   ```
   **WRITE DOWN all four.**

### 5.3 Update your registrar to use these nameservers

Now log into wherever you bought your domain. The exact steps depend on the registrar:

**At Cloudflare:**
1. Click your domain in the dashboard
2. Look for "Nameservers" section
3. Cloudflare actually does its own DNS — you need to switch to "custom nameservers". Look for "DNS" → "Nameservers" → "Use custom nameservers"
4. Enter all 4 AWS nameservers, save

**At GoDaddy:**
1. My Products → next to your domain, click **DNS**
2. Scroll to "Nameservers" section, click **Change**
3. Choose "Enter my own nameservers"
4. Enter all 4 AWS nameservers, save

**At Namecheap:**
1. Domain List → next to your domain, click **Manage**
2. Find "Nameservers" section
3. Change to "Custom DNS"
4. Enter all 4 nameservers, save

**At Route 53 (if you bought the domain through AWS):**
- Skip this step — Route 53 should already be the nameserver. Go to Route 53 → Registered Domains → click your domain → verify "Name servers" matches the hosted zone NS records.

### 5.4 Wait for DNS to propagate

DNS changes take **up to 48 hours** to propagate worldwide, but usually it's 1-4 hours. You can start step 6 right away, but step 6 will only finish after DNS has propagated.

**Check propagation:**

```bash
dig NS <YOUR_DOMAIN.com> +short
```

(On Windows: `nslookup -type=NS yourdomain.com`)

You want to see the AWS nameservers in the output. As long as your registrar still shows in the result, DNS hasn't fully propagated yet. **Continue to step 6 and check back periodically.**

---

## 6. Request a free SSL certificate

### 6.1 What this is

SSL is what makes URLs say `https://` (with the padlock). Without it, browsers will show "Not Secure" and refuse to load forms safely. AWS Certificate Manager (ACM) issues SSL certificates for free.

### 6.2 Request the certificate

```bash
CERT_ARN=$(aws acm request-certificate \
  --domain-name <YOUR_DOMAIN.com> \
  --subject-alternative-names "*.<YOUR_DOMAIN.com>" \
  --validation-method DNS \
  --region $AWS_REGION \
  --query CertificateArn --output text)

echo "Certificate ARN: $CERT_ARN"
```

Replace `<YOUR_DOMAIN.com>` (twice) with your actual domain. The `*.` (wildcard) covers all subdomains like `app.` and `api.`.

**WRITE DOWN** the certificate ARN. It looks like `arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-...`.

### 6.3 Get the DNS validation records

AWS needs to confirm you own the domain. It does this by asking you to add a special DNS record:

```bash
# Wait a few seconds for ACM to generate the records
sleep 10

aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions[].ResourceRecord" --output json
```

You'll see output like:

```json
[
    {
        "Name": "_abc123def456.annexworkforce.com.",
        "Type": "CNAME",
        "Value": "_xyz789.acm-validations.aws."
    }
]
```

(There might be one or two records depending on whether you got the wildcard certificate. Add **all** of them.)

### 6.4 Add the validation records to Route 53

Replace `<HOSTED_ZONE_ID>` with the ID you wrote down in step 5.2.

```bash
# Set this from your notes
HOSTED_ZONE_ID=<YOUR_HOSTED_ZONE_ID>

# Get the validation record details
NAME=$(aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord.Name" --output text)
VALUE=$(aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord.Value" --output text)

echo "Will add CNAME record:"
echo "  Name: $NAME"
echo "  Value: $VALUE"

# Add the record
cat > /tmp/cert-validate.json <<EOF
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
  --change-batch file:///tmp/cert-validate.json
```

### 6.5 Check certificate status

After your registrar's nameserver change has propagated (step 5.4), AWS will detect the validation record and issue the cert. This usually takes 5-30 minutes after DNS propagation.

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.Status" --output text
```

- `PENDING_VALIDATION` = still waiting. Check again in 15 minutes.
- `ISSUED` = success! Move on.

**You can continue to sections 7-12 while waiting.** You'll only need the certificate at step 16.

---

## 7. Generate and store passwords (Secrets Manager)

### 7.1 What we're doing

The app needs strong random passwords for the database, Redis, and JWT tokens. We'll generate them now and store them in **AWS Secrets Manager** — a secure vault. The app will pull them at runtime without ever having them hardcoded.

### 7.2 Generate 4 random secrets

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
DB_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
REDIS_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
```

**WRITE DOWN ALL FOUR.** They're not retrievable in plain text once stored in Secrets Manager (well, they kind of are — but it's faster to have them in your notes).

### 7.3 Store them in AWS Secrets Manager

```bash
aws secretsmanager create-secret --name annex/prod/jwt-secret \
  --secret-string "$JWT_SECRET" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/jwt-refresh-secret \
  --secret-string "$JWT_REFRESH_SECRET" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/db-password \
  --secret-string "$DB_PASSWORD" --region $AWS_REGION

aws secretsmanager create-secret --name annex/prod/redis-password \
  --secret-string "$REDIS_PASSWORD" --region $AWS_REGION

# Placeholder for SendGrid (you'll update this later when you have a real key)
aws secretsmanager create-secret --name annex/prod/sendgrid-api-key \
  --secret-string "REPLACE_ME_WITH_SENDGRID_KEY" --region $AWS_REGION
```

Each command outputs a JSON object with an `ARN` field. You don't need to write those down individually — we'll fetch them all in the next step.

### 7.4 Capture all the secret ARNs

```bash
for name in jwt-secret jwt-refresh-secret db-password redis-password sendgrid-api-key; do
  arn=$(aws secretsmanager describe-secret --secret-id annex/prod/$name --region $AWS_REGION --query ARN --output text)
  echo "annex/prod/$name → $arn"
done
```

**WRITE DOWN all 5 ARNs** in your notes file.

### ✓ Checkpoint

Verify by listing them:

```bash
aws secretsmanager list-secrets --region $AWS_REGION \
  --query "SecretList[?starts_with(Name, 'annex/prod/')].Name" --output text
```

You should see five names listed.

---

## 8. Create the network (VPC)

### 8.1 What we're doing

We need an isolated network in AWS where everything lives. Think of it like a private floor in a building — the internet can only enter through specific doors, and our servers can talk to each other without going through the public internet.

This section creates: 1 VPC, 4 subnets, 1 internet gateway, 1 NAT gateway, 4 security groups. About 30 minutes of CLI commands.

### 8.2 Create the VPC

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

**WRITE DOWN** the `VPC_ID`.

### 8.3 Create 4 subnets

A "subnet" is a slice of the network. We need:
- **2 public subnets** — for the load balancer (must be reachable from internet)
- **2 private subnets** — for the app, database, etc. (hidden from internet)

We use 2 of each so we survive an outage in one data center.

```bash
PUBLIC_SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-public-a}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

PUBLIC_SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-public-b}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_A --map-public-ip-on-launch --region $AWS_REGION
aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_B --map-public-ip-on-launch --region $AWS_REGION

PRIVATE_SUBNET_A=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone ${AWS_REGION}a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-private-a}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

PRIVATE_SUBNET_B=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone ${AWS_REGION}b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=annex-private-b}]' \
  --region $AWS_REGION --query Subnet.SubnetId --output text)

echo "PUBLIC_SUBNET_A=$PUBLIC_SUBNET_A"
echo "PUBLIC_SUBNET_B=$PUBLIC_SUBNET_B"
echo "PRIVATE_SUBNET_A=$PRIVATE_SUBNET_A"
echo "PRIVATE_SUBNET_B=$PRIVATE_SUBNET_B"
```

**WRITE DOWN all 4 subnet IDs.**

### 8.4 Create an internet gateway (door to the internet)

```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=annex-igw}]' \
  --region $AWS_REGION --query InternetGateway.InternetGatewayId --output text)

aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID --region $AWS_REGION

# Create a "route table" for the public subnets
PUBLIC_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=annex-public-rt}]' \
  --region $AWS_REGION --query RouteTable.RouteTableId --output text)

# Send all traffic from public subnets to the internet gateway
aws ec2 create-route --route-table-id $PUBLIC_RT --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID --region $AWS_REGION

# Apply the route table to both public subnets
aws ec2 associate-route-table --route-table-id $PUBLIC_RT --subnet-id $PUBLIC_SUBNET_A --region $AWS_REGION
aws ec2 associate-route-table --route-table-id $PUBLIC_RT --subnet-id $PUBLIC_SUBNET_B --region $AWS_REGION

echo "IGW_ID=$IGW_ID"
```

### 8.5 Create a NAT gateway (door for private subnets)

The NAT Gateway lets the apps in private subnets reach the internet (to download Docker images, send emails, etc.) without being reachable from the internet.

> **Cost warning:** NAT Gateway costs about $33/month + ~$0.045/GB of traffic. It's the most expensive part of the setup but it's required.

```bash
# Allocate an Elastic IP (a static public IP address)
EIP_ID=$(aws ec2 allocate-address --domain vpc --region $AWS_REGION --query AllocationId --output text)

# Create the NAT gateway
NAT_GW_ID=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_A \
  --allocation-id $EIP_ID \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=annex-nat}]' \
  --region $AWS_REGION --query NatGateway.NatGatewayId --output text)

echo "NAT Gateway created: $NAT_GW_ID"
echo "Waiting 2-3 minutes for it to become available..."

aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_ID --region $AWS_REGION
echo "✓ NAT Gateway ready"

# Create route table for private subnets, routing through NAT
PRIVATE_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=annex-private-rt}]' \
  --region $AWS_REGION --query RouteTable.RouteTableId --output text)

aws ec2 create-route --route-table-id $PRIVATE_RT --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW_ID --region $AWS_REGION

aws ec2 associate-route-table --route-table-id $PRIVATE_RT --subnet-id $PRIVATE_SUBNET_A --region $AWS_REGION
aws ec2 associate-route-table --route-table-id $PRIVATE_RT --subnet-id $PRIVATE_SUBNET_B --region $AWS_REGION
```

**WRITE DOWN** `NAT_GW_ID`.

### 8.6 Create security groups (firewalls)

A "security group" is a firewall rule. We need 4 of them, each protecting one tier:

```bash
# ALB security group: anyone on the internet can reach the load balancer on 443/80
ALB_SG=$(aws ec2 create-security-group \
  --group-name annex-alb-sg --description "ALB security group" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ALB_SG \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION

# ECS security group: only the ALB can reach our app containers
ECS_SG=$(aws ec2 create-security-group \
  --group-name annex-ecs-sg --description "ECS tasks SG" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 4000 --source-group $ALB_SG --region $AWS_REGION
aws ec2 authorize-security-group-ingress --group-id $ECS_SG \
  --protocol tcp --port 3000 --source-group $ALB_SG --region $AWS_REGION

# RDS security group: only ECS tasks can reach PostgreSQL on port 5432
RDS_SG=$(aws ec2 create-security-group \
  --group-name annex-rds-sg --description "RDS PostgreSQL SG" \
  --vpc-id $VPC_ID --region $AWS_REGION --query GroupId --output text)

aws ec2 authorize-security-group-ingress --group-id $RDS_SG \
  --protocol tcp --port 5432 --source-group $ECS_SG --region $AWS_REGION

# Redis security group: only ECS tasks can reach Redis on 6379
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

**WRITE DOWN all 4 security group IDs.**

### ✓ Checkpoint

```bash
aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $AWS_REGION > /dev/null && echo "✓ VPC OK"
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION \
  --query "length(Subnets)" --output text | grep -q "^4$" && echo "✓ 4 subnets OK"
```

---

## 9. Create the database (PostgreSQL on RDS)

### 9.1 What we're doing

RDS is AWS's managed database service. We're creating a PostgreSQL 16 instance. AWS handles backups, patching, and replication for us.

> **This step takes 10-15 minutes** for RDS to provision. Start it now and continue to section 10 while waiting.

### 9.2 Create a DB subnet group

RDS needs to know which subnets it's allowed to use.

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name annex-db-subnet-group \
  --db-subnet-group-description "Annex DB subnet group" \
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \
  --region $AWS_REGION
```

### 9.3 Create the database

```bash
# Get the DB password we generated earlier
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

> **What these flags mean:**
> - `db.t4g.small`: 2 CPU, 2 GB RAM — enough for hundreds of users
> - `--no-multi-az`: saves $25/mo by not running a hot standby in another zone. Change to `--multi-az` once you have paying customers.
> - `--deletion-protection`: prevents you from accidentally deleting the DB via the console

### 9.4 Wait for it to be ready

```bash
echo "Waiting for RDS to be available (10-15 minutes)..."
aws rds wait db-instance-available --db-instance-identifier annex-prod-db --region $AWS_REGION
echo "✓ RDS ready"

# Capture the endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier annex-prod-db \
  --region $AWS_REGION --query "DBInstances[0].Endpoint.Address" --output text)

echo "DB_ENDPOINT=$DB_ENDPOINT"
```

**WRITE DOWN** `DB_ENDPOINT`.

### 9.5 Store the full database URL in Secrets Manager

The app reads from a single `DATABASE_URL` variable. Build it and store it:

```bash
DATABASE_URL="postgresql://annex:$DB_PASSWORD@$DB_ENDPOINT:5432/annex?schema=public&sslmode=require"

aws secretsmanager create-secret --name annex/prod/database-url \
  --secret-string "$DATABASE_URL" --region $AWS_REGION

DATABASE_URL_ARN=$(aws secretsmanager describe-secret \
  --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

echo "DATABASE_URL_ARN=$DATABASE_URL_ARN"
```

**WRITE DOWN** the ARN.

---

## 10. Create the cache (Redis on ElastiCache)

### 10.1 What we're doing

Redis is a fast in-memory cache. We use it for rate limiting, session blacklists, and other quick lookups. AWS's managed Redis is called ElastiCache.

> **This step takes 5-8 minutes.** Start it now.

### 10.2 Create the cache subnet group

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name annex-cache-subnet-group \
  --cache-subnet-group-description "Annex Redis subnet group" \
  --subnet-ids $PRIVATE_SUBNET_A $PRIVATE_SUBNET_B \
  --region $AWS_REGION
```

### 10.3 Create the Redis cluster

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

### 10.4 Wait, then capture and store the URL

```bash
echo "Waiting for Redis (5-8 minutes)..."
aws elasticache wait replication-group-available \
  --replication-group-id annex-redis --region $AWS_REGION
echo "✓ Redis ready"

REDIS_ENDPOINT=$(aws elasticache describe-replication-groups \
  --replication-group-id annex-redis --region $AWS_REGION \
  --query "ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address" --output text)

# Note rediss:// (with double-s) for TLS
REDIS_URL="rediss://:$REDIS_PASSWORD@$REDIS_ENDPOINT:6379"

aws secretsmanager create-secret --name annex/prod/redis-url \
  --secret-string "$REDIS_URL" --region $AWS_REGION

REDIS_URL_ARN=$(aws secretsmanager describe-secret \
  --secret-id annex/prod/redis-url --region $AWS_REGION --query ARN --output text)

echo "REDIS_ENDPOINT=$REDIS_ENDPOINT"
echo "REDIS_URL_ARN=$REDIS_URL_ARN"
```

**WRITE DOWN** both.

---

## 11. Create the search engine (OpenSearch)

### 11.1 What we're doing

OpenSearch is AWS's managed version of Elasticsearch. The app uses it to power talent and job search. **You can skip this section if you want to save ~$36/month** — the app falls back to PostgreSQL for search automatically. Add OpenSearch later when search is slow.

If you want to skip: jump to section 12 and use `""` (empty string) for `ELASTICSEARCH_URL` in step 15.

### 11.2 Create the domain

> **This step takes 15-20 minutes.** Start it now, continue to section 12 while waiting.

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

### 11.3 Wait and capture the endpoint

```bash
echo "Waiting for OpenSearch (15-20 minutes)..."
while true; do
  STATUS=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION \
    --query "DomainStatus.Processing" --output text)
  if [ "$STATUS" = "False" ]; then break; fi
  echo "  Still processing..."
  sleep 60
done
echo "✓ OpenSearch ready"

OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION \
  --query "DomainStatus.Endpoints.vpc" --output text)

echo "OPENSEARCH_ENDPOINT=$OPENSEARCH_ENDPOINT"
```

**WRITE DOWN** the endpoint.

---

## 12. Create file storage (S3)

### 12.1 What we're doing

S3 is AWS's file storage. The app uses it for resume uploads and other documents.

### 12.2 Create the bucket

S3 bucket names must be **globally unique** — no two AWS customers can have the same bucket name. We'll add your account ID to the name to make it unique.

```bash
BUCKET_NAME="annex-documents-prod-$AWS_ACCOUNT_ID"

# Create bucket. The if/else handles a quirk: us-east-1 needs different syntax.
if [ "$AWS_REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket $BUCKET_NAME --region $AWS_REGION
else
  aws s3api create-bucket --bucket $BUCKET_NAME --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION
fi

# Block public access (uploaded files should never be publicly listable)
aws s3api put-public-access-block --bucket $BUCKET_NAME \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning (recover deleted/overwritten files)
aws s3api put-bucket-versioning --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Encrypt files at rest
aws s3api put-bucket-encryption --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

echo "BUCKET_NAME=$BUCKET_NAME"
```

**WRITE DOWN** the bucket name.

### 12.3 Create an IAM user with S3 access

```bash
aws iam create-user --user-name annex-prod-s3-user

# Create access keys
aws iam create-access-key --user-name annex-prod-s3-user > /tmp/s3-keys.json

S3_ACCESS_KEY=$(jq -r '.AccessKey.AccessKeyId' /tmp/s3-keys.json)
S3_SECRET_KEY=$(jq -r '.AccessKey.SecretAccessKey' /tmp/s3-keys.json)

echo "S3_ACCESS_KEY=$S3_ACCESS_KEY"
echo "S3_SECRET_KEY=$S3_SECRET_KEY"

# Attach policy giving this user read/write on our bucket
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

**WRITE DOWN** both `S3_ACCESS_KEY` and `S3_SECRET_KEY`.

### 12.4 Store the S3 credentials in Secrets Manager

```bash
aws secretsmanager create-secret --name annex/prod/s3-access-key \
  --secret-string "$S3_ACCESS_KEY" --region $AWS_REGION
aws secretsmanager create-secret --name annex/prod/s3-secret-key \
  --secret-string "$S3_SECRET_KEY" --region $AWS_REGION

S3_ACCESS_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-access-key --region $AWS_REGION --query ARN --output text)
S3_SECRET_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-secret-key --region $AWS_REGION --query ARN --output text)

echo "S3_ACCESS_KEY_ARN=$S3_ACCESS_KEY_ARN"
echo "S3_SECRET_KEY_ARN=$S3_SECRET_KEY_ARN"
```

**WRITE DOWN** both ARNs.

### 🎉 End of Day 1

You now have all the infrastructure. The remaining steps build and deploy the application onto it. Take a break, double-check your notes file, then continue with Day 2.

---

## 13. Day 2: Build and push Docker images

### 13.1 What we're doing

We need to convert the source code into "Docker images" — packaged containers that AWS can run. We'll build them on your laptop, then upload them to a private AWS image registry called **ECR**.

### 13.2 Create ECR repositories

```bash
aws ecr create-repository --repository-name annex/api --region $AWS_REGION
aws ecr create-repository --repository-name annex/web --region $AWS_REGION
```

### 13.3 Tell Docker how to log into ECR

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

You should see `Login Succeeded` at the end. If you see "Cannot connect to the Docker daemon", make sure Docker Desktop is open and running.

### 13.4 Make sure you're in the source code directory

```bash
cd ~/annex-workforce
ls
```

You should see `apps`, `docs`, `README.md`, etc.

### 13.5 Build the API image

```bash
VERSION=$(date +%Y%m%d-%H%M%S)
ECR_API_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api

echo "Building API version $VERSION..."

docker build --platform linux/amd64 \
  -t annex/api:$VERSION \
  -f apps/api/Dockerfile apps/api
```

> **CRITICAL — Apple Silicon Mac users (M1/M2/M3/M4):** the `--platform linux/amd64` flag is essential. Without it, you'll build an image for your Mac's CPU architecture that won't run on AWS. The build will be slower (Docker emulates x86) but it will work.

This will take 5-10 minutes the first time. It downloads dependencies, compiles TypeScript, etc. You'll see lots of output. As long as the last line is "naming to ..." or similar (no big red error), it succeeded.

### 13.6 Push the API image to ECR

```bash
docker tag annex/api:$VERSION $ECR_API_URI:$VERSION
docker tag annex/api:$VERSION $ECR_API_URI:latest

docker push $ECR_API_URI:$VERSION
docker push $ECR_API_URI:latest

echo "✓ API image pushed: $ECR_API_URI:$VERSION"
```

This will take 2-5 minutes to upload (depends on internet speed).

### 13.7 Build and push the web image

The web image is special — Next.js bakes the API URL into the JavaScript bundle at build time. So we tell it the production API URL right now.

```bash
ECR_WEB_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/web

# REPLACE annexworkforce.com WITH YOUR ACTUAL DOMAIN
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.<YOUR_DOMAIN.com> \
  -t annex/web:$VERSION \
  -f apps/web/Dockerfile apps/web

docker tag annex/web:$VERSION $ECR_WEB_URI:$VERSION
docker tag annex/web:$VERSION $ECR_WEB_URI:latest

docker push $ECR_WEB_URI:$VERSION
docker push $ECR_WEB_URI:latest

echo "✓ Web image pushed: $ECR_WEB_URI:$VERSION"
```

**WRITE DOWN** both image URIs (with the version tag).

### ✓ Checkpoint

```bash
aws ecr describe-images --repository-name annex/api --region $AWS_REGION \
  --query "imageDetails[].imageTags[]" --output text | grep -q "latest" && echo "✓ API in ECR"
aws ecr describe-images --repository-name annex/web --region $AWS_REGION \
  --query "imageDetails[].imageTags[]" --output text | grep -q "latest" && echo "✓ Web in ECR"
```

---

## 14. Set up the database schema

### 14.1 What we're doing

The database is empty right now. We need to run the Prisma migration to create all the tables, then seed it with demo data. We'll do this with a one-off ECS task that runs the migration script and then stops.

### 14.2 Create a CloudWatch log group

CloudWatch is AWS's logging service. All container logs go here.

```bash
aws logs create-log-group --log-group-name /ecs/annex-prod --region $AWS_REGION
aws logs put-retention-policy --log-group-name /ecs/annex-prod \
  --retention-in-days 30 --region $AWS_REGION
```

### 14.3 Create the ECS task execution role

The "execution role" is what ECS uses to pull images from ECR and read secrets.

```bash
# Trust policy: who can assume this role
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

# Attach AWS's standard ECS execution policy
aws iam attach-role-policy --role-name annex-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Custom policy: allow reading our secrets
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

# IAM changes take a few seconds to propagate
sleep 10
```

**WRITE DOWN** `EXECUTION_ROLE_ARN`.

### 14.4 Create the ECS cluster

A "cluster" is just a logical grouping. No cost.

```bash
aws ecs create-cluster --cluster-name annex-prod \
  --capacity-providers FARGATE --region $AWS_REGION
```

### 14.5 Register the migration task definition

A "task definition" is a recipe for how to run a container. This one runs Prisma migrations and then stops.

```bash
DATABASE_URL_ARN=$(aws secretsmanager describe-secret \
  --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

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

### 14.6 Run the migration

```bash
TASK_ARN=$(aws ecs run-task \
  --cluster annex-prod \
  --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --region $AWS_REGION \
  --query "tasks[0].taskArn" --output text)

echo "Migration task started: $TASK_ARN"
echo "Waiting for it to finish..."

aws ecs wait tasks-stopped --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION

EXIT_CODE=$(aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].containers[0].exitCode" --output text)

echo "Exit code: $EXIT_CODE"
```

If `Exit code: 0` — migration worked. **Move on to section 15.**

If you see any other exit code (1, 137, or `None`), look at the logs:

```bash
TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
aws logs tail /ecs/annex-prod --log-stream-names migrate/migrate/$TASK_ID --region $AWS_REGION
```

Then jump to [§ 18.3](#183-migration-failed).

---

## 15. Create ECS cluster and run the apps

### 15.1 Register the API task definition

```bash
# Re-fetch all the ARNs from Secrets Manager
JWT_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/jwt-secret --region $AWS_REGION --query ARN --output text)
JWT_REFRESH_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/jwt-refresh-secret --region $AWS_REGION --query ARN --output text)
REDIS_URL_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/redis-url --region $AWS_REGION --query ARN --output text)
S3_ACCESS_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-access-key --region $AWS_REGION --query ARN --output text)
S3_SECRET_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/s3-secret-key --region $AWS_REGION --query ARN --output text)
SENDGRID_KEY_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/sendgrid-api-key --region $AWS_REGION --query ARN --output text)
DATABASE_URL_ARN=$(aws secretsmanager describe-secret --secret-id annex/prod/database-url --region $AWS_REGION --query ARN --output text)

# Re-fetch OpenSearch endpoint (or set to empty if you skipped section 11)
OPENSEARCH_ENDPOINT=$(aws opensearch describe-domain --domain-name annex-search --region $AWS_REGION --query "DomainStatus.Endpoints.vpc" --output text 2>/dev/null || echo "")
BUCKET_NAME="annex-documents-prod-$AWS_ACCOUNT_ID"

# REPLACE annexworkforce.com WITH YOUR ACTUAL DOMAIN in these next two lines
WEB_ORIGIN="https://app.<YOUR_DOMAIN.com>"
API_URL="https://api.<YOUR_DOMAIN.com>"
```

Now write the task definition:

```bash
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
      {"name": "ALLOWED_ORIGINS", "value": "$WEB_ORIGIN"},
      {"name": "ELASTICSEARCH_URL", "value": "https://$OPENSEARCH_ENDPOINT"},
      {"name": "S3_BUCKET", "value": "$BUCKET_NAME"},
      {"name": "S3_REGION", "value": "$AWS_REGION"},
      {"name": "S3_FORCE_PATH_STYLE", "value": "false"},
      {"name": "JWT_ACCESS_TTL", "value": "15m"},
      {"name": "JWT_REFRESH_TTL", "value": "7d"},
      {"name": "SENDGRID_FROM_EMAIL", "value": "noreply@<YOUR_DOMAIN.com>"}
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

> **Don't forget** to replace `<YOUR_DOMAIN.com>` in the `SENDGRID_FROM_EMAIL` line above!

### 15.2 Register the web task definition

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
      {"name": "NEXT_PUBLIC_API_URL", "value": "$API_URL"},
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

### ✓ Checkpoint

```bash
aws ecs describe-task-definition --task-definition annex-api --region $AWS_REGION > /dev/null && echo "✓ API task def"
aws ecs describe-task-definition --task-definition annex-web --region $AWS_REGION > /dev/null && echo "✓ Web task def"
```

The actual services get created in section 16 after the load balancer exists.

---

## 16. Set up the load balancer and DNS

### 16.1 Verify the SSL certificate is ready

Before continuing, check that the cert from section 6 has finished validating:

```bash
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.Status" --output text
```

**Must say `ISSUED`.** If it still says `PENDING_VALIDATION`:
- DNS hasn't propagated yet from your registrar — wait longer
- Or the validation record wasn't added correctly — re-do section 6.4

You **cannot** proceed until status is `ISSUED`.

### 16.2 Create the load balancer

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

### 16.3 Create target groups

A "target group" is a pool of containers the load balancer sends traffic to.

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

### 16.4 Create HTTPS listener with routing rules

```bash
# HTTPS listener — default: send to web target group
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN \
  --region $AWS_REGION \
  --query "Listeners[0].ListenerArn" --output text)

# Rule: if hostname is api.YOUR_DOMAIN.com, send to API target group
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 100 \
  --conditions Field=host-header,Values=api.<YOUR_DOMAIN.com> \
  --actions Type=forward,TargetGroupArn=$API_TG_ARN \
  --region $AWS_REGION

# Redirect HTTP (80) → HTTPS (443)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP --port 80 \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region $AWS_REGION
```

> Don't forget to replace `<YOUR_DOMAIN.com>` in the rule above!

### 16.5 Point DNS at the load balancer

```bash
cat > /tmp/dns-records.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.<YOUR_DOMAIN.com>",
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
        "Name": "api.<YOUR_DOMAIN.com>",
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

# REMEMBER: Replace <YOUR_DOMAIN.com> in /tmp/dns-records.json with your real domain
# (in 2 places). You can edit the file directly:
#   nano /tmp/dns-records.json
# Or use sed:
#   sed -i.bak 's/<YOUR_DOMAIN.com>/yourdomain.com/g' /tmp/dns-records.json

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file:///tmp/dns-records.json
```

> **Important:** the placeholder `<YOUR_DOMAIN.com>` appears twice in the JSON above. Make sure both are replaced with your actual domain before running `change-resource-record-sets`.

### 16.6 Create the ECS services

Now connect ECS to the load balancer. This step actually starts your application running.

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

### 16.7 Wait for services to stabilize

This takes 3-5 minutes. ECS is pulling images, starting containers, checking health, registering with the load balancer.

```bash
echo "Waiting for API service..."
aws ecs wait services-stable --cluster annex-prod --services annex-api --region $AWS_REGION

echo "Waiting for web service..."
aws ecs wait services-stable --cluster annex-prod --services annex-web --region $AWS_REGION

echo "✓ Both services stable!"
```

If either wait hangs for 10+ minutes, see [§ 18.4](#184-ecs-service-wont-stabilize).

### ✓ Checkpoint

```bash
aws ecs describe-services --cluster annex-prod --services annex-api annex-web --region $AWS_REGION \
  --query "services[].{name:serviceName,desired:desiredCount,running:runningCount}" --output table
```

Both services should show `desired=2, running=2`.

---

## 17. Test that everything works

### 17.1 DNS propagation

DNS may take a few minutes to propagate. Check:

```bash
sleep 60
dig api.<YOUR_DOMAIN.com> +short
```

You should see one or more IP addresses (not the AWS nameservers — the ALB's IPs). If you only see nothing, wait longer and try again.

### 17.2 Health check

```bash
curl https://api.<YOUR_DOMAIN.com>/health
```

You should see something like:

```json
{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
```

If you get a "could not resolve" error: DNS hasn't propagated yet, wait 5 more minutes.

If you get a "502 Bad Gateway": ECS containers aren't healthy yet. Check [§ 18.5](#185-alb-returns-5xx).

If you get a "certificate error": your SSL cert isn't issued or isn't attached. Check section 6.5.

### 17.3 Visit the website

Open a browser. Go to `https://app.<YOUR_DOMAIN.com>`.

You should see the Annex Workforce landing page. The URL bar should show a padlock icon.

### 17.4 Try to log in

Click **Sign in**. Use the seeded admin account:

- Email: `admin@annexworkforce.com`
- Password: `Admin@12345`

You should land on the admin dashboard.

### 17.5 Test the candidate flow

1. Log out
2. Click **Sign in**, use `candidate@example.com` / `Pass@1234`
3. You should see the candidate dashboard
4. Click **Find jobs** — you should see one published job ("Senior Backend Engineer")
5. Click the job, then click **Start application**, then **Submit application**
6. Click **My applications** — you should see it listed

### 17.6 Test the employer flow

1. Log out
2. Sign in as `employer@techstartup.io` / `Pass@1234`
3. You should see the employer dashboard
4. Click on a job → see the applicant pipeline → click on the candidate card → see their profile

### 17.7 Change the default passwords

The seed data ships with public passwords. **Change them immediately.** The simplest way:

1. Log in as the admin (`admin@annexworkforce.com`)
2. Go to **Users**
3. For each seeded demo user (`candidate@example.com`, `employer@techstartup.io`), change their status to **Suspended** (until you have real users)

Or, change the admin password by:
1. Logging out
2. Going to `/forgot-password`
3. Using the admin email
4. (To make this work, the SendGrid integration must be configured — see § 17.8)

### 17.8 (Optional but recommended) Set up SendGrid for real emails

Right now, email notifications won't actually send because we used a placeholder for `SENDGRID_API_KEY`. To enable real emails:

1. Go to https://signup.sendgrid.com/ and create a free account
2. Verify your sender domain (`<YOUR_DOMAIN.com>`) in SendGrid → Sender Authentication
3. Create an API key in Settings → API Keys
4. Update the secret:

```bash
aws secretsmanager update-secret \
  --secret-id annex/prod/sendgrid-api-key \
  --secret-string "SG.your-real-key-here" \
  --region $AWS_REGION

# Force ECS to pick up the new value
aws ecs update-service --cluster annex-prod --service annex-api \
  --force-new-deployment --region $AWS_REGION
```

### 🎉 You are live

If sections 17.1-17.6 all worked, **your platform is in production.** Bookmark your URLs, take a screenshot, and reward yourself.

---

## 18. Troubleshooting

This section covers common issues. **Read this before asking for help** — most problems are documented here.

### 18.1 General debugging approach

When something fails, follow this order:

1. **Read the error message carefully.** AWS errors are usually specific.
2. **Check the logs** for the relevant service in CloudWatch:
   ```bash
   aws logs tail /ecs/annex-prod --follow --region $AWS_REGION
   ```
3. **Verify the resource exists and is healthy** in the AWS console.
4. **Check your notes file** — did you write the right ARN/ID into the right variable?

### 18.2 "Certificate is stuck in PENDING_VALIDATION"

Most common: DNS hasn't propagated, or the validation record isn't right.

```bash
# 1. Check what record ACM is expecting
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION \
  --query "Certificate.DomainValidationOptions"

# 2. Check what's actually in Route 53
aws route53 list-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID \
  --query "ResourceRecordSets[?Type=='CNAME']"

# 3. Compare. They must match exactly.
```

If your nameservers haven't propagated yet, run `dig NS <YOUR_DOMAIN>` — until you see the AWS nameservers, the cert won't validate.

### 18.3 Migration failed

The seed script can fail for several reasons.

```bash
# Get the logs for the failed migration task
TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
aws logs filter-log-events --log-group-name /ecs/annex-prod \
  --log-stream-name-prefix migrate/migrate/$TASK_ID --region $AWS_REGION \
  --query "events[].message" --output text
```

Common errors:

| What the log says | What's wrong | Fix |
|-------------------|--------------|-----|
| `connect ECONNREFUSED` | Container can't reach RDS | Check `RDS_SG` allows port 5432 from `ECS_SG`. Verify with `aws ec2 describe-security-groups --group-ids $RDS_SG` |
| `password authentication failed` | DB_PASSWORD is wrong | The secret might have a trailing newline. Re-create: `aws secretsmanager update-secret --secret-id annex/prod/db-password --secret-string "<actual_password>"` |
| `self-signed certificate` | SSL config issue | Make sure DATABASE_URL has `?sslmode=require` at the end |
| `Unique constraint failed` | Seed was already run | This is safe to ignore — seed uses `upsert`. Just proceed. |

**To re-run the migration:**

```bash
TASK_ARN=$(aws ecs run-task \
  --cluster annex-prod --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --region $AWS_REGION --query "tasks[0].taskArn" --output text)
aws ecs wait tasks-stopped --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION
aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].containers[0].exitCode" --output text
```

### 18.4 ECS service won't stabilize

If `aws ecs wait services-stable` hangs for 10+ minutes, something is wrong.

**Step 1: Check the service events** (most recent failure reason):

```bash
aws ecs describe-services --cluster annex-prod --services annex-api --region $AWS_REGION \
  --query "services[0].events[0:5].message" --output text
```

**Step 2: Find a stopped task and see why it died**:

```bash
TASK_ARN=$(aws ecs list-tasks --cluster annex-prod --service-name annex-api \
  --desired-status STOPPED --region $AWS_REGION --query "taskArns[0]" --output text)

aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].{stopReason:stoppedReason,exitCode:containers[0].exitCode,containerReason:containers[0].reason}"
```

**Step 3: Read the container logs**:

```bash
TASK_ID=$(echo $TASK_ARN | awk -F'/' '{print $NF}')
aws logs tail /ecs/annex-prod --log-stream-names api/api/$TASK_ID --region $AWS_REGION
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `CannotPullContainerError` | ECR image is missing or wrong tag | Re-run section 13. Verify with `aws ecr describe-images --repository-name annex/api` |
| `ResourceInitializationError: unable to retrieve secrets` | Execution role doesn't have Secrets Manager permission | Re-run section 14.3 to attach the policy |
| `Health check failed` | App is running but `/health` returns non-200 | The DB is unreachable from the app, OR the app crashed on startup. Check logs. |
| `Cannot find module '@prisma/client'` | Prisma client wasn't generated in the Docker build | Re-run section 13.5 — the Dockerfile should run `prisma generate` automatically |
| `Error: secretOrPrivateKey must have a value` | JWT_SECRET didn't load | Verify the secret exists and isn't empty: `aws secretsmanager get-secret-value --secret-id annex/prod/jwt-secret` |

**After fixing the issue, force a new deploy:**

```bash
aws ecs update-service --cluster annex-prod --service annex-api \
  --task-definition annex-api --force-new-deployment --region $AWS_REGION
```

### 18.5 ALB returns 5xx errors

- **502 Bad Gateway**: ALB connected to a task but got an invalid response. Usually means the container crashed mid-request. Check container logs.
- **503 Service Unavailable**: No healthy targets in the target group. Check section 18.4.
- **504 Gateway Timeout**: App is too slow. Probably a DB connection issue.

**Check target health:**

```bash
aws elbv2 describe-target-health --target-group-arn $API_TG_ARN --region $AWS_REGION \
  --query "TargetHealthDescriptions[].{ip:Target.Id,state:TargetHealth.State,reason:TargetHealth.Reason}" \
  --output table
```

All targets should be `healthy`. If they're `unhealthy`:
- Container is up but health check fails → check app logs
- Container keeps restarting → see section 18.4

### 18.6 "I forgot to write down an ARN"

Don't panic. You can look up any resource:

```bash
# List all secrets
aws secretsmanager list-secrets --region $AWS_REGION

# List all VPCs
aws ec2 describe-vpcs --region $AWS_REGION --query "Vpcs[?Tags[?Value=='annex-prod-vpc']]"

# Find any subnet by name tag
aws ec2 describe-subnets --filters "Name=tag:Name,Values=annex-public-a" --region $AWS_REGION

# List all security groups in our VPC
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION \
  --query "SecurityGroups[].{name:GroupName,id:GroupId}"
```

Add anything you find back to your notes file.

### 18.7 "I closed my terminal and lost my variables"

You need to re-set your environment variables in a new terminal. Quick way:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Look up each resource by name tag and re-export it
export VPC_ID=$(aws ec2 describe-vpcs --region $AWS_REGION \
  --filters "Name=tag:Name,Values=annex-prod-vpc" --query "Vpcs[0].VpcId" --output text)

export PUBLIC_SUBNET_A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=annex-public-a" --region $AWS_REGION --query "Subnets[0].SubnetId" --output text)
export PUBLIC_SUBNET_B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=annex-public-b" --region $AWS_REGION --query "Subnets[0].SubnetId" --output text)
export PRIVATE_SUBNET_A=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=annex-private-a" --region $AWS_REGION --query "Subnets[0].SubnetId" --output text)
export PRIVATE_SUBNET_B=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=annex-private-b" --region $AWS_REGION --query "Subnets[0].SubnetId" --output text)

export ALB_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=annex-alb-sg" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)
export ECS_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=annex-ecs-sg" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)
export RDS_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=annex-rds-sg" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)
export REDIS_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=annex-redis-sg" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)

export EXECUTION_ROLE_ARN=$(aws iam get-role --role-name annex-ecs-execution-role --query Role.Arn --output text)
export CERT_ARN=$(aws acm list-certificates --region $AWS_REGION --query "CertificateSummaryList[0].CertificateArn" --output text)

echo "All variables restored."
```

Save this as `~/annex-load-env.sh` and run `source ~/annex-load-env.sh` whenever you open a new terminal.

### 18.8 "Docker won't push to ECR"

```
denied: Your authorization token has expired
```

ECR login expires after 12 hours. Re-authenticate:

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 18.9 "I need to start over and delete everything"

If something is badly broken and you want to clean up and restart:

> ⚠️ This will delete all data including the database. Only do this on a non-production environment.

```bash
# Disable deletion protection on RDS first
aws rds modify-db-instance --db-instance-identifier annex-prod-db \
  --no-deletion-protection --apply-immediately --region $AWS_REGION

sleep 30

# Delete services
aws ecs update-service --cluster annex-prod --service annex-api --desired-count 0 --region $AWS_REGION
aws ecs update-service --cluster annex-prod --service annex-web --desired-count 0 --region $AWS_REGION
sleep 30
aws ecs delete-service --cluster annex-prod --service annex-api --force --region $AWS_REGION
aws ecs delete-service --cluster annex-prod --service annex-web --force --region $AWS_REGION

# Delete other resources (listeners, target groups, ALB, RDS, Redis, etc.)
# This gets complex — easier to delete from the AWS Console:
# 1. EC2 → Load Balancers → Delete the ALB
# 2. RDS → Databases → Delete annex-prod-db (don't take final snapshot if you don't care)
# 3. ElastiCache → Delete annex-redis
# 4. OpenSearch → Delete annex-search
# 5. ECS → Delete the annex-prod cluster
# 6. VPC → Delete VPC (will delete all subnets, SGs, IGW, NAT GW with it)
# 7. S3 → Empty + delete bucket
# 8. Secrets Manager → Delete all annex/prod/* secrets
# 9. ECR → Delete the two repositories
```

---

## 19. How to deploy code updates later

Once your initial deploy works, future updates are simple. Save this as `deploy.sh` in your `~/annex-workforce` folder:

```bash
#!/bin/bash
set -e

# Load env vars (must have run source ~/annex-load-env.sh first)
VERSION=$(date +%Y%m%d-%H%M%S)
ECR_API_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/api
ECR_WEB_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/annex/web

# CHANGE this to your actual domain
DOMAIN=annexworkforce.com

echo "→ Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

echo "→ Building API image ($VERSION)..."
docker build --platform linux/amd64 -t $ECR_API_URI:$VERSION -f apps/api/Dockerfile apps/api
docker tag $ECR_API_URI:$VERSION $ECR_API_URI:latest
docker push $ECR_API_URI:$VERSION
docker push $ECR_API_URI:latest

echo "→ Building web image..."
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://api.$DOMAIN \
  -t $ECR_WEB_URI:$VERSION -f apps/web/Dockerfile apps/web
docker tag $ECR_WEB_URI:$VERSION $ECR_WEB_URI:latest
docker push $ECR_WEB_URI:$VERSION
docker push $ECR_WEB_URI:latest

echo "→ Running migrations (safe to re-run, idempotent)..."
TASK_ARN=$(aws ecs run-task --cluster annex-prod --task-definition annex-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_A,$PRIVATE_SUBNET_B],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --region $AWS_REGION --query "tasks[0].taskArn" --output text)
aws ecs wait tasks-stopped --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION
EXIT_CODE=$(aws ecs describe-tasks --cluster annex-prod --tasks $TASK_ARN --region $AWS_REGION \
  --query "tasks[0].containers[0].exitCode" --output text)
if [ "$EXIT_CODE" != "0" ]; then
  echo "✗ Migration failed with exit code $EXIT_CODE. Aborting deploy."
  exit 1
fi

echo "→ Deploying services..."
aws ecs update-service --cluster annex-prod --service annex-api --force-new-deployment --region $AWS_REGION > /dev/null
aws ecs update-service --cluster annex-prod --service annex-web --force-new-deployment --region $AWS_REGION > /dev/null

echo "→ Waiting for stable deployment..."
aws ecs wait services-stable --cluster annex-prod --services annex-api annex-web --region $AWS_REGION

echo "✓ Deployed version $VERSION"
```

Then to deploy:

```bash
chmod +x deploy.sh
./deploy.sh
```

**To roll back** to a previous version:

```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix annex-api --sort DESC --max-items 5 --region $AWS_REGION

# Roll back to a specific revision (e.g. revision 5)
aws ecs update-service --cluster annex-prod --service annex-api \
  --task-definition annex-api:5 --region $AWS_REGION

aws ecs wait services-stable --cluster annex-prod --services annex-api --region $AWS_REGION
```

---

## What's next

You've shipped a working production app. Here's what to do in the coming weeks:

### Within 1 week
- [ ] Set up SendGrid (§ 17.8) so users can receive verification and reset emails
- [ ] Change or remove all demo seed accounts
- [ ] Set up CloudWatch alarms for "ALB 5xx > 1%" and "RDS CPU > 80%" so you get paged when things break
- [ ] Set up a budget alert in AWS Billing for $300/mo

### Within 1 month
- [ ] Move the database to Multi-AZ (`--multi-az`) for redundancy ($25/mo more)
- [ ] Move Redis to a replicated mode (`--num-cache-clusters 2`)
- [ ] Add WAF (Web Application Firewall) to the load balancer
- [ ] Run a backup restore drill — actually restore the database to a test instance and verify it works

### Within 3 months
- [ ] Move everything to Terraform so you can version-control the infrastructure
- [ ] Set up CI/CD via GitHub Actions so deploys happen automatically on `git push`
- [ ] Add a staging environment that mirrors production

---

## Summary

| Section | What you got | Time |
|---------|--------------|------|
| 1-3 | Tools installed and code extracted | 30 min |
| 4-5 | Domain delegated to AWS | 15 min + DNS wait |
| 6 | SSL certificate requested | 10 min + validation wait |
| 7 | Passwords generated and stored | 10 min |
| 8 | VPC, subnets, NAT, security groups | 30 min |
| 9 | PostgreSQL database | 15 min (mostly waiting) |
| 10 | Redis cache | 8 min (mostly waiting) |
| 11 | OpenSearch (optional) | 20 min (mostly waiting) |
| 12 | S3 bucket | 5 min |
| 13 | Docker images built and pushed | 30 min |
| 14 | Database migrated and seeded | 10 min |
| 15-16 | ECS services running, ALB live | 20 min |
| 17 | Verified working in browser | 10 min |
| **Total** | | **~5-7 hours** |

The waits add up — but most of them can run in parallel. By the time the database is ready, the certificate has usually been issued. By the time OpenSearch finishes, you've already done several other steps.

Good luck. If something doesn't work and isn't covered in § 18, the AWS service-specific documentation at https://docs.aws.amazon.com is your friend.
