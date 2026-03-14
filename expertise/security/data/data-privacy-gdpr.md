# Data Privacy & GDPR Compliance

> Security expertise module for AI agents building privacy-by-design applications.
> Covers GDPR, CCPA/CPRA, LGPD, PIPEDA, ePrivacy Directive, and implementation patterns.

---

## 1. Threat Landscape

### 1.1 Enforcement Trends (2023-2025)

As of March 2025, over 2,245 GDPR fines totaling ~EUR 5.65 billion have been recorded,
with >60% (EUR 3.8B+) imposed since January 2023 alone.

**Largest GDPR fines:**

| Year | Entity               | Fine (EUR)    | Reason                                               |
|------|----------------------|---------------|------------------------------------------------------|
| 2023 | Meta (Facebook)      | 1,200,000,000 | Transferring EU user data to US without safeguards   |
| 2021 | Amazon Europe        | 746,000,000   | Behavioral advertising without valid consent         |
| 2022 | Instagram (Meta)     | 405,000,000   | Children's data exposure                             |
| 2023 | TikTok               | 345,000,000   | Children's data processing violations                |
| 2025 | Google (Gmail)       | 325,000,000   | Unsolicited advertising to Gmail users (CNIL)        |
| 2024 | LinkedIn (Microsoft) | 310,000,000   | Unlawful processing for behavioral analysis          |
| 2024 | Uber                 | 290,000,000   | Transferring driver data EU-US without safeguards    |
| 2024 | Meta (breach)        | 251,000,000   | 2018 data breach affecting 29M users                 |
| 2024 | Clearview AI         | 30,500,000    | Illegal facial recognition from scraped images       |

### 1.2 CCPA/CPRA Enforcement

- 2025: CPPA increased fine amounts; cybersecurity audit and ADMT regulations adopted.
- Sept 2025: Tractor Supply fined USD 1.35M for CCPA violations.
- Businesses >USD 100M revenue must submit cybersecurity audit certs by April 2028.

### 1.3 Class Actions & Collective Redress

- Dec 2024: NOYB approved as "qualified entity" in Austria/Ireland for representative actions.
- Planned 2025 class actions: tracking without consent, dark patterns, data sales without basis.
- NOYB threatened Meta with class action over AI training on EU user data without opt-in.

### 1.4 Regulatory Scrutiny Areas

- **AI training on personal data** — explicit consent or legitimate interest with opt-out required.
- **Cross-border transfers** — EU-US DPF survived Sept 2025 challenge but NOYB appeal pending.
- **Children's data** — TikTok EUR 345M, Instagram EUR 405M.
- **Dark patterns** — Google EUR 150M, Meta EUR 60M for manipulative consent UX.

---

## 2. Core Security Principles

### 2.1 Privacy by Design (7 Foundational Principles — GDPR Article 25)

1. **Proactive not Reactive** — Prevent privacy violations before they occur.
2. **Privacy as the Default** — Maximum privacy without user action required.
3. **Privacy Embedded into Design** — Integral to architecture, not a bolt-on.
4. **Full Functionality** — Avoid false trade-offs between privacy and features.
5. **End-to-End Security** — Full lifecycle protection, collection to deletion.
6. **Visibility and Transparency** — All operations verifiable and auditable.
7. **Respect for User Privacy** — User-centric design; individual interests paramount.

### 2.2 Privacy Design Strategies

- **Data-oriented:** MINIMISE, HIDE (encrypt/hash), SEPARATE (isolated contexts), ABSTRACT (aggregate).
- **Process-oriented:** INFORM (notify), CONTROL (user agency), ENFORCE (technical policy), DEMONSTRATE (prove compliance).

### 2.3 Lawful Basis for Processing (Article 6)

Six bases — identify and document one BEFORE processing:
1. **Consent** — Freely given, specific, informed, unambiguous affirmative action.
2. **Contract** — Necessary for contract with data subject.
3. **Legal obligation** — Required by law.
4. **Vital interests** — Protecting someone's life.
5. **Public task** — Task in the public interest.
6. **Legitimate interests** — Balancing test required; does not override subject rights.

### 2.4 Consent Requirements (Articles 4(11), 7)

- **Freely given** — no bundling with service access.
- **Specific** — separate consent per processing purpose.
- **Informed** — clear, plain language.
- **Unambiguous** — clear affirmative action (no pre-ticked boxes).
- **Withdrawable** — as easy to withdraw as to give.
- **Documented** — maintain auditable records.

### 2.5 Data Subject Rights (Articles 12-23)

| Right                     | Article | Time  | Key Requirement                            |
|---------------------------|---------|-------|--------------------------------------------|
| Right to be informed      | 13-14   | At collection | Privacy notice at data collection     |
| Right of access (DSAR)    | 15      | 30 days | Copy of personal data + processing info  |
| Right to rectification    | 16      | 30 days | Correct inaccurate data                  |
| Right to erasure          | 17      | 30 days | Delete when no longer necessary          |
| Right to restrict         | 18      | 30 days | Stop processing but retain data          |
| Right to portability      | 20      | 30 days | Machine-readable format                  |
| Right to object           | 21      | 30 days | Stop processing for direct marketing     |
| Automated decisions       | 22      | 30 days | Right not to be subject to profiling     |

### 2.6 DPIA (Article 35)

Required BEFORE high-risk processing (systematic profiling, large-scale special categories,
public monitoring). Must contain: processing description, necessity/proportionality assessment,
risk assessment, mitigation measures, DPO sign-off.

---

## 3. Implementation Patterns

### 3.1 Consent Management (Cookie Banners Done Right)

- Block ALL non-essential cookies until consent obtained.
- Accept and Reject buttons with **equal visual prominence** (same size, font, color).
- Same number of clicks to opt out as to opt in.
- Granular category choices (necessary, analytics, marketing, preferences).
- Log consent with timestamps; provide preference center for ongoing management.

```typescript
// Consent middleware (TypeScript/Express)
interface ConsentRecord {
  userId: string;
  timestamp: Date;
  categories: { necessary: true; analytics: boolean; marketing: boolean; preferences: boolean };
  source: 'banner' | 'preference-center' | 'api';
  version: string;
}

function consentMiddleware(req: Request, res: Response, next: NextFunction): void {
  const consent = parseConsentCookie(req.cookies['privacy_consent']);
  req.consentCategories = consent?.categories
    ?? { necessary: true, analytics: false, marketing: false, preferences: false };

  if (!req.consentCategories.analytics) res.removeHeader('X-Analytics-ID');
  if (!req.consentCategories.marketing) blockMarketingScripts(res);
  next();
}
```

### 3.2 DSAR Automation Endpoint

```typescript
app.post('/api/privacy/dsar', authenticateUser, rateLimit({ max: 3, windowMs: 86400000 }),
  async (req, res) => {
    const { type } = req.body; // 'access' | 'portability' | 'erasure' | 'rectification'

    // Identity verification (mandatory)
    if (!await verifyIdentity(req.user, req.body.verificationToken)) {
      return res.status(403).json({ error: 'Identity verification required' });
    }

    // Create tracked request (30-day SLA clock starts)
    const dsar = await dsarService.create({
      userId: req.user.id, type, requestedAt: new Date(),
      deadline: addDays(new Date(), 30), status: 'processing',
    });

    // Fan out data collection across microservices
    const sources = ['user-service', 'order-service', 'analytics-service',
                     'email-service', 'support-service', 'payment-service'];
    Promise.all(sources.map(s => dataCollector.requestData(s, req.user.id, dsar.id)))
      .then(async (results) => {
        const format = type === 'portability' ? 'json' : 'pdf';
        const report = await reportGenerator.compile(results, format);
        await notifyUser(req.user.id, 'Your data export is ready', report.downloadUrl);
        await dsarService.update(dsar.id, { status: 'completed', completedAt: new Date() });
      });

    res.json({ requestId: dsar.id, estimatedCompletion: dsar.deadline });
  });
```

### 3.3 Right to Deletion (Cascading Deletes)

```typescript
class DeletionService {
  private readonly services = [
    { name: 'user-profile', hardDelete: true },
    { name: 'user-content', hardDelete: true },
    { name: 'analytics', hardDelete: false },     // Anonymize (legitimate interest)
    { name: 'payments', hardDelete: false },       // Pseudonymize (tax law retention)
    { name: 'support-tickets', hardDelete: true },
    { name: 'backups', hardDelete: true },         // Scheduled purge
  ];

  async executeErasure(userId: string, dsarId: string): Promise<DeletionReport> {
    const report: DeletionReport = { dsarId, userId, results: [] };
    for (const svc of this.services) {
      try {
        if (svc.hardDelete) await this.hardDelete(svc.name, userId);
        else if (svc.name === 'analytics') await this.anonymize(svc.name, userId);
        else if (svc.name === 'payments') await this.pseudonymize(svc.name, userId);
        report.results.push({ service: svc.name, status: 'completed' });
      } catch (error) {
        report.results.push({ service: svc.name, status: 'failed', error: error.message });
        await this.alertDPO(dsarId, svc.name, error);
      }
    }
    await this.scheduleBackupPurge(userId, addDays(new Date(), 30));
    return report;
  }
}
```

### 3.4 Data Retention Scheduler

```typescript
class RetentionScheduler {
  private readonly policies: RetentionPolicy[] = [
    { dataType: 'session_logs', retentionDays: 90, action: 'delete' },
    { dataType: 'analytics_events', retentionDays: 365, action: 'anonymize' },
    { dataType: 'inactive_accounts', retentionDays: 730, action: 'notify_then_delete' },
    { dataType: 'financial_records', retentionDays: 2555, action: 'pseudonymize' },
    { dataType: 'consent_records', retentionDays: 2555, action: 'retain' },
  ];

  async enforceRetention(): Promise<void> { // Run daily via cron
    for (const policy of this.policies) {
      const cutoff = subDays(new Date(), policy.retentionDays);
      switch (policy.action) {
        case 'delete':
          await db.query(`DELETE FROM ${policy.dataType} WHERE created_at < $1`, [cutoff]);
          break;
        case 'anonymize':
          await db.query(
            `UPDATE ${policy.dataType} SET user_id = 'anon-' || md5(user_id::text),
             ip_address = NULL, email = NULL WHERE created_at < $1 AND anonymized = false`,
            [cutoff]);
          break;
        case 'notify_then_delete':
          await this.notifyPendingDeletion(policy.dataType, subDays(cutoff, 30), cutoff);
          await db.query(
            `DELETE FROM ${policy.dataType} WHERE created_at < $1 AND deletion_notified = true`,
            [cutoff]);
          break;
      }
      await auditLog.record({ action: 'retention_enforcement', dataType: policy.dataType, cutoff });
    }
  }
}
```

### 3.5 International Data Transfers (Post-Schrems II)

| Mechanism                          | Status              | Notes                                   |
|------------------------------------|-----------------------|---------------------------------------|
| EU-US Data Privacy Framework (DPF) | Active (challenged)   | Survived Sept 2025 General Court ruling |
| Standard Contractual Clauses (SCCs)| Active                | New simplified SCCs expected Q2 2025  |
| Binding Corporate Rules (BCRs)     | Active                | For intra-group transfers             |
| Adequacy Decisions                 | 14 countries          | UK, Japan, South Korea, Canada, etc.  |
| Transfer Impact Assessments (TIAs) | Required with SCCs    | CNIL guidance issued Jan 2025         |

Implementation: Map all cross-border flows, identify legal mechanism for each, conduct TIAs
with SCCs, encrypt in transit + at rest, monitor adequacy decision status, document in ROPA.

---

## 4. Vulnerability Catalog

### V-PRIV-01: Processing Without Valid Consent

```typescript
// VULNERABLE
app.post('/subscribe', async (req, res) => {
  await db.query('INSERT INTO subscribers VALUES ($1)', [req.body.email]);
  await analytics.track(req.body.email);   // No consent for analytics
  await marketing.addSegment(req.body.email); // No consent for marketing
});

// COMPLIANT
app.post('/subscribe', async (req, res) => {
  const { email, consentAnalytics, consentMarketing } = req.body;
  await consentStore.record({ email, purposes: { consentAnalytics, consentMarketing } });
  await db.query('INSERT INTO subscribers VALUES ($1)', [email]);
  if (consentAnalytics) await analytics.track(email);
  if (consentMarketing) await marketing.addSegment(email);
});
```

### V-PRIV-02: Dark Patterns in Consent UI

```html
<!-- VULNERABLE: Asymmetric buttons -->
<button class="btn-primary btn-large">Accept All</button>
<a href="/settings" class="text-small text-grey">Manage preferences</a>

<!-- COMPLIANT: Equal prominence -->
<button class="btn-secondary" onclick="rejectAll()">Reject All</button>
<button class="btn-secondary" onclick="savePreferences()">Save Preferences</button>
<button class="btn-secondary" onclick="acceptAll()">Accept All</button>
```

### V-PRIV-03: No Data Deletion Mechanism
Violation of Article 17. Netflix fined EUR 4.75M for inadequate DSAR responses.

### V-PRIV-04: Excessive Data Collection

```typescript
// VULNERABLE: Collecting SSN, DOB, gender for a newsletter
interface Form { email: string; ssn: string; dob: string; gender: string; }
// COMPLIANT: Only what is necessary
interface Form { email: string; }
```

### V-PRIV-05: Third-Party Tracking Without Consent

```html
<!-- VULNERABLE: Loading trackers before consent -->
<script src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script src="https://connect.facebook.net/en_US/fbevents.js"></script>

<!-- COMPLIANT: Load only after consent -->
<script>
  document.addEventListener('consent-granted', () => {
    if (getConsent('analytics')) loadScript('gtag.js');
  });
</script>
```

### V-PRIV-06: Data Retained Beyond Purpose
Violation of storage limitation (Article 5(1)(e)). Every data category needs a documented
retention period with automated enforcement.

### V-PRIV-07: Missing Privacy Policy
Violation of Articles 12-14. Must include: controller identity, purposes, legal basis,
recipients, transfers, retention periods, subject rights, right to complain.

### V-PRIV-08: No Breach Notification Mechanism
Article 33 requires 72-hour notification to supervisory authority.

### V-PRIV-09: Insecure DSAR Identity Verification
Responding without verification = potential data breach. Use existing auth; do not collect
new PII solely for verification.

### V-PRIV-10: Cross-Border Transfer Without Legal Basis
Uber fined EUR 290M. Store EU data in EU regions or ensure valid transfer mechanism.

### V-PRIV-11: No Consent Withdrawal Mechanism
Article 7(3): withdrawal must be as easy as giving consent. No "call us to unsubscribe."

### V-PRIV-12: Sharing Data Without Data Processing Agreement
Article 28: DPA required with every processor (analytics, email, CRM, hosting, payments).

### V-PRIV-13: No Records of Processing Activities (ROPA)
Article 30: mandatory for 250+ employees or high-risk processing.

### V-PRIV-14: Using Personal Data for AI Training Without Basis
NOYB threatened Meta with class action. Requires explicit consent or legitimate interest with opt-out.

### V-PRIV-15: Children's Data Without Age Verification
Article 8: parental consent for under 16 (or 13 per member state).

---

## 5. Security Checklist

### Pre-Development
- [ ] Identify lawful basis for each processing activity (Article 6)
- [ ] Conduct DPIA for high-risk processing (Article 35)
- [ ] Map all personal data flows (collection, storage, processing, sharing, deletion)
- [ ] Document retention periods per data category
- [ ] Execute DPAs with all third-party processors (Article 28)
- [ ] Map international transfers and identify transfer mechanisms

### Data Collection
- [ ] Consent banner with equal-prominence accept/reject buttons
- [ ] Block non-essential cookies/trackers until consent obtained
- [ ] Granular consent per purpose (not bundled)
- [ ] Privacy notice at point of collection (Articles 13-14)
- [ ] Data minimization — collect only necessary fields
- [ ] Age verification for services accessible to minors

### Data Storage & Processing
- [ ] Encrypt at rest (AES-256) and in transit (TLS 1.2+)
- [ ] Least-privilege access controls for personal data
- [ ] Pseudonymize/anonymize where full identification not needed
- [ ] Automated data retention scheduler
- [ ] Audit logs of all personal data access and modifications
- [ ] EU data stored in EU regions (or valid transfer mechanism)

### Data Subject Rights
- [ ] DSAR intake endpoint with identity verification
- [ ] Data export in machine-readable format (Article 20)
- [ ] Cascading deletion across all services and backups
- [ ] Consent withdrawal in same clicks as consent granting
- [ ] Preference center for ongoing consent management
- [ ] SLA tracking (30 days GDPR, 45 days CCPA) with alerts

### Breach Response
- [ ] Automated breach detection and alerting
- [ ] Notification templates (supervisory authority + data subjects)
- [ ] 72-hour notification workflow tested quarterly
- [ ] Breach assessment process documented
- [ ] Supervisory authority contact details maintained

### Governance
- [ ] DPO appointed where required (Article 37)
- [ ] ROPA maintained (Article 30)
- [ ] Annual privacy compliance audit
- [ ] Staff training on personal data handling (at least annually)

---

## 6. Tools & Automation

### Consent Management Platforms

| Tool          | Best For      | GDPR | CCPA | Price               |
|---------------|---------------|------|------|---------------------|
| OneTrust      | Enterprise    | Yes  | Yes  | USD 33-2000/mo      |
| Cookiebot     | SMB           | Yes  | Yes  | EUR 7-50/mo         |
| CookieYes     | Budget        | Yes  | Yes  | Free-USD 49/mo      |
| Osano         | Mid-market    | Yes  | Yes  | USD 199-499/mo      |
| Usercentrics  | Multi-region  | Yes  | Yes  | Custom               |

### DSAR Automation
- **DataGrail** — Automated discovery across 100+ integrations.
- **TrustArc** — End-to-end DSR fulfillment with identity verification.
- **BigID** — ML-powered data discovery, classification, DSAR automation.
- **OneTrust** — Rights management, intake forms, SLA tracking.

### Data Mapping & Discovery
- **BigID** — ML-powered classification. **Collibra** — Governance and lineage.
- **OneTrust** — Flow visualization. **DataGrail** — Real-time SaaS mapping.

### Privacy Impact Assessment
- **CNIL PIA Tool** — Free, open source (https://www.cnil.fr/en/open-source-pia-software).
- **OneTrust** — Templates, risk scoring, workflow. **TrustArc** — Regulatory intelligence.

### Cookie Scanners
- **Cookiebot** — Automated monthly scanning. **Blacklight** — Free tracker detection (The Markup).

### Privacy-Preserving Analytics

| Tool      | Cookie-Free | GDPR w/o Consent | Open Source |
|-----------|-------------|-------------------|------------|
| Plausible | Yes         | Yes               | Yes        |
| Fathom    | Yes         | Yes               | No         |
| Umami     | Yes         | Yes               | Yes        |
| Matomo    | Configurable| Configurable      | Yes        |

---

## 7. Platform-Specific Guidance

### 7.1 Web (Cookie Consent & Tracking)

```typescript
class CookieConsentManager {
  private readonly VERSION = '2.1';

  init(): void {
    const consent = this.getStoredConsent();
    if (!consent || consent.version !== this.VERSION) {
      this.showBanner();
      this.blockNonEssentialScripts(); // Set type="text/plain" on data-consent scripts
    } else {
      this.applyConsent(consent);
    }
  }

  private applyConsent(consent: ConsentRecord): void {
    document.querySelectorAll('script[data-consent]').forEach(el => {
      const s = el as HTMLScriptElement;
      if (consent.categories[s.dataset.consent as string]) {
        const n = document.createElement('script');
        n.src = s.src; n.type = 'text/javascript';
        s.parentNode?.replaceChild(n, s);
      }
    });
  }

  acceptAll(): void { this.save({ necessary: true, analytics: true, marketing: true, preferences: true }); }
  rejectAll(): void { this.save({ necessary: true, analytics: false, marketing: false, preferences: false }); }

  private save(categories: ConsentCategories): void {
    const record = { categories, version: this.VERSION, timestamp: new Date().toISOString() };
    localStorage.setItem('privacy_consent', JSON.stringify(record));
    this.applyConsent(record as ConsentRecord);
    fetch('/api/privacy/consent', { method: 'POST', body: JSON.stringify(record),
      headers: { 'Content-Type': 'application/json' } }); // Audit trail
  }
}
```

### 7.2 Mobile

**iOS — App Tracking Transparency (ATT):** Since iOS 14.5, apps MUST request ATT permission
before accessing IDFA. Without permission, IDFA returns all zeros.

```swift
import AppTrackingTransparency
func requestTrackingPermission() {
    ATTrackingManager.requestTrackingAuthorization { status in
        switch status {
        case .authorized:
            let idfa = ASIdentifierManager.shared().advertisingIdentifier
            analytics.setAdvertisingId(idfa.uuidString)
        case .denied, .restricted: analytics.enablePrivacyMode()
        case .notDetermined: break
        @unknown default: analytics.enablePrivacyMode()
        }
    }
}
```

**Android — GAID:** Check `isLimitAdTrackingEnabled` before using advertising ID.
Even if allowed by OS, still need GDPR consent for EU users.

**Mobile-specific:** Request ATT at contextually appropriate moment (not first launch).
Encrypt local storage (Keychain/Keystore). Clear cached PII on logout.

### 7.3 Analytics

**GA4 Consent Mode v2:**

```javascript
gtag('consent', 'default', {
  'ad_storage': 'denied', 'ad_user_data': 'denied',
  'ad_personalization': 'denied', 'analytics_storage': 'denied',
  'wait_for_update': 500,
});
// After CMP consent:
function updateConsent(cats) {
  gtag('consent', 'update', {
    'ad_storage': cats.marketing ? 'granted' : 'denied',
    'analytics_storage': cats.analytics ? 'granted' : 'denied',
  });
}
```

**Recommendation:** Use Plausible or Fathom by default (no cookies, no consent needed).
Only use GA4 if marketing attribution features are required; implement Consent Mode v2.

---

## 8. Incident Patterns

### 8.1 Data Breach Notification (72-Hour Rule — Articles 33-34)

```
Hour 0:     Breach detected → activate response team, begin containment
Hour 0-24:  Assess scope, severity, risk to individuals' rights
            If NOT likely risk: document decision, no notification needed
            If likely risk: prepare supervisory authority notification
Hour 24-48: Draft notifications; identify affected data subjects
Hour 48-72: Submit to lead supervisory authority (nature of breach, DPO contact,
            likely consequences, measures taken/proposed)
            If delay unavoidable: provide reasons
Post-72h:   Notify data subjects if high risk (Art 34); submit supplementary info;
            phased notifications acceptable; document in breach register
```

### 8.2 DSAR Response Protocol (30 Days)

```
Day 0:     Log request, start SLA clock, acknowledge within 3 business days
Day 1-5:   Verify identity via existing authentication
Day 5-20:  Query all systems, compile data, redact third-party PII
Day 20-28: Legal review, prepare export (machine-readable for portability)
Day 28-30: Deliver via secure channel; first copy free
           If extension needed: notify before day 30 (max +2 months)
```

### 8.3 Regulatory Inquiry Response

Respond within specified timeframe (14-30 days). Involve DPO and counsel immediately.
Cooperate fully — obstruction increases fine severity. Preserve evidence, document all
communications, conduct parallel internal investigation.

---

## 9. Compliance & Standards Reference

### GDPR Key Articles

| Article(s) | Topic                            | Summary                                     |
|------------|----------------------------------|---------------------------------------------|
| 5          | Principles                       | Lawfulness, fairness, transparency, minimization, accuracy, storage limitation, integrity |
| 6          | Lawful basis                     | Six legal bases for processing              |
| 7-8        | Consent / Children               | Demonstrable, specific, withdrawable; parental consent for minors |
| 9          | Special categories               | Biometric, health, racial data — explicit consent required |
| 12-14      | Transparency                     | Clear communication, information at collection |
| 15-22      | Data subject rights              | Access, rectification, erasure, portability, object, automated decisions |
| 25         | Privacy by design/default        | Technical and organizational measures       |
| 28         | Processor obligations            | DPA requirements                            |
| 30         | Records of processing            | ROPA mandatory for 250+ employees or high-risk |
| 32-34      | Security & breach notification   | Appropriate measures, 72hr notification, subject notification |
| 44-49      | International transfers          | Adequacy, SCCs, BCRs, derogations           |

### CCPA/CPRA (California)
- **Scope:** USD 25M+ revenue, 100K+ consumers' data, or 50%+ revenue from data sales.
- **Rights:** Know, delete, opt-out of sale/sharing, correct, limit sensitive data use.
- **Response:** 45 days (extendable +45). Penalties: USD 2,500/unintentional, USD 7,500/intentional.
- **Required:** "Do Not Sell" link on homepage. Private right of action for breach of unencrypted data.

### LGPD (Brazil)
- **Scope:** Processing of personal data of individuals in Brazil. 10 legal bases.
- **DPO:** Required for all controllers. **Penalties:** Up to 2% revenue, capped BRL 50M/violation.

### PIPEDA (Canada)
- **Scope:** Private-sector commercial activities. Allows implied consent in low-risk scenarios.
- **Breach:** Mandatory notification for "real risk of significant harm."

### ePrivacy Directive (EU)
- Cookie consent required for non-essential cookies (Article 5(3)).
- Opt-in for email/SMS marketing (soft opt-in exception for existing customers).
- Lex specialis alongside GDPR. ePrivacy Regulation replacement still pending.

---

## 10. Code Examples

### 10.1 Consent Validation Middleware

```typescript
function requireConsent(...purposes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const consent = await consentStore.getCurrent(req.user?.id);
    if (!consent || consent.version !== CURRENT_CONSENT_VERSION) {
      return res.status(451).json({ error: 'Consent required', consentUrl: '/api/privacy/consent' });
    }
    const missing = purposes.filter(p => !consent.categories[p]);
    if (missing.length > 0) {
      return res.status(451).json({ error: 'Additional consent required', missing });
    }
    req.consent = consent;
    next();
  };
}

// Usage
app.post('/api/recommendations', requireConsent('analytics', 'preferences'), handler);
app.post('/api/marketing/email', requireConsent('marketing'), handler);
```

### 10.2 Privacy-Preserving Logging

```typescript
// VULNERABLE
logger.info(`User ${user.email} logged in from ${req.ip}`);

// COMPLIANT
logger.info(`User ${hash(user.id)} logged in from ${anonymizeIp(req.ip)}`);

function anonymizeIp(ip: string): string {
  return ip.includes('.') ? ip.replace(/\.\d+$/, '.0')
    : ip.replace(/:[\da-f]{1,4}:[\da-f]{1,4}:[\da-f]{1,4}:[\da-f]{1,4}:[\da-f]{1,4}$/, ':0:0:0:0:0');
}
```

### 10.3 Data Portability Export (Article 20)

```typescript
async function generatePortabilityExport(userId: string): Promise<Buffer> {
  const [profile, orders, posts] = await Promise.all([
    userService.getProfile(userId),
    orderService.getOrders(userId),
    contentService.getPosts(userId),
  ]);
  return Buffer.from(JSON.stringify({
    exportedAt: new Date().toISOString(),
    format: 'GDPR Article 20 Data Portability Export',
    dataController: { name: 'Company', contact: 'dpo@company.com' },
    personalData: {
      profile: { email: profile.email, displayName: profile.displayName },
      orders: orders.map(o => ({ id: o.id, date: o.createdAt, items: o.items })),
      content: posts.map(p => ({ title: p.title, body: p.body, createdAt: p.createdAt })),
    },
  }, null, 2), 'utf-8');
}
```

---

## References

### Regulatory Sources
- GDPR Full Text: https://gdpr-info.eu/
- EDPB Guidelines: https://www.edpb.europa.eu/our-work-tools/general-guidance
- CCPA/CPRA: https://oag.ca.gov/privacy/ccpa | https://cppa.ca.gov/announcements/
- LGPD: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
- PIPEDA: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/pipeda/

### Enforcement Trackers
- GDPR Enforcement Tracker: https://www.enforcementtracker.com/
- CMS Report 2024/2025: https://cms.law/en/int/publication/gdpr-enforcement-tracker-report
- NOYB: https://noyb.eu/en/fines-resulting-noyb-litigation

### Tools
- OneTrust: https://www.onetrust.com/ | Cookiebot: https://www.cookiebot.com/
- Plausible: https://plausible.io/ | Fathom: https://usefathom.com/
- DataGrail: https://www.datagrail.io/ | BigID: https://bigid.com/
- CNIL PIA Tool: https://www.cnil.fr/en/open-source-pia-software
