# Authorization Security

> Expertise module for AI agents — use during planning and implementation to enforce
> secure authorization by default. Broken Access Control is OWASP #1 (A01:2021/2025).

---

## 1. Threat Landscape

Authorization — deciding *what* an authenticated identity may do — is the most
exploited vulnerability class. OWASP found 94% of applications had some form of broken
access control (318k+ occurrences). It rose from #5 (2017) to #1 (2021) and holds that
rank in the 2025 release candidate.

Authorization flaws are *logic bugs*: each app defines its own permission model, and
any gap between intended and enforced policy is exploitable. WAFs cannot catch them.

### Attack Classes

| Attack | Direction | Description |
|---|---|---|
| **IDOR** | Horizontal | Change object ID to access another user's resource |
| **Horizontal privilege escalation** | Horizontal | Access peer accounts at the same privilege level |
| **Vertical privilege escalation** | Vertical | Elevate from user to admin/service account |
| **BFLA** (Broken Function-Level Authz) | Vertical | Call admin endpoints as a regular user |
| **BOLA** (Broken Object-Level Authz) | Horizontal | API variant of IDOR — OWASP API Security #1 since 2019 |
| **Mass assignment** | Both | Bind untrusted input to internal fields (`isAdmin`, `role`, `balance`) |
| **Forced browsing** | Vertical | Guess/enumerate URLs to unprotected admin pages |
| **Path traversal for access** | Horizontal | `../` sequences to escape authorized directories |
| **Parameter tampering** | Both | Modify hidden fields, cookies, or query params carrying authz decisions |

### Real-World Breaches

**Facebook Access Token Breach (Sep 2018):** Three bugs in the "View As" feature let
attackers steal access tokens for ~50M accounts. Tokens granted full account takeover
including third-party apps using Facebook Login. Root cause: the video uploader
generated tokens with the *viewed user's* permissions instead of the viewer's. Facebook
reset tokens for 90M accounts. (Source: Facebook Security Update, Sep 2018; NPR, EFF)

**Parler Data Scrape (Jan 2021):** Sequential numeric IDs, no authentication, no rate
limiting on API endpoints. A researcher incremented `/v1/photo?id=N` to download 70 TB
of data including posts, GPS-tagged videos, and government IDs from the "Verified
Citizen" program. Textbook IDOR. (Source: Salt Security, CyberNews, TechCrunch)

**Kia Dealer Portal (Jun 2024):** Researchers could remotely take over any post-2013
Kia vehicle using only a license plate number. Weak ownership verification allowed
querying PII and silently registering as a second vehicle user, gaining remote
lock/unlock/start in ~30 seconds. Patched Aug 2024. (Source: Sam Curry, Malwarebytes)

**Other notable incidents:** GitHub mass assignment (2012) — SSH key injected into any
org. ZITADEL IDOR (CVE-2025-27507, CVSS 9.0). KubeSphere IDOR (CVE-2024-46528).
Moodle badges IDOR (CVE-2024-48899).

### Trends

- BOLA accounts for ~40% of all API attacks.
- IDOR represents 15-36% of bug bounty payouts depending on industry.
- API-centric architectures and multi-tenant SaaS amplify the surface.
- Authorization flaws are increasingly chained with SSRF, JWT manipulation for impact.

---

## 2. Core Security Principles

**Deny by default.** Every request denied unless an explicit policy grants access.
Never rely on the absence of a deny rule — require the presence of an allow rule.

**Least privilege.** Grant the minimum permissions for the minimum duration. Service
accounts get scoped permissions. API tokens carry only needed scopes. DB connections
use restricted roles. Temporary elevation expires automatically.

**Separation of duties.** No single role controls a full critical workflow. The user
who creates a payment should not approve it. Code authors should not deploy to prod.

**Server-side enforcement is non-negotiable.** Client-side checks (hidden buttons,
disabled fields) are UX, not security. An attacker with a proxy bypasses them all.

### Authorization Model Comparison

| Model | Mechanism | Best For | Weakness |
|---|---|---|---|
| **RBAC** | Roles carry permissions | Stable org structures | Role explosion |
| **ABAC** | Evaluate user/resource/env attributes | Dynamic, context-aware decisions | Complex policy authoring |
| **ReBAC** | Permissions from entity relationships | Doc sharing, social, hierarchies | Requires relationship graph |
| **Hybrid** | Roles baseline + attributes refine + relationships scope | Enterprise SaaS | Higher complexity |

Start with RBAC. Add ABAC for dynamic conditions (time, IP, risk). Add ReBAC when
permissions depend on entity relationships (org hierarchy, sharing, teams).

---

## 3. Implementation Patterns

### 3.1 RBAC Implementation (TypeScript)

```typescript
const PERMISSIONS = {
  'document:read':   ['viewer', 'editor', 'admin'],
  'document:write':  ['editor', 'admin'],
  'document:delete': ['admin'],
  'user:manage':     ['admin'],
} as const;

type Permission = keyof typeof PERMISSIONS;
type Role = 'viewer' | 'editor' | 'admin';

function hasPermission(roles: Role[], perm: Permission): boolean {
  return roles.some(r => PERMISSIONS[perm].includes(r));
}

function requirePermission(perm: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.roles, perm))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.delete('/api/documents/:id', requireAuth, requirePermission('document:delete'), ctrl.delete);
```

### 3.2 ABAC with OPA/Rego

```rego
package authz
default allow := false

allow {
    input.action == "read"
    input.user.department == input.resource.department
    input.user.clearance_level >= input.resource.classification_level
}

allow {
    input.action == "write"
    input.user.role == "editor"
    input.environment.hour >= 9; input.environment.hour < 17
    net.cidr_contains("10.0.0.0/8", input.environment.source_ip)
}
```

**Casbin** uses model-policy separation. Model defines the pattern (ACL/RBAC/ABAC);
policy defines rules. Policies stored in files, MySQL, Postgres, MongoDB, Redis, S3.

### 3.3 Row-Level Security (PostgreSQL)

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Tenant isolation
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Role-based: admins see all, users see own
CREATE POLICY user_documents ON documents FOR SELECT
  USING (
    owner_id = current_setting('app.current_user_id')::uuid
    OR current_setting('app.current_role') = 'admin'
  );
-- CRITICAL: Superusers bypass RLS. Always connect as a restricted role.
```

### 3.4 Resource-Based Authorization

Check the user's *relationship to the specific resource*, not just their role:

```typescript
async function authorizeDocAccess(userId: string, docId: string, action: string): Promise<boolean> {
  const doc = await db.documents.findById(docId);
  if (!doc) return false; // 404 not 403 — prevent enumeration
  if (doc.ownerId === userId) return true;
  const share = await db.shares.findOne({ documentId: docId, userId, permission: action });
  return !!share;
}
```

### 3.5 Multi-Tenancy Authorization

Enforce tenant isolation at every layer:
1. **Application:** Every query includes tenant filter from session (never from user input)
2. **Database:** PostgreSQL RLS enforces boundaries even if app layer is bypassed
3. **API:** Validate resource belongs to authenticated tenant before any operation
4. **Infrastructure:** Separate schemas/instances for high-security tenants

```typescript
function tenantScope(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(403).json({ error: 'No tenant context' });
  req.dbClient.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
  next();
}
```

---

## 4. Vulnerability Catalog

### V01 — IDOR (CWE-639)
User-supplied ID used in DB query without ownership check.
```javascript
// VULNERABLE
const invoice = await Invoice.findById(req.params.id); // any user reads any invoice
// SECURE
const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
if (!invoice) return res.status(404).json({ error: 'Not found' });
```

### V02 — Mass Assignment (CWE-915)
Request body bound directly to model without field filtering.
```javascript
// VULNERABLE
await User.findByIdAndUpdate(req.user.id, req.body); // attacker sends { role: "admin" }
// SECURE
const allowed = ['name', 'email', 'avatar'];
const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
await User.findByIdAndUpdate(req.user.id, updates);
```

### V03 — Missing Function-Level Access Control (CWE-285)
Admin endpoints lack role verification; "security by obscurity."
```javascript
// VULNERABLE
app.delete('/api/admin/users/:id', async (req, res) => { /* no role check */ });
// SECURE
app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), ctrl.deleteUser);
```

### V04 — JWT Role Manipulation (CWE-290)
Role claim in JWT trusted without server-side verification.
```javascript
// VULNERABLE — decode without verify, trust role from token
const token = jwt.decode(req.headers.authorization);
req.user = { id: token.sub, role: token.role };
// SECURE — verify signature, explicit algorithm, role from DB
const token = jwt.verify(req.headers.authorization, KEY, { algorithms: ['RS256'] });
const user = await User.findById(token.sub);
req.user = { id: user.id, role: user.role }; // role from DB
```

### V05 — Parameter Tampering (CWE-269)
Role/permission fields accepted in user-facing API requests.

### V06 — Forced Browsing (CWE-425)
Sensitive URLs unprotected because "not linked in the UI."

### V07 — Path Traversal for Authz Bypass (CWE-22)
User-supplied file paths not canonicalized before authorization check.

### V08 — BOLA (CWE-639)
API endpoints accept object IDs without verifying caller's relationship.

### V09 — BFLA (CWE-285)
API relies on client-side role filtering; server does not re-check.

### V10 — Metadata/Header Manipulation (CWE-290)
Trusting `X-Forwarded-For`, `X-User-Role` from untrusted sources.

### V11 — Cross-Tenant Data Leakage (CWE-668)
Missing tenant ID filter in database queries.

### V12 — Insecure Default Permissions (CWE-276)
New resources default to public/world-readable.

### V13 — OAuth Scope Bypass (CWE-863)
API does not validate token scopes cover the requested operation.

### V14 — Race Condition in Authorization (CWE-362)
TOCTOU: permission checked, revoked, then action executed with cached decision.

---

## 5. Security Checklist

### Access Control Architecture
- [ ] Authorization enforced server-side on every request
- [ ] Default policy is deny-all; access requires explicit grant
- [ ] Authorization logic centralized in middleware/guards, not scattered in handlers
- [ ] Role/permission definitions are declarative data, not hardcoded strings
- [ ] Multi-tenancy isolation at both application and database layers

### Object-Level Authorization
- [ ] Every data query scoped to the authenticated user or tenant
- [ ] Object IDs are UUIDs or non-sequential (not auto-increment integers)
- [ ] Ownership verified before read, update, or delete
- [ ] Unauthorized access returns 404 (not 403) to prevent enumeration
- [ ] Bulk/list endpoints filtered by authorization scope

### Function-Level Authorization
- [ ] Admin endpoints have explicit role checks
- [ ] HTTP method restrictions enforced (no DELETE on read-only resources)
- [ ] Internal/debug endpoints disabled or firewalled in production

### Input Handling
- [ ] Mass assignment protection via explicit field allowlists
- [ ] User-supplied IDs validated against authenticated user's permissions
- [ ] File paths canonicalized and checked against allowed directories
- [ ] Role/permission fields never accepted from user input

### Token and Session Security
- [ ] JWT signatures verified with explicit algorithm (no `alg: none`)
- [ ] Roles fetched from database, not trusted from tokens
- [ ] OAuth scopes validated at every endpoint
- [ ] Token revocation checked on each request

### Audit and Monitoring
- [ ] All authorization denials logged with user, resource, action
- [ ] Privilege escalation patterns trigger alerts
- [ ] High-volume IDOR scanning detected and rate-limited
- [ ] Authorization policy changes require multi-party approval

---

## 6. Tools and Automation

### SAST — Semgrep Custom Rules

```yaml
rules:
  - id: missing-auth-middleware
    patterns:
      - pattern: app.$METHOD($PATH, async (req, res) => { ... })
      - pattern-not: app.$METHOD($PATH, requireAuth, ...)
    message: "Route handler missing authentication middleware"
    severity: ERROR
    languages: [javascript, typescript]

  - id: direct-id-without-ownership
    patterns:
      - pattern: $MODEL.findById(req.params.$ID)
      - pattern-not-inside: $MODEL.findOne({ ..., userId: req.user.id, ... })
    message: "Direct object lookup without ownership check — potential IDOR"
    severity: WARNING
    languages: [javascript, typescript]
```

Semgrep AI-powered detection (2025) achieves 1.9x better recall on IDOR detection
compared to standalone AI assistants. **CodeQL** models taint flows from user input
to DB queries, flagging missing authorization along the path.

### DAST

- **Burp Suite Authorize plugin:** Replays requests with low-privilege tokens,
  highlights responses that succeed when they should fail. Essential for BOLA/BFLA.
- **OWASP ZAP:** Access Control Testing add-on for forced browsing and horizontal
  privilege testing.
- **Nuclei:** Community templates for common authorization bypass patterns.

### Policy Testing

```typescript
describe('Authorization', () => {
  it('denies cross-user document access', async () => {
    const doc = await createDocument({ ownerId: 'user-a' });
    expect(await authorize('user-b', doc.id, 'read')).toBe(false);
  });
  it('prevents mass assignment of role', async () => {
    await request(app).put('/api/users/profile')
      .set('Authorization', userToken).send({ name: 'Test', role: 'admin' });
    expect((await User.findById(userId)).role).toBe('viewer');
  });
  it('enforces tenant isolation', async () => {
    const doc = await createDocument({ tenantId: 'tenant-a' });
    const res = await request(app).get(`/api/documents/${doc.id}`)
      .set('Authorization', tenantBToken);
    expect(res.status).toBe(404);
  });
});
```

### Authorization Audit Logging

```json
{
  "timestamp": "2025-03-08T14:23:01Z",
  "event": "authorization_decision",
  "decision": "deny",
  "principal": { "userId": "usr_abc123", "roles": ["viewer"], "tenantId": "t_001" },
  "resource": { "type": "document", "id": "doc_xyz789" },
  "action": "delete",
  "reason": "insufficient_role",
  "sourceIp": "192.168.1.42"
}
```

Alert on: repeated denials from same principal, sudden access to many distinct
resources (IDOR scan), any admin-resource access by non-admin principals.

---

## 7. Platform-Specific Guidance

### Web — Middleware Guards

**Express.js:**
```typescript
const authorize = (resource: string, action: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const allowed = await policyEngine.evaluate({ subject: req.user, resource, action });
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
```

**Django REST Framework:**
```python
class IsDocumentOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsDocumentOwner]
    def get_queryset(self):
        return Document.objects.filter(tenant_id=self.request.user.tenant_id)
```

**Spring Security:**
```java
@PreAuthorize("hasRole('ADMIN') or @docService.isOwner(#id, authentication.name)")
@GetMapping("/api/documents/{id}")
public ResponseEntity<Document> getDocument(@PathVariable Long id) { ... }
```

### Mobile

All authorization enforcement MUST happen server-side. Mobile clients are untrusted:
attackers decompile APK/IPA, intercept via Frida/Objection, or call APIs directly.
Never store roles/permissions in local storage. Use short-lived tokens with refresh
rotation. Certificate pinning is defense-in-depth, not a primary control.

### API — OAuth Scope Enforcement

```typescript
function requireScopes(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenScopes = req.auth?.scope?.split(' ') || [];
    if (!required.every(s => tokenScopes.includes(s)))
      return res.status(403).json({ error: 'insufficient_scope', required });
    next();
  };
}
app.get('/api/users', requireScopes('users:read'), ctrl.list);
app.delete('/api/users', requireScopes('users:admin'), ctrl.delete);
```

Even with valid scopes, always verify resource ownership:
```typescript
const order = await Order.findOne({ _id: req.params.id, userId: req.auth.sub });
if (!order) return res.status(404).json({ error: 'Not found' });
```

---

## 8. Incident Patterns

### IDOR Exploitation Chain
1. Attacker authenticates normally, observes resource IDs in API responses
2. Modifies the ID parameter (increment, decrement, substitute)
3. If response contains another user's data, IDOR confirmed
4. Automates enumeration, scraping all accessible IDs
5. May escalate via PUT/DELETE with tampered IDs

**Detection:** Single user accessing many distinct resource IDs; sequential access
patterns; 200 OK for IDs outside normal access range; high volume to parameterized
endpoints.

### Privilege Escalation Detection
**Indicators:** User account gains roles not assigned through admin workflow; non-admin
calls admin endpoints; JWT claims differ from DB record; `role`/`is_admin` modified
outside admin interface.

**Response:** (1) Revoke session/tokens. (2) Audit all actions since escalation.
(3) Roll back unauthorized changes. (4) Identify vector (mass assignment, JWT
manipulation, SQLi). (5) Deploy fix, re-test. (6) Notify affected users.

### Cross-Tenant Breach Response
1. Identify scope: which tenants affected, what data exposed
2. Isolate vulnerable endpoint (feature flag, WAF rule, takedown)
3. Audit cross-tenant queries in DB logs for the exposure window
4. Notify affected tenants per regulatory obligations (GDPR: 72 hours)
5. Implement RLS to prevent recurrence; engage pentesters to verify

---

## 9. Compliance and Standards

### OWASP A01:2021/2025 — Broken Access Control
Maps to 34 CWEs: CWE-200 (Info Exposure), CWE-285 (Improper Authorization), CWE-639
(Authz Bypass via User-Controlled Key), CWE-862 (Missing Authorization), CWE-863
(Incorrect Authorization), CWE-915 (Mass Assignment).

### NIST SP 800-53 Rev. 5 — AC Family
- **AC-3:** Access Enforcement
- **AC-5:** Separation of Duties
- **AC-6:** Least Privilege
- **AC-16:** Security/Privacy Attributes (supports ABAC)
- **AC-24:** Access Control Decisions (PDP/PEP points)

### SOC 2 Trust Services Criteria
- **CC6.1:** Logical access controls to protect information
- **CC6.3:** Access authorized and modified based on roles
- **CC6.6:** System boundaries restrict unauthorized external access

### PCI DSS v4.0
- **Req 7:** Restrict access by business need-to-know (7.2: define access, 7.3: enforce via ACL)
- **Req 10:** Log and monitor all access to cardholder data

---

## 10. Code Examples — Vulnerable vs. Secure

### 10.1 RBAC Middleware (TypeScript)

```typescript
import { Request, Response, NextFunction } from 'express';

const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  admin:  new Set(['create', 'read', 'update', 'delete', 'manage_users']),
  editor: new Set(['create', 'read', 'update']),
  viewer: new Set(['read']),
};

export function rbacGuard(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      auditLog('authz_denied', { reason: 'no_user', permission, path: req.path });
      return res.status(401).json({ error: 'Authentication required' });
    }
    const allowed = user.roles.some((r: string) => ROLE_PERMISSIONS[r]?.has(permission));
    if (!allowed) {
      auditLog('authz_denied', { userId: user.id, permission, path: req.path });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### 10.2 Mass Assignment Protection (Zod)

```typescript
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
  // role, emailVerified, credits — NOT in schema, cannot be set
});

app.patch('/api/users/:id', requireAuth, async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(404).json({ error: 'Not found' });
  const updates = UpdateProfileSchema.parse(req.body); // strips unknown fields
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  return res.json(user);
});
```

### 10.3 Row-Level Security (Complete SQL Setup)

```sql
CREATE ROLE app_user LOGIN PASSWORD 'strong-random-password';
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending'
);

GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY user_read ON orders FOR SELECT
  USING (user_id = current_setting('app.current_user')::uuid
         OR current_setting('app.current_role') = 'admin');

-- Per request: SET LOCAL "app.current_tenant" = 'uuid'; (transaction-scoped)
```

---

## References

- OWASP Top 10: A01:2021 — https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/
- OWASP API Security: API1:2023 BOLA — https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
- OWASP IDOR Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
- NIST SP 800-53 Rev. 5 — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- CWE-639, CWE-915, CWE-285 — https://cwe.mitre.org/
- Facebook Security Update (Sep 2018) — https://about.fb.com/news/2018/09/security-update/
- Salt Security: Parler Breach — https://salt.security/blog/unpacking-the-parler-data-breach
- Sam Curry: Hacking Kia — https://samcurry.net/hacking-kia
- PostgreSQL RLS — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Open Policy Agent — https://www.openpolicyagent.org/docs
- Apache Casbin — https://casbin.org/docs/overview/
- Semgrep AI Detection — https://semgrep.dev/blog/2025/ai-powered-detection-with-semgrep/
- CVE-2025-27507 (ZITADEL IDOR) — CVSS 9.0
- CVE-2024-46528 (KubeSphere IDOR)
- CVE-2025-29927 (Next.js Middleware Auth Bypass)
