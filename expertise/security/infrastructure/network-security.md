# Network Security — Security Expertise Module

> **Purpose:** Comprehensive reference for AI agents to implement secure network architectures,
> prevent network-layer attacks, and enforce defense-in-depth across cloud and on-premise
> environments.
>
> **Last updated:** 2026-03-08
> **Sources:** NIST SP 800-207 (Zero Trust Architecture), NIST SP 800-53 Rev 5, OWASP SSRF
> Prevention Cheat Sheet, PCI-DSS v4.0.1, CISA Zero Trust Guidance, Cloudflare DDoS Reports
> 2024, Verizon DBIR 2024, CWE/MITRE, vendor documentation (AWS, GCP, Kubernetes).

---

## 1. Threat Landscape

### 1.1 Scale of the Problem

Network-layer attacks remain among the most damaging vectors in cybersecurity. The attack
surface has expanded dramatically with cloud adoption, microservices, and remote work:

- **DDoS attacks increased 49%** in Q3 2024, with record-breaking attacks reaching
  **4.2 terabits per second** (Cloudflare).
- **SSRF (CWE-918)** entered the OWASP Top 10 in 2021 and remains a critical threat in
  cloud-native environments where metadata services expose credentials.
- **Lateral movement** is present in **70% of successful breaches** — attackers who gain
  initial access pivot through flat networks to reach high-value targets.
- **DNS attacks** affect **90% of organizations** annually, with DNS tunneling and cache
  poisoning among the most common vectors (IDC Global DNS Threat Report).
- The average **breakout time** (initial access to lateral movement) is **48 minutes**
  (CrowdStrike 2024 Global Threat Report).
- **Man-in-the-middle (MITM)** attacks exploit unencrypted internal traffic — a problem
  worsened by the misconception that internal networks are inherently trusted.

### 1.2 Common Network Attack Vectors

| Attack Vector              | Description                                                      | Impact     |
|----------------------------|------------------------------------------------------------------|------------|
| SSRF (CWE-918)             | Server makes requests to attacker-controlled destinations        | Critical   |
| DDoS (Volumetric/App)      | Overwhelms resources with traffic or application-layer requests  | High       |
| DNS Cache Poisoning        | Corrupts DNS resolver cache to redirect traffic                  | High       |
| DNS Tunneling              | Exfiltrates data by encoding it in DNS queries                   | High       |
| Man-in-the-Middle (MITM)   | Intercepts unencrypted communication between services            | Critical   |
| Lateral Movement           | Pivots from compromised host to other internal systems           | Critical   |
| Network Sniffing           | Captures unencrypted traffic on shared network segments          | High       |
| ARP Spoofing               | Redirects local network traffic via forged ARP responses         | Medium     |
| BGP Hijacking              | Redirects internet traffic by announcing false routing info      | Critical   |
| Port Scanning/Enumeration  | Discovers exposed services and open ports for exploitation       | Medium     |

### 1.3 Real-World Breaches

**Capital One (2019) — SSRF via Metadata Service**
A former AWS employee exploited a Server-Side Request Forgery (SSRF) vulnerability in Capital
One's misconfigured Web Application Firewall (WAF). The attacker crafted requests that
reached the AWS EC2 instance metadata service at `169.254.169.254`, retrieving temporary IAM
role credentials. These credentials had overly permissive S3 access, allowing the attacker to
exfiltrate data on **106 million customers**, including Social Security numbers, bank account
numbers, and credit scores. The breach went undetected for four months (March to July 2019).
AWS subsequently released IMDSv2, requiring session tokens for metadata access. Capital One
was fined **$80 million** by the OCC.

Key lessons:
- SSRF + cloud metadata services = credential theft at scale
- WAF components should never have broad S3 read permissions (least privilege)
- IMDSv2 with hop limit of 1 blocks SSRF-based metadata access
- Egress filtering would have prevented the WAF from reaching the metadata endpoint

**SolarWinds (2020) — Supply Chain to Lateral Movement**
Russian state-sponsored attackers (APT29/Cozy Bear) compromised the SolarWinds Orion build
system, injecting the SUNBURST backdoor into updates distributed to approximately 18,000
organizations. Once inside target networks, the attackers employed sophisticated lateral
movement techniques:
- **TEARDROP** malware dropped Cobalt Strike BEACON payloads for lateral movement
- **Raindrop** malware spread across victim networks to additional hosts
- **Golden Ticket attacks** forged Kerberos tickets for domain-wide access
- **Token manipulation** spoofed authentication tokens to move between systems
- Attackers used legitimate tools (PsExec, RDP, PowerShell) to blend with normal activity

The attackers maintained persistent access to US federal agencies and Fortune 500 companies
for over 9 months before detection. The breach demonstrated that flat internal networks with
implicit trust allow catastrophic lateral movement.

Key lessons:
- Network segmentation limits blast radius of supply chain compromises
- Zero trust architecture would have required re-authentication at each segment boundary
- East-west traffic monitoring is as critical as perimeter monitoring
- Behavioral analytics can detect anomalous internal access patterns

### 1.4 Emerging Trends

- **SSRF in cloud-native**: Container orchestration, serverless functions, and service meshes
  create new SSRF targets (Kubernetes API server, cloud metadata endpoints)
- **Zero trust adoption**: Gartner projects 10% of large enterprises will have mature zero
  trust programs by 2026, up from less than 1% in 2022
- **AI-powered DDoS**: Attacks increasingly use AI to adapt patterns in real-time, evading
  static mitigation rules
- **Encrypted traffic abuse**: Attackers hide C2 traffic in legitimate TLS connections,
  requiring TLS inspection at network boundaries
- **API-layer attacks**: Network security must extend to API gateways as east-west API
  traffic grows exponentially in microservice architectures

---

## 2. Core Security Principles

### 2.1 Defense in Depth

No single control is sufficient. Layer network defenses so that failure of one control does
not result in a breach:

```
Internet → CDN/DDoS Protection → WAF → Load Balancer → Network Firewall
    → Security Group → Subnet ACL → Host Firewall → Application Controls
```

Each layer filters progressively more specific threats. Perimeter controls stop volumetric
attacks; inner layers enforce application-specific policies.

### 2.2 Zero Trust Architecture (NIST SP 800-207)

Core tenets:
1. **Never trust, always verify** — No implicit trust based on network location
2. **Assume breach** — Design controls assuming attackers are already inside
3. **Verify explicitly** — Authenticate and authorize every access request using identity,
   device posture, and context
4. **Least privilege access** — Grant minimum permissions per session
5. **All communication secured** — Encrypt all traffic regardless of network location
6. **Per-session access** — No persistent access grants; re-evaluate continuously

Zero trust components (NIST 800-207):
- **Policy Engine (PE)**: Decides whether to grant access based on policy
- **Policy Administrator (PA)**: Establishes or shuts down communication paths
- **Policy Enforcement Point (PEP)**: Enables, monitors, and terminates connections

### 2.3 Network Segmentation

Divide networks into isolated zones with controlled communication paths:

- **DMZ**: Public-facing services isolated from internal networks
- **Application tier**: Business logic services, no direct internet access
- **Data tier**: Databases and storage, accessible only from application tier
- **Management plane**: Administrative access via bastion hosts or VPN only
- **Microsegmentation**: Per-workload policies (e.g., Kubernetes NetworkPolicy, VM-level
  security groups) that restrict communication to only declared dependencies

### 2.4 Least Privilege Network Access

- Services should only be able to reach the specific hosts and ports they need
- Default-deny firewall rules: block everything, then allow specific flows
- Separate management traffic from data traffic
- Restrict outbound (egress) traffic to known-good destinations

### 2.5 Mutual TLS (mTLS)

Encrypt and authenticate all service-to-service communication:
- Both client and server present certificates, proving identity
- Prevents MITM, eavesdropping, and unauthorized service impersonation
- Service meshes (Istio, Linkerd) automate mTLS across microservices
- Use TLS 1.3 for all new deployments — stronger cipher suites, faster handshake

### 2.6 Egress Filtering

Control what leaves your network, not just what enters:
- Block all outbound traffic by default; allow only known destinations
- Prevents data exfiltration, C2 communication, and SSRF exploitation
- Log all egress traffic for forensic analysis
- Use DNS-based filtering to block connections to known malicious domains

---

## 3. Implementation Patterns

### 3.1 SSRF Prevention

SSRF is the most critical network vulnerability in cloud environments. A multi-layered
approach is required:

**Layer 1: Input Validation and URL Allowlisting**
```typescript
// VULNERABLE: No URL validation — attacker controls destination
async function fetchUrl(req: Request, res: Response) {
  const url = req.query.url as string;
  const response = await fetch(url); // SSRF: attacker can target internal services
  res.json(await response.json());
}

// SECURE: Strict URL allowlist with validation
import { URL } from 'url';
import net from 'net';

const ALLOWED_HOSTS = new Set([
  'api.example.com',
  'cdn.example.com',
  'images.example.com',
]);

const BLOCKED_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 Class B
  /^192\.168\./,               // RFC 1918 Class C
  /^169\.254\./,               // Link-local (AWS metadata!)
  /^0\./,                      // Current network
  /^::1$/,                     // IPv6 loopback
  /^fc00:/,                    // IPv6 ULA
  /^fe80:/,                    // IPv6 link-local
];

function isBlockedIP(ip: string): boolean {
  return BLOCKED_IP_RANGES.some(range => range.test(ip));
}

async function resolveAndValidate(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Protocol allowlist — only HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  // Host allowlist
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Host not in allowlist: ${parsed.hostname}`);
  }

  // DNS resolution check — prevent DNS rebinding
  const { address } = await import('dns').then(dns =>
    dns.promises.resolve4(parsed.hostname).then(addrs => ({ address: addrs[0] }))
  );

  if (isBlockedIP(address)) {
    throw new Error('Resolved IP is in a blocked range');
  }

  return parsed;
}

async function fetchUrlSecure(req: Request, res: Response) {
  try {
    const validatedUrl = await resolveAndValidate(req.query.url as string);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(validatedUrl.toString(), {
      signal: controller.signal,
      redirect: 'error', // Do not follow redirects (redirect-based SSRF bypass)
    });
    clearTimeout(timeout);

    res.json(await response.json());
  } catch (error) {
    res.status(400).json({ error: 'Request blocked by security policy' });
  }
}
```

**Layer 2: Cloud Metadata Service Protection**
```bash
# AWS: Enforce IMDSv2 (requires session token, blocks SSRF from containers)
aws ec2 modify-instance-metadata-options \
  --instance-id i-1234567890abcdef0 \
  --http-tokens required \
  --http-put-response-hop-limit 1 \
  --http-endpoint enabled

# GCP: Disable legacy metadata endpoint
# Set metadata header requirement in instance template
gcloud compute instances add-metadata INSTANCE_NAME \
  --metadata disable-legacy-endpoints=true
```

**Layer 3: Network-Level Controls**
```bash
# iptables: Block outbound requests to metadata service from application containers
iptables -A OUTPUT -d 169.254.169.254 -j DROP

# AWS Security Group: Restrict outbound to specific destinations only
# (Default security groups allow all outbound — change this)
```

### 3.2 Network Segmentation

**AWS VPC Architecture:**
```hcl
# Terraform: Three-tier VPC with strict segmentation
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

# Public subnet — load balancers only, no direct app access
resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  map_public_ip_on_launch = false  # No auto-assign public IPs
}

# Private subnet — application tier
resource "aws_subnet" "app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
}

# Isolated subnet — databases, no internet access
resource "aws_subnet" "data" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.20.0/24"
  availability_zone = "us-east-1a"
}

# Network ACL: Data tier only accepts traffic from app tier
resource "aws_network_acl" "data_tier" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.data.id]

  ingress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.10.0/24"  # App tier only
    from_port  = 5432             # PostgreSQL
    to_port    = 5432
  }

  ingress {
    rule_no    = 999
    protocol   = "-1"
    action     = "deny"
    cidr_block = "0.0.0.0/0"     # Deny everything else
    from_port  = 0
    to_port    = 0
  }

  egress {
    rule_no    = 100
    protocol   = "tcp"
    action     = "allow"
    cidr_block = "10.0.10.0/24"
    from_port  = 1024
    to_port    = 65535            # Ephemeral ports for responses
  }
}
```

### 3.3 mTLS Implementation

**Node.js mTLS Server and Client:**
```typescript
import https from 'https';
import fs from 'fs';
import tls from 'tls';

// mTLS Server — requires client certificate
const serverOptions: https.ServerOptions = {
  key: fs.readFileSync('/certs/server-key.pem'),
  cert: fs.readFileSync('/certs/server-cert.pem'),
  ca: fs.readFileSync('/certs/ca-cert.pem'),   // CA that signed client certs
  requestCert: true,        // Require client certificate
  rejectUnauthorized: true, // Reject connections without valid client cert
  minVersion: 'TLSv1.3' as tls.SecureVersion,  // Enforce TLS 1.3
};

const server = https.createServer(serverOptions, (req, res) => {
  const clientCert = req.socket.getPeerCertificate();
  console.log(`Authenticated client: ${clientCert.subject.CN}`);
  res.writeHead(200);
  res.end(JSON.stringify({ status: 'authenticated', client: clientCert.subject.CN }));
});

server.listen(8443);

// mTLS Client — presents client certificate
const clientOptions: https.RequestOptions = {
  hostname: 'service.internal',
  port: 8443,
  path: '/api/data',
  method: 'GET',
  key: fs.readFileSync('/certs/client-key.pem'),
  cert: fs.readFileSync('/certs/client-cert.pem'),
  ca: fs.readFileSync('/certs/ca-cert.pem'),
  minVersion: 'TLSv1.3' as tls.SecureVersion,
};

const req = https.request(clientOptions, (res) => {
  res.on('data', (data) => console.log(data.toString()));
});
req.end();
```

**Istio Service Mesh — Mesh-wide Strict mTLS:**
```yaml
# PeerAuthentication: enforce mTLS for all services in the mesh
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system    # Mesh-wide policy
spec:
  mtls:
    mode: STRICT             # Only accept mTLS connections

---
# DestinationRule: ensure all outgoing traffic uses mTLS
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default
  namespace: istio-system
spec:
  host: "*.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL     # Use Istio-managed certificates
```

### 3.4 DNS Security

```bash
# BIND DNSSEC configuration — sign your zones
# Generate Zone Signing Key (ZSK) and Key Signing Key (KSK)
dnssec-keygen -a ECDSAP256SHA256 -n ZONE example.com        # ZSK
dnssec-keygen -a ECDSAP256SHA256 -n ZONE -f KSK example.com # KSK

# Sign the zone
dnssec-signzone -A -3 $(head -c 1000 /dev/urandom | sha1sum | cut -b 1-16) \
  -N INCREMENT -o example.com -t example.com.zone
```

DNS transport security options:
- **DoT (DNS over TLS)**: Uses TCP port 853; encrypted but identifiable as DNS traffic
- **DoH (DNS over HTTPS)**: Uses TCP port 443; encrypted and indistinguishable from HTTPS
- **DoQ (DNS over QUIC)**: Emerging standard with lower latency than DoT/DoH
- **DNSSEC**: Validates DNS response authenticity via cryptographic signatures (does not
  encrypt, complements DoT/DoH)

Best practice: Deploy DNSSEC for response validation + DoT/DoH for transport encryption.

### 3.5 DDoS Mitigation

Multi-layered DDoS defense:

```
Layer 3/4 (Network/Transport):
  ├── CDN absorption (Cloudflare, AWS CloudFront, Akamai)
  ├── Anycast routing (distribute traffic across global PoPs)
  ├── BGP blackholing (last resort for volumetric attacks)
  └── SYN cookies (prevent SYN flood state exhaustion)

Layer 7 (Application):
  ├── WAF rules (block malicious request patterns)
  ├── Rate limiting (per-IP, per-API-key, per-geo)
  ├── CAPTCHA challenges (for suspected bot traffic)
  └── Request size limits (prevent Slowloris/slow POST)
```

**Rate Limiting Middleware (TypeScript/Express):**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({ host: 'redis.internal', port: 6379, tls: {} });

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.call(...args) }),
  windowMs: 15 * 60 * 1000,  // 15-minute window
  max: 100,                    // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For behind trusted proxy, fall back to IP
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                      // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### 3.6 Egress Filtering

```bash
# iptables: Default-deny outbound, allow only specific destinations
# Drop all outbound traffic by default
iptables -P OUTPUT DROP

# Allow DNS to internal resolver only
iptables -A OUTPUT -p udp --dport 53 -d 10.0.0.2 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -d 10.0.0.2 -j ACCEPT

# Allow HTTPS to specific external services
iptables -A OUTPUT -p tcp --dport 443 -d api.stripe.com -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -d api.github.com -j ACCEPT

# Allow established connections (responses to allowed outbound)
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Log and drop everything else
iptables -A OUTPUT -j LOG --log-prefix "EGRESS_BLOCKED: "
iptables -A OUTPUT -j DROP
```

### 3.7 Bastion Hosts and VPN Alternatives

Traditional bastion/jump host pattern:
- Single hardened SSH entry point for administrative access
- All admin traffic tunneled through bastion; no direct access to internal hosts
- Session logging and MFA required on bastion

Modern alternatives:
- **WireGuard**: Lightweight kernel-level VPN; minimal attack surface, ~4,000 lines of code
  vs OpenVPN's ~100,000
- **Tailscale**: WireGuard-based mesh VPN with identity-aware access; no exposed ports
- **Cloudflare Access / AWS SSM Session Manager**: Zero-trust alternatives that eliminate
  the need for VPNs or bastions entirely; access granted per-session based on identity

---

## 4. Vulnerability Catalog

### 4.1 SSRF — Server-Side Request Forgery (CWE-918)

**Severity:** Critical | **CVSS:** 7.5-9.8
**Description:** Application makes HTTP requests to attacker-controlled URLs, accessing
internal services, cloud metadata, or arbitrary endpoints.
**Detection:** Review all code paths that fetch external URLs; scan for `fetch()`, `axios`,
`http.get()`, `urllib`, `requests.get()` with user-controlled input.
**Fix:** URL allowlisting, DNS resolution validation, block private IP ranges, enforce
IMDSv2, disable HTTP redirects in outbound requests.

### 4.2 Open DNS Resolver (CWE-406)

**Severity:** High | **CVSS:** 7.5
**Description:** DNS server responds to queries from any source, enabling DNS amplification
DDoS attacks and cache poisoning.
**Detection:** `nmap -sU -p 53 --script dns-recursion <target>`
**Fix:** Restrict recursive queries to internal clients only; configure `allow-recursion`
in BIND or equivalent.

### 4.3 Missing Network Segmentation (CWE-1008)

**Severity:** High | **CVSS:** 7.0-9.0
**Description:** Flat network topology allows unrestricted lateral movement after initial
compromise.
**Detection:** Network topology review; attempt cross-tier connectivity tests.
**Fix:** Implement VPC/VLAN segmentation, security groups, NACLs with default-deny.

### 4.4 Permissive Egress Rules (CWE-441)

**Severity:** High | **CVSS:** 6.5-8.0
**Description:** Outbound traffic not restricted, allowing data exfiltration and C2
communication after compromise.
**Detection:** Review security group and firewall egress rules; test outbound connectivity
to arbitrary hosts.
**Fix:** Default-deny egress; allow only specific required destinations and ports.

### 4.5 Unencrypted Internal Traffic (CWE-319)

**Severity:** High | **CVSS:** 6.5-7.5
**Description:** Service-to-service communication uses plaintext HTTP, allowing MITM
attacks and credential interception on internal networks.
**Detection:** Network traffic capture; check for HTTP (not HTTPS) on internal ports.
**Fix:** Enforce mTLS for all service-to-service communication; use service mesh.

### 4.6 Exposed Management Ports (CWE-284)

**Severity:** Critical | **CVSS:** 8.0-9.8
**Description:** Administrative interfaces (SSH:22, RDP:3389, database ports, Kubernetes
API:6443) exposed to the internet or overly broad network ranges.
**Detection:** `nmap -sV -p 22,3389,5432,3306,6443,8443,9200 <target>`
**Fix:** Restrict management ports to bastion/VPN only; use security groups; disable
public IP assignment on management interfaces.

### 4.7 Missing DNSSEC Validation (CWE-345)

**Severity:** Medium | **CVSS:** 5.9
**Description:** DNS resolver does not validate DNSSEC signatures, allowing cache poisoning
and DNS spoofing attacks.
**Detection:** `dig +dnssec example.com`; verify AD (Authenticated Data) flag in response.
**Fix:** Enable DNSSEC validation on recursive resolvers; sign authoritative zones.

### 4.8 Insecure TLS Configuration (CWE-326)

**Severity:** High | **CVSS:** 7.4
**Description:** Server supports deprecated TLS versions (1.0, 1.1) or weak cipher suites,
enabling protocol downgrade attacks.
**Detection:** `nmap --script ssl-enum-ciphers -p 443 <target>` or `testssl.sh`.
**Fix:** Enforce TLS 1.2+ minimum (TLS 1.3 preferred); disable CBC-mode ciphers;
use ECDHE key exchange.

### 4.9 DNS Rebinding (CWE-350)

**Severity:** High | **CVSS:** 7.5
**Description:** Attacker-controlled DNS alternates between public and private IPs, bypassing
SSRF protections that only validate at initial resolution time.
**Detection:** Test URL fetch functions with DNS names that resolve to private IPs after TTL.
**Fix:** Re-resolve DNS immediately before connection; pin resolved IP; set minimum TTL
for SSRF validation.

### 4.10 Missing Rate Limiting (CWE-770)

**Severity:** Medium | **CVSS:** 5.3-7.5
**Description:** No request rate limits on APIs or authentication endpoints, enabling brute
force attacks and application-layer DDoS.
**Detection:** Send high-volume requests and check for 429 responses.
**Fix:** Implement per-IP and per-user rate limiting with progressive backoff.

### 4.11 Unrestricted Cross-Zone Traffic (CWE-923)

**Severity:** High | **CVSS:** 7.0
**Description:** Kubernetes pods or cloud instances can communicate across namespaces or
security zones without restriction.
**Detection:** Deploy a test pod and attempt connections to pods in other namespaces.
**Fix:** Default-deny NetworkPolicy in every namespace; explicit ingress/egress rules.

### 4.12 Exposed Cloud Metadata Endpoint (CWE-918)

**Severity:** Critical | **CVSS:** 9.0
**Description:** Cloud instance metadata service (169.254.169.254) accessible to application
code, enabling credential theft via SSRF.
**Detection:** `curl http://169.254.169.254/latest/meta-data/` from application container.
**Fix:** Enforce IMDSv2 (AWS), disable legacy endpoints (GCP), use managed identities with
minimal permissions.

### 4.13 Unmonitored East-West Traffic (CWE-778)

**Severity:** Medium | **CVSS:** 5.0-6.5
**Description:** No logging or monitoring of internal (east-west) network traffic, preventing
detection of lateral movement.
**Detection:** Check for VPC flow logs, network monitoring tools, IDS coverage of internal
segments.
**Fix:** Enable VPC flow logs, deploy IDS on internal segments, implement behavioral
analytics for east-west traffic.

---

## 5. Security Checklist

### Network Architecture
- [ ] Network segmented into security zones (DMZ, app, data, management)
- [ ] Default-deny firewall rules on all network boundaries
- [ ] VPC flow logs enabled and shipped to SIEM
- [ ] No flat network topology — microsegmentation applied
- [ ] Private subnets have no direct internet access (use NAT gateway)
- [ ] Management ports accessible only via bastion host or zero-trust proxy

### SSRF Prevention
- [ ] All user-supplied URLs validated against strict allowlist
- [ ] Private/reserved IP ranges blocked in outbound requests
- [ ] Cloud metadata endpoint protected (IMDSv2 enforced, hop limit = 1)
- [ ] HTTP redirects disabled in server-side URL fetching
- [ ] DNS resolution validated before connection (prevent DNS rebinding)

### Encryption & Authentication
- [ ] mTLS enforced for all service-to-service communication
- [ ] TLS 1.3 used for all new services; TLS 1.2 minimum for legacy
- [ ] No plaintext HTTP on any internal or external endpoint
- [ ] Certificate rotation automated (cert-manager, ACME, or equivalent)
- [ ] Certificate pinning for critical service-to-service connections

### DNS Security
- [ ] DNSSEC enabled and validated on all resolvers
- [ ] DNS over TLS (DoT) or DNS over HTTPS (DoH) for transport encryption
- [ ] DNS query logging enabled for forensic analysis
- [ ] No open DNS resolvers exposed to the internet

### DDoS & Rate Limiting
- [ ] CDN with DDoS absorption in front of all public endpoints
- [ ] WAF deployed with OWASP Core Rule Set
- [ ] Rate limiting on all API endpoints (per-IP and per-user)
- [ ] Stricter rate limits on authentication endpoints
- [ ] SYN cookies enabled on all public-facing servers

### Egress & Monitoring
- [ ] Egress traffic filtered — default-deny outbound
- [ ] All outbound connections logged and monitored
- [ ] IDS/IPS deployed on internal network segments
- [ ] Anomalous lateral movement triggers alerts
- [ ] Regular external penetration tests of network perimeter

---

## 6. Tools & Automation

### Network Scanning & Assessment

| Tool              | Purpose                                      | Usage                                |
|-------------------|----------------------------------------------|--------------------------------------|
| **nmap**          | Port scanning, service enumeration           | `nmap -sV -sC -p- target`           |
| **Wireshark**     | Packet capture and analysis                  | GUI analysis of pcap files           |
| **masscan**       | High-speed port scanning                     | `masscan -p0-65535 --rate=10000`     |
| **testssl.sh**    | TLS configuration testing                    | `testssl.sh https://target`          |
| **dig/drill**     | DNS interrogation and DNSSEC validation      | `dig +dnssec +trace example.com`     |
| **Nuclei**        | Vulnerability scanning with templates        | `nuclei -u target -t network/`       |

### Intrusion Detection & Prevention

| Tool              | Purpose                                      | Deployment                           |
|-------------------|----------------------------------------------|--------------------------------------|
| **Suricata**      | IDS/IPS with multi-threading                 | Inline or passive on network taps    |
| **Snort**         | Signature-based IDS/IPS                      | Network tap or span port             |
| **Zeek (Bro)**    | Network traffic analysis and logging         | Passive monitoring, metadata logging |
| **OSSEC/Wazuh**   | Host-based intrusion detection               | Agent on each host                   |
| **Falco**         | Runtime container/K8s threat detection       | DaemonSet in Kubernetes              |

### WAF & DDoS Protection

| Tool/Service            | Purpose                                | Type       |
|-------------------------|----------------------------------------|------------|
| **Cloudflare**          | CDN, DDoS protection, WAF              | SaaS       |
| **AWS Shield + WAF**    | AWS-native DDoS and WAF                | Cloud      |
| **GCP Cloud Armor**     | GCP-native DDoS and WAF                | Cloud      |
| **ModSecurity**         | Open-source WAF (OWASP CRS)            | Self-hosted|
| **Fastly / Akamai**     | CDN with advanced DDoS mitigation      | SaaS       |

### Network Policy & Service Mesh

| Tool              | Purpose                                      | Platform                |
|-------------------|----------------------------------------------|-------------------------|
| **Calico**        | Kubernetes network policy engine             | Kubernetes              |
| **Cilium**        | eBPF-based networking and security           | Kubernetes              |
| **Istio**         | Service mesh with mTLS, traffic control      | Kubernetes              |
| **Linkerd**       | Lightweight service mesh with mTLS           | Kubernetes              |
| **Consul Connect**| Service mesh with intentions-based access    | Multi-platform          |

---

## 7. Platform-Specific Guidance

### 7.1 AWS VPC Security

```hcl
# Security Group: application tier — strict ingress/egress
resource "aws_security_group" "app_tier" {
  vpc_id = aws_vpc.main.id
  name   = "app-tier-sg"

  # Ingress: only from load balancer on port 8080
  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.lb.id]
  }

  # Egress: only to database tier on PostgreSQL port
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.data_tier.id]
  }

  # Egress: HTTPS to specific external services via NAT
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Filtered further by NACL/proxy
  }
}
```

Key AWS controls:
- **VPC Flow Logs**: Enable on all VPCs; ship to CloudWatch/S3 for analysis
- **AWS Network Firewall**: Stateful inspection for VPC traffic; deploy in dedicated subnet
- **PrivateLink**: Access AWS services without internet exposure
- **GuardDuty**: ML-based network threat detection (DNS anomalies, unusual traffic patterns)
- **IMDSv2**: Mandatory for all EC2 instances; blocks SSRF metadata attacks

### 7.2 GCP VPC Security

Key GCP controls:
- **VPC Service Controls**: Create security perimeters around GCP services
- **Shared VPC**: Centralize network administration across projects
- **Private Google Access**: Access GCP APIs without public IP
- **Cloud Armor**: WAF and DDoS protection for external load balancers
- **Packet Mirroring**: Full packet capture for forensic analysis
- **Firewall Policies**: Hierarchical policies at organization, folder, and project levels
- Disable legacy metadata endpoint (`disable-legacy-endpoints=true`)

### 7.3 Kubernetes Network Policies

```yaml
# Default deny all ingress and egress in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}           # Applies to ALL pods in namespace
  policyTypes:
    - Ingress
    - Egress

---
# Allow specific traffic: frontend -> backend on port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080

---
# Backend -> database only, plus DNS for service discovery
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: database
      ports:
        - protocol: TCP
          port: 5432
    - to:                    # Allow DNS resolution
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

---
# Block access to cloud metadata from all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-metadata-service
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 169.254.169.254/32   # Block cloud metadata endpoint
```

Important: NetworkPolicy requires a CNI plugin that supports it (Calico, Cilium, Weave Net).
The default kubenet CNI does NOT enforce NetworkPolicy resources.

### 7.4 On-Premise Firewalls

- Deploy next-generation firewalls (NGFW) at zone boundaries with application-layer inspection
- Enable IPS functionality with regularly updated signature databases
- Implement 802.1X for network access control (NAC) on all switch ports
- Use VLANs to segment network tiers; trunk ports only between network devices
- Enable DHCP snooping and Dynamic ARP Inspection (DAI) to prevent ARP spoofing
- Configure port security to limit MAC addresses per port (prevent MAC flooding)

---

## 8. Incident Patterns

### 8.1 SSRF Exploitation Chain

```
1. RECONNAISSANCE
   Attacker identifies URL fetch functionality (webhooks, image proxy, URL preview)

2. INITIAL PROBE
   Attacker submits internal URLs: http://169.254.169.254/latest/meta-data/
   or http://localhost:6379/ (Redis), http://localhost:9200/ (Elasticsearch)

3. CREDENTIAL THEFT (Cloud)
   GET http://169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>
   → Returns temporary AccessKeyId, SecretAccessKey, SessionToken

4. LATERAL ACCESS
   Attacker uses stolen credentials to access S3 buckets, databases, other AWS services

5. DATA EXFILTRATION
   Bulk download of sensitive data using stolen cloud credentials

DETECTION SIGNALS:
- Outbound requests to 169.254.169.254 from application containers
- Unusual IAM credential usage from unexpected source IPs
- S3 bucket access patterns deviating from baseline
- DNS queries for internal hostnames from external-facing services

RESPONSE:
- Immediately revoke compromised IAM credentials
- Enforce IMDSv2 on all instances
- Block metadata endpoint at network level
- Audit all S3 bucket access logs for data exfiltration
- Patch or disable the vulnerable URL fetch functionality
```

### 8.2 DDoS Detection and Response

```
DETECTION:
- Traffic volume exceeds baseline by 5-10x within minutes
- Spike in connections from geographically unusual sources
- Increased error rates (503, connection timeouts)
- CDN/WAF alerts on anomalous traffic patterns

TRIAGE (first 5 minutes):
- Confirm attack type: volumetric (L3/4) vs application-layer (L7)
- Engage CDN/DDoS protection provider's SOC
- Enable "Under Attack" mode if available (e.g., Cloudflare)

MITIGATION:
- L3/4: Activate upstream scrubbing; apply rate limits at edge; enable SYN cookies
- L7: Deploy WAF rules targeting attack signature; enable CAPTCHA; block by ASN/geo
- Scale horizontally: auto-scale backend capacity during attack
- Blackhole routing: last resort for extreme volumetric attacks

POST-INCIDENT:
- Analyze attack patterns for permanent WAF rule creation
- Review auto-scaling configurations
- Update incident response runbook with attack-specific details
- Consider always-on DDoS protection if attacks are recurring
```

### 8.3 Lateral Movement Detection

```
DETECTION SIGNALS:
- Unusual Kerberos ticket requests (Event ID 4768/4769 with non-standard encryption)
- Unexpected SMB/RDP/SSH connections between workloads
- Service accounts authenticating from new source hosts
- Process execution of recon tools (whoami, net group, nltest, AdFind)
- Anomalous east-west traffic volume or new communication pairs
- Pass-the-hash indicators: NTLM authentication from unexpected sources

INVESTIGATION:
- Correlate network flow logs with authentication logs
- Map all connections from the suspected compromised host
- Check for credential dumping artifacts (LSASS access, Mimikatz indicators)
- Review DNS query logs for internal reconnaissance patterns
- Timeline the attack: initial access → discovery → lateral movement → objective

CONTAINMENT:
- Isolate compromised hosts (disable network interface, quarantine VLAN)
- Force password reset for all accounts accessed from compromised hosts
- Revoke all active sessions and tokens
- Block lateral movement protocols between compromised and clean segments
- Deploy enhanced monitoring on all hosts the attacker may have reached

ERADICATION:
- Reimage compromised hosts (do not attempt to clean in place)
- Rotate all credentials that were accessible from compromised systems
- Audit and remediate the initial access vector
- Verify network segmentation prevents the same lateral movement path
```

---

## 9. Compliance & Standards

### 9.1 NIST SP 800-53 Rev 5 — Network Controls

| Control Family    | Key Controls                                              |
|-------------------|-----------------------------------------------------------|
| **SC (System & Comm)** | SC-7 (Boundary Protection), SC-8 (Transmission Confidentiality), SC-23 (Session Authenticity) |
| **AC (Access Control)** | AC-4 (Information Flow Enforcement), AC-17 (Remote Access), AC-20 (External Systems) |
| **SI (System & Info)** | SI-4 (System Monitoring), SI-3 (Malicious Code Protection) |
| **CA (Assessment)** | CA-7 (Continuous Monitoring), CA-8 (Penetration Testing) |
| **IA (Identification)** | IA-3 (Device Identification and Authentication) |

SC-7 (Boundary Protection) is the cornerstone network control:
- Implement managed interfaces at external and key internal boundaries
- Limit the number of external connections
- Route internal traffic through authenticated proxy servers
- Prevent unauthorized exfiltration at managed interfaces
- Implement host-based boundary protection mechanisms

### 9.2 PCI-DSS v4.0.1 — Network Requirements

| Requirement       | Description                                               |
|-------------------|-----------------------------------------------------------|
| **Req 1**         | Install and maintain network security controls (firewalls, ACLs) |
| **Req 2**         | Apply secure configurations to all system components      |
| **Req 4**         | Protect cardholder data with strong cryptography during transmission |
| **Req 10**        | Log and monitor all access to system components and cardholder data |
| **Req 11**        | Test security of systems and networks regularly (vulnerability scans, pen tests) |

PCI-DSS mandates:
- Cardholder data environment (CDE) must be segmented from all other networks
- All inbound and outbound traffic to CDE must be restricted to necessary connections
- Quarterly internal and external vulnerability scans (ASV for external)
- Annual penetration testing of network segmentation controls
- Wireless networks must be isolated from the CDE or use encryption

### 9.3 NIST SP 800-207 — Zero Trust Architecture

The zero trust framework defines deployment models:

- **Enhanced Identity Governance**: Access decisions based on user/device identity and
  attributes; requires strong identity provider integration
- **Micro-segmentation**: Network divided into zones with gateway enforcement points;
  traffic between zones inspected and authorized
- **Software Defined Perimeter (SDP)**: Network infrastructure hidden from unauthorized
  users; connectivity established only after authentication

Implementation phases:
1. **Identify**: Map all assets, subjects, data flows, and business processes
2. **Protect**: Deploy PEPs at critical access points; enforce MFA everywhere
3. **Detect**: Monitor all access patterns; establish behavioral baselines
4. **Respond**: Automate response to policy violations; adaptive access controls
5. **Recover**: Maintain resilience; practice incident response for zero trust failures

---

## 10. Code Examples

### 10.1 SSRF Prevention Middleware (Express/TypeScript)

```typescript
import { Request, Response, NextFunction } from 'express';
import { URL } from 'url';
import dns from 'dns/promises';

// --- VULNERABLE middleware: no SSRF protection ---
// app.get('/proxy', async (req, res) => {
//   const response = await fetch(req.query.url as string);
//   res.send(await response.text());
// });

// --- SECURE middleware: comprehensive SSRF prevention ---
interface SSRFConfig {
  allowedHosts: Set<string>;
  allowedProtocols: Set<string>;
  maxRedirects: number;
  timeoutMs: number;
}

const SSRF_CONFIG: SSRFConfig = {
  allowedHosts: new Set(['api.trusted-partner.com', 'cdn.example.com']),
  allowedProtocols: new Set(['https:']),
  maxRedirects: 0,
  timeoutMs: 5000,
};

const PRIVATE_RANGES = [
  { start: 0x0A000000, end: 0x0AFFFFFF },   // 10.0.0.0/8
  { start: 0xAC100000, end: 0xAC1FFFFF },   // 172.16.0.0/12
  { start: 0xC0A80000, end: 0xC0A8FFFF },   // 192.168.0.0/16
  { start: 0x7F000000, end: 0x7FFFFFFF },   // 127.0.0.0/8
  { start: 0xA9FE0000, end: 0xA9FEFFFF },   // 169.254.0.0/16 (metadata!)
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIP(ip: string): boolean {
  const ipInt = ipToInt(ip);
  return PRIVATE_RANGES.some(range => ipInt >= range.start && ipInt <= range.end);
}

export async function ssrfGuard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    res.status(400).json({ error: 'URL parameter required' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  // Check protocol
  if (!SSRF_CONFIG.allowedProtocols.has(parsed.protocol)) {
    res.status(403).json({ error: 'Protocol not allowed' });
    return;
  }

  // Check host allowlist
  if (!SSRF_CONFIG.allowedHosts.has(parsed.hostname)) {
    res.status(403).json({ error: 'Host not in allowlist' });
    return;
  }

  // Resolve DNS and check for private IPs
  try {
    const addresses = await dns.resolve4(parsed.hostname);
    if (addresses.some(isPrivateIP)) {
      res.status(403).json({ error: 'Resolved to private IP range' });
      return;
    }
  } catch {
    res.status(502).json({ error: 'DNS resolution failed' });
    return;
  }

  next();
}

// Usage: app.get('/proxy', ssrfGuard, proxyHandler);
```

### 10.2 Network Security Configuration (Nginx Hardening)

```nginx
# --- VULNERABLE: default Nginx config ---
# server {
#     listen 80;
#     server_name _;
#     location / { proxy_pass http://backend; }
# }

# --- SECURE: hardened Nginx reverse proxy ---
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # TLS 1.3 only (fall back to 1.2 for compatibility if needed)
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers off;  # TLS 1.3 manages cipher negotiation
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    # HSTS: force HTTPS for 1 year, including subdomains
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Prevent information disclosure
    server_tokens off;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;

    # Request size limits (prevent large payload attacks)
    client_max_body_size 1m;
    client_body_timeout 10s;
    client_header_timeout 10s;

    # Proxy to backend with security headers
    location /api/ {
        proxy_pass http://backend-upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Prevent proxy from following redirects to internal services
        proxy_redirect off;
        proxy_intercept_errors on;
    }

    # Block access to sensitive paths
    location ~ /\.(env|git|svn|htaccess) {
        deny all;
        return 404;
    }
}

# Redirect all HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
```

### 10.3 Kubernetes Network Security (Complete Namespace Policy)

```yaml
# Complete network security for a production namespace:
# - Default deny all traffic
# - Allow only declared communication paths
# - Block cloud metadata endpoint
# - Restrict DNS to kube-dns only

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]

---
# Ingress controller -> frontend (port 3000)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000

---
# Frontend -> API service (port 8080), plus DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes: [Egress]
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: api
      ports:
        - { protocol: TCP, port: 8080 }
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - { protocol: UDP, port: 53 }

---
# API -> Database (port 5432), external HTTPS, DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: [Egress]
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - { protocol: TCP, port: 5432 }
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 169.254.169.254/32  # Block metadata endpoint
      ports:
        - { protocol: TCP, port: 443 }
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - { protocol: UDP, port: 53 }
```

---

## References

- NIST SP 800-207: Zero Trust Architecture — https://csrc.nist.gov/pubs/sp/800/207/final
- NIST SP 800-53 Rev 5: Security and Privacy Controls — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- OWASP SSRF Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- CISA Zero Trust Architecture Implementation — https://www.dhs.gov/sites/default/files/2025-04/2025_0129_cisa_zero_trust_architecture_implementation.pdf
- CWE-918: Server-Side Request Forgery — https://cwe.mitre.org/data/definitions/918.html
- Cloudflare DDoS Threat Report Q3 2024 — https://developers.cloudflare.com/ddos-protection/
- Capital One Breach Analysis — https://krebsonsecurity.com/2019/08/what-we-can-learn-from-the-capital-one-hack/
- SolarWinds TTPs Analysis — https://www.picussecurity.com/resource/blog/ttps-used-in-the-solarwinds-breach
- Kubernetes Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- PCI-DSS v4.0.1 — https://www.pcisecuritystandards.org/
- Istio mTLS Documentation — https://istio.io/latest/blog/2023/secure-apps-with-istio/
