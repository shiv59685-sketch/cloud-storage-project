// ─────────────────────────────────────────────────────────────
//  MyCloud – Express backend  (Node.js + AWS SDK v3)
//  Runs on EC2 Ubuntu, stores files in S3
// ─────────────────────────────────────────────────────────────
const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const path       = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// ── Config ────────────────────────────────────────────────────
// Edit these four values, or set them as environment variables
const AWS_REGION     = process.env.AWS_REGION     || 'ap-south-1';      // e.g. ap-south-1 for Mumbai
const S3_BUCKET      = process.env.S3_BUCKET      || 'your-bucket-name';
const PORT           = process.env.PORT           || 3000;
const PRESIGN_EXPIRY = 3600; // seconds a presigned URL stays valid

// ── AWS S3 Client ─────────────────────────────────────────────
// Credentials are picked up automatically from:
//   1. EC2 Instance Profile (IAM Role attached to EC2) ← recommended
//   2. ~/.aws/credentials on the VM
//   3. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars
const s3 = new S3Client({ region: AWS_REGION });

// ── Express setup ─────────────────────────────────────────────
const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500 MB max

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html

// ── Helper: humanise file size ────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes/1024).toFixed(1)} KB`;
  if (bytes < 1073741824)  return `${(bytes/1048576).toFixed(1)} MB`;
  return `${(bytes/1073741824).toFixed(2)} GB`;
}

// ── Helper: detect file type from extension / mime ────────────
function detectType(key, contentType = '') {
  const ext = key.split('.').pop().toLowerCase();
  const imgExts  = ['jpg','jpeg','png','gif','webp','bmp','svg','avif','heic'];
  const vidExts  = ['mp4','mov','avi','mkv','webm','flv','wmv','m4v'];
  const docExts  = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','md','csv','json','xml'];
  if (imgExts.includes(ext) || contentType.startsWith('image/'))  return 'image';
  if (vidExts.includes(ext) || contentType.startsWith('video/'))  return 'video';
  if (docExts.includes(ext) || contentType.includes('pdf') || contentType.includes('msword')) return 'doc';
  return 'other';
}

// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// ── GET /api/files  – list all objects in S3 bucket ──────────
app.get('/api/files', async (req, res) => {
  try {
    const prefix = req.query.prefix || ''; // optional folder prefix
    const cmd    = new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, MaxKeys: 500 });
    const data   = await s3.send(cmd);

    const items = await Promise.all(
      (data.Contents || [])
        .filter(obj => !obj.Key.endsWith('/')) // skip "folder" keys
        .map(async obj => {
          // build a presigned GET URL for each file
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: S3_BUCKET, Key: obj.Key }),
            { expiresIn: PRESIGN_EXPIRY }
          );
          return {
            key:      obj.Key,
            name:     obj.Key.split('/').pop(),
            size:     fmtSize(obj.Size),
            rawSize:  obj.Size,
            date:     obj.LastModified,
            type:     detectType(obj.Key),
            url,                           // presigned download / preview URL
          };
        })
    );

    res.json({ files: items, bucket: S3_BUCKET, region: AWS_REGION });
  } catch (err) {
    console.error('LIST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload  – upload one or more files to S3 ───────
app.post('/api/upload', upload.array('files', 20), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'No files provided' });

  const folder  = req.body.folder ? req.body.folder.replace(/\/+$/, '') + '/' : '';
  const results = [];

  for (const file of req.files) {
    const key = `${folder}${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket:      S3_BUCKET,
        Key:         key,
        Body:        file.buffer,
        ContentType: file.mimetype,
      }));
      results.push({ key, name: file.originalname, size: fmtSize(file.size), ok: true });
    } catch (err) {
      results.push({ key, name: file.originalname, ok: false, error: err.message });
    }
  }

  res.json({ uploaded: results });
});

// ── GET /api/presign?key=…  – get a fresh presigned URL ──────
app.get('/api/presign', async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn: PRESIGN_EXPIRY }
    );
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/files  – delete one or many files from S3 ────
app.delete('/api/files', async (req, res) => {
  const { keys } = req.body; // array of S3 keys
  if (!keys || !Array.isArray(keys) || keys.length === 0)
    return res.status(400).json({ error: 'keys[] required' });

  try {
    if (keys.length === 1) {
      await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: keys[0] }));
    } else {
      await s3.send(new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: { Objects: keys.map(k => ({ Key: k })), Quiet: false },
      }));
    }
    res.json({ deleted: keys });
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/health  – quick health check ────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', bucket: S3_BUCKET, region: AWS_REGION, time: new Date() })
);

// ── Fallback: serve index.html for any unmatched route ────────
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`\n🚀 MyCloud server running on http://0.0.0.0:${PORT}\n   Bucket: ${S3_BUCKET}  |  Region: ${AWS_REGION}\n`)
);
