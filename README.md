[README.md](https://github.com/user-attachments/files/27042095/README.md)
# ☁️ MyCloud — AWS S3 Cloud Storage App

A **production-style personal cloud storage web application** built with Node.js, Express, and AWS S3. Designed to run on an AWS EC2 Ubuntu instance with a clean, dark-themed UI similar to Google Drive and Dropbox.

---

## 📁 Project Structure

```
mycloud/
├── server.js          ← Express backend — all API routes
├── package.json       ← Node.js dependencies
├── setup.sh           ← One-command Ubuntu EC2 setup
├── .env               ← AWS credentials & config (auto-created by setup.sh)
├── README.md          ← This file
└── public/
    └── index.html     ← Complete frontend (single file — all HTML + CSS + JS)
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth | Login, Signup, Forgot Password — session-based with token |
| ☁️ S3 Upload | Drag & drop or click to upload — presigned PUT to S3 |
| 🔍 Duplicate Detector | Checks name + size before upload, prompts user |
| 👁️ File Preview | Images lightbox, Video player, PDF iframe, Doc info |
| 🔗 Share Links | One-time or expiring links via presigned S3 URL |
| 🔒 Locked Folders | Password-protected folders — lock pin shown on files |
| 🗑️ Recycle Bin | Soft delete → restore or permanently remove |
| 🌙 Dark / Light Mode | Full theme toggle, saved to localStorage |
| 📋 Activity Log | Tracks all uploads, deletes, logins, shares (last 300) |
| 📊 Analytics | Storage usage, file type breakdown, recent uploads |
| 🔎 Smart Filter | Filter by type, size, date; sort multiple ways |
| 🤖 AI Assistant | Answers questions about your files using real file data |
| ⌨️ Keyboard Shortcuts | Arrow keys, Escape, Ctrl+R, Ctrl+F, Delete key |
| 🖱️ Right-click Menu | Context menu on any file for quick actions |

---

## 🚀 Quick Deploy on AWS EC2

### Step 1 — Launch EC2

1. Go to **EC2 Console → Launch Instance**
2. Choose **Ubuntu 22.04 LTS** (t2.micro for free tier)
3. Create a key pair → download `.pem` file
4. Enable: Allow HTTP, Allow HTTPS in network settings
5. Launch instance

### Step 2 — Open Port 3000

1. EC2 → Instances → Your instance → **Security** tab
2. Click the Security Group link
3. **Inbound rules → Edit → Add rule:**
   - Type: `Custom TCP` · Port: `3000` · Source: `0.0.0.0/0`
4. Save rules

### Step 3 — Connect & Upload Files

Open **EC2 Instance Connect** (browser terminal):

```bash
# Check your instance → Connect → EC2 Instance Connect → Connect
```

Upload your project files:

```bash
# From your local machine:
scp -i your-key.pem -r mycloud/ ubuntu@<ec2-ip>:~/
```

Or clone / download inside the terminal.

### Step 4 — Run Setup Script

```bash
cd ~/mycloud
chmod +x setup.sh
./setup.sh
```

This installs: Node.js 20, all npm packages, PM2 process manager.

### Step 5 — Configure AWS

Edit the `.env` file with your details:

```bash
nano .env
```

```env
PORT=3000
AWS_REGION=ap-south-1
S3_BUCKET=your-bucket-name

# Option A: Use IAM user keys (simple for beginners)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Option B: Leave blank and attach IAM Role to EC2 (more secure)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Step 6 — S3 CORS Policy

In **S3 Console → your bucket → Permissions → CORS**, paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 7 — Start Server

```bash
# Simple start
npm start

# OR with PM2 (keeps running after terminal closes)
pm2 start server.js --name mycloud
pm2 save
pm2 logs mycloud    # view logs
```

### Step 8 — Open in Browser

```
http://<your-ec2-public-ip>:3000
```

**Default login:** `admin@mycloud.com` / `admin123`

---

## 🔑 IAM Role Setup (Recommended — more secure than keys)

Instead of putting access keys in `.env`, attach an IAM Role to your EC2 instance:

1. **IAM Console → Roles → Create role**
   - Trusted entity: `EC2`
   - Permissions: `AmazonS3FullAccess` (or the custom policy below)
   - Name: `mycloud-ec2-role`
2. **EC2 Console → Your instance → Actions → Security → Modify IAM role**
   - Select `mycloud-ec2-role` → Update

**Minimal IAM policy** (more secure than full S3 access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:DeleteObjects"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

Leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` **blank** in `.env` when using a role.

---

## 🔧 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login with email + password |
| `POST` | `/api/auth/signup` | ❌ | Create new account |
| `POST` | `/api/auth/logout` | ✅ | End session |
| `GET`  | `/api/auth/me` | ✅ | Get current user info |
| `POST` | `/api/config` | ❌ | Set AWS credentials at runtime |
| `GET`  | `/api/files` | ✅ | List all S3 objects |
| `POST` | `/api/upload/presign` | ✅ | Get presigned PUT URL (with duplicate check) |
| `POST` | `/api/upload/direct` | ✅ | Upload via server (multipart) |
| `POST` | `/api/upload/confirm` | ✅ | Log a completed presigned upload |
| `POST` | `/api/files/delete` | ✅ | Move to recycle or permanently delete |
| `GET`  | `/api/recycle` | ✅ | List recycle bin contents |
| `POST` | `/api/recycle/restore` | ✅ | Restore file from recycle bin |
| `POST` | `/api/recycle/empty` | ✅ | Permanently delete all recycled files |
| `POST` | `/api/share/create` | ✅ | Generate shareable link |
| `GET`  | `/share/:token` | ❌ | Public share redirect (no auth) |
| `POST` | `/api/folder/lock` | ✅ | Password-lock a folder |
| `POST` | `/api/folder/unlock` | ✅ | Verify folder password |
| `GET`  | `/api/folder/list-locked` | ✅ | List all locked folders |
| `GET`  | `/api/activity` | ✅ | Fetch activity log |
| `DELETE`| `/api/activity` | ✅ | Clear activity log |
| `GET`  | `/api/analytics` | ✅ | Storage stats and breakdown |
| `GET`  | `/api/health` | ❌ | Server health check |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `AWS_REGION` | `ap-south-1` | AWS region for S3 |
| `S3_BUCKET` | `your-bucket-name` | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | _(empty)_ | IAM access key (blank = use EC2 role) |
| `AWS_SECRET_ACCESS_KEY` | _(empty)_ | IAM secret key |
| `AWS_SESSION_TOKEN` | _(empty)_ | STS session token (optional) |
| `MAX_FILE_MB` | `500` | Max upload size in MB |
| `PRESIGN_EXPIRES` | `3600` | Presigned URL expiry in seconds |
| `STORAGE_CAP_GB` | `5` | Display cap for storage bar |

---

## 🛑 Change Default Login

In `server.js`, find and edit the `USERS` object:

```javascript
const USERS = {
  'your@email.com': { name: 'Your Name', password: 'yourpassword' },
  'colleague@email.com': { name: 'Colleague', password: 'theirpassword' },
};
```

> For production, use hashed passwords with `bcrypt` and store users in a database.

---

## 🔄 Keep Server Running (PM2 Commands)

```bash
pm2 start server.js --name mycloud   # Start
pm2 stop mycloud                      # Stop
pm2 restart mycloud                   # Restart
pm2 logs mycloud                      # View logs
pm2 status                            # Check status
pm2 save                              # Save config (survives reboot)
```

---

## 🌐 Use Domain + HTTPS (Optional)

To run on port 80/443 with a custom domain:

```bash
# Install Nginx
sudo apt install nginx -y

# Create reverse proxy config
sudo nano /etc/nginx/sites-available/mycloud
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 500M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mycloud /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Add HTTPS with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

## 🏗️ AWS Services Used

| Service | Role |
|---|---|
| **EC2** | Hosts and runs the Node.js server |
| **S3** | Stores all uploaded files as objects |
| **IAM** | Role/policy grants EC2 permission to access S3 |

> **No Cognito, RDS, Lambda, or other services needed** — this is intentionally minimal for beginners.

---

## 📋 Troubleshooting

| Problem | Fix |
|---|---|
| `AWS SDK not loaded` | Check internet on EC2; `curl https://sdk.amazonaws.com` |
| `Access Denied` on S3 | Check IAM role permissions or key/secret in `.env` |
| `CORS error` in browser | Add the CORS policy to your S3 bucket (Step 6) |
| Port 3000 not reachable | Add inbound rule in EC2 Security Group |
| Files not showing | Check bucket name and region match exactly |
| Server stops on logout | Use `pm2 start server.js` instead of `npm start` |

---

## 📄 License

MIT — free for personal and educational use.
