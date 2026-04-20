#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  MyCloud – Ubuntu EC2 Setup Script
#  Run this once on a fresh Ubuntu 22.04 EC2 instance
# ═══════════════════════════════════════════════════════════════

set -e   # stop on any error

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   MyCloud — AWS S3 Storage App Setup      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# ─── 1. Install Node.js 20 ────────────────────────────────────
echo "▶ Installing Node.js 20…"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "   Node  : $(node -v)"
echo "   npm   : $(npm -v)"

# ─── 2. Install app dependencies ──────────────────────────────
echo ""
echo "▶ Installing npm dependencies…"
npm install

# ─── 3. Done ──────────────────────────────────────────────────
echo ""
echo "✅  Setup complete!"
echo ""
echo "══════════════════════════════════════════════"
echo "  NEXT STEPS"
echo "══════════════════════════════════════════════"
echo ""
echo "1️⃣  CONFIGURE  — edit server.js lines 12-13:"
echo "    AWS_REGION  = 'ap-south-1'        # your region"
echo "    S3_BUCKET   = 'your-bucket-name'  # your S3 bucket"
echo ""
echo "2️⃣  ATTACH IAM ROLE to this EC2 instance:"
echo "    EC2 console → Your instance → Actions → Security"
echo "    → Modify IAM role → select/create a role with:"
echo "      • AmazonS3FullAccess  (or a custom policy)"
echo ""
echo "3️⃣  S3 BUCKET CORS — paste this into your bucket's CORS tab:"
echo '    [{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE"],"AllowedOrigins":["*"],"ExposeHeaders":[]}]'
echo ""
echo "4️⃣  EC2 SECURITY GROUP — allow inbound TCP on port 3000"
echo "    (or 80 if you run on port 80)"
echo ""
echo "5️⃣  START the server:"
echo "    node server.js"
echo ""
echo "6️⃣  Open in browser:"
echo "    http://<your-ec2-public-ip>:3000"
echo ""
