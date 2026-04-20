# ☁️ MyCloud — AWS S3 Storage App

A clean, dark-themed personal cloud storage web app that runs on your **AWS EC2 Ubuntu VM** and stores all files in **Amazon S3**.

---

## 📁 Project Structure

```
cloud-storage/
├── server.js          ← Node.js + Express backend (AWS S3 API)
├── package.json       ← Dependencies
├── setup.sh           ← One-time Ubuntu setup script
└── public/
    └── index.html     ← Full frontend UI (served by Express)
```

---

## 🚀 Deploy on EC2 Ubuntu — Step by Step

### Step 1 — SSH into your EC2 instance

```bash
ssh -i your-key.pem ubuntu@<your-ec2-public-ip>
```

### Step 2 — Upload project files to EC2

From your local machine:
```bash
scp -i your-key.pem -r cloud-storage/ ubuntu@<your-ec2-ip>:~/
```

### Step 3 — Run the setup script

```bash
cd ~/cloud-storage
chmod +x setup.sh
./setup.sh
```

This installs Node.js 20 and all npm packages.

### Step 4 — Configure your S3 bucket and region

Edit `server.js` lines 12–13:

```javascript
const AWS_REGION = 'ap-south-1';       // ← your AWS region
const S3_BUCKET  = 'your-bucket-name'; // ← your S3 bucket name
```

Or use environment variables (no code edits needed):

```bash
export AWS_REGION=ap-south-1
export S3_BUCKET=your-bucket-name
```

### Step 5 — Attach an IAM Role to your EC2 instance

> This is how the server talks to S3 without hardcoding credentials.

1. Go to **EC2 Console → Instances → your instance**
2. Click **Actions → Security → Modify IAM role**
3. Create a new role (or use existing):
   - Trusted entity: **EC2**
   - Policy: **AmazonS3FullAccess** (or a custom policy below)
4. Attach the role to your instance

**Minimal custom IAM policy** (more secure than full access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

### Step 6 — Set S3 Bucket CORS policy

In the **S3 Console → your bucket → Permissions → CORS**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### Step 7 — Open port 3000 in EC2 Security Group

1. EC2 Console → Security Groups → your instance's SG
2. **Inbound rules → Edit → Add rule**:
   - Type: Custom TCP
   - Port: **3000**
   - Source: **0.0.0.0/0** (or your IP for security)

### Step 8 — Start the server

```bash
node server.js
```

You should see:
```
🚀 MyCloud server running on http://0.0.0.0:3000
   Bucket: your-bucket-name  |  Region: ap-south-1
```

### Step 9 — Open in your browser

```
http://<your-ec2-public-ip>:3000
```

---

## 🔄 Keep the server running (optional — using PM2)

```bash
# Install PM2 process manager
npm install -g pm2

# Start with PM2
pm2 start server.js --name mycloud

# Auto-restart on reboot
pm2 startup
pm2 save
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 📤 Upload | Drag & drop or click to upload any file to S3 |
| 🖼️ Image gallery | Lightbox viewer with arrow key navigation |
| 📂 Browse | Grid and list views |
| 🔍 Search & filter | Live search + sidebar category filter |
| 🗑️ Delete | Single or bulk delete from S3 |
| ⬇️ Download | Presigned URL download for any file |
| 📊 Storage meter | Shows total S3 usage |

---

## 🔑 API Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `/api/files` | List all S3 objects with presigned URLs |
| POST | `/api/upload` | Upload files (multipart/form-data) |
| DELETE | `/api/files` | Delete one or many S3 objects |
| GET | `/api/presign?key=…` | Get a fresh presigned URL |
| GET | `/api/health` | Health check |

---

## 🌐 AWS Services Used

| Service | Role |
|---|---|
| **EC2** | Hosts and runs this Node.js server |
| **S3** | Stores all uploaded files |
| **IAM** | Role attached to EC2 grants S3 access |
