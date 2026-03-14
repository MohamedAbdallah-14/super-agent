# Incident Response

> Expertise module for AI agents -- use during planning and implementation to build
> and execute incident response capabilities. Effective IR reduces breach cost by
> 58% (IBM 2024) and is required by NIST CSF 2.0, GDPR, PCI-DSS, SOC 2, and
> cyber insurance policies.

---

## 1. Threat Landscape

### 1.1 Breach Cost Reality

The financial impact of security incidents continues to escalate. Organizations
without mature IR programs absorb significantly higher costs and longer recovery
times.

| Metric | 2023 | 2024 | 2025 | Source |
|---|---|---|---|---|
| Global average breach cost | $4.45M | $4.88M | $4.44M | IBM Cost of a Data Breach |
| US average breach cost | $9.48M | $9.36M | $10.22M | IBM Cost of a Data Breach |
| Healthcare sector average | $10.93M | $9.77M | -- | IBM Cost of a Data Breach |
| Cost with IR plan + testing | $3.26M | $3.28M | -- | IBM Cost of a Data Breach |
| Cost without IR plan | $5.71M | $5.72M | -- | IBM Cost of a Data Breach |
| Average savings from IR team | $2.66M | $2.44M | -- | IBM Cost of a Data Breach |

Key cost drivers:
- **Shadow AI**: Unapproved AI tool usage adds $670K to average breach cost (IBM 2025)
- **Multi-environment breaches**: Average $5M+ and 283 days to contain (IBM 2024)
- **Regulatory fines**: GDPR fines up to 4% of global annual revenue
- **Ransomware payments**: Median payment $200K; total cost including recovery averages $4.54M

### 1.2 Dwell Time Statistics

Dwell time -- the period between initial compromise and detection -- directly
correlates with damage severity.

| Detection Method | Median Dwell Time (2024) | Source |
|---|---|---|
| Internal detection | 10 days | Mandiant M-Trends 2025 |
| External notification | 26 days | Mandiant M-Trends 2025 |
| Adversary notification (ransom) | 5 days | Mandiant M-Trends 2025 |
| Ransomware (IR cases, 2025) | 4-5 days | Sophos Active Adversary |
| Non-ransomware (IR cases, 2025) | 11-13 days | Sophos Active Adversary |
| MDR-managed environments | 1-3 days | Sophos Active Adversary |

Trend: Attackers are compressing their timelines. Ransomware operators now
routinely move from initial access to encryption within 24-48 hours, down from
5+ days in 2022. This makes automated detection and response essential.

### 1.3 Regulatory Notification Deadlines

| Regulation | Notification Window | Recipient | Penalty |
|---|---|---|---|
| GDPR (EU) | 72 hours from awareness | Supervisory Authority | Up to 4% global revenue or EUR 20M |
| CISA/CIRCIA (US) | 72 hours (incidents), 24 hours (ransom payments) | CISA | Administrative penalties |
| PCI-DSS | 72 hours (MasterCard); varies by brand | Card brands + acquirer | Fines $5K-$100K/month |
| HIPAA (US) | 60 days (>500 records), annual (fewer) | HHS OCR | $100-$50K per violation |
| SEC (US public companies) | 4 business days (material incidents) | SEC via 8-K filing | Securities enforcement |
| NIS2 (EU) | 24 hours (early warning), 72 hours (full) | National CSIRT | Up to EUR 10M or 2% revenue |
| State breach laws (US) | 30-90 days (varies by state) | State AG + affected individuals | Varies |

### 1.4 Cyber Insurance Requirements

Insurers increasingly mandate IR readiness as a coverage prerequisite:

- **Documented IR plan** -- Must cover detection, containment, eradication, recovery
- **Annual IR plan testing** -- Tabletop exercises or simulations at minimum
- **Ransomware-specific playbook** -- Separate from general IR plan
- **24/7 detection capability** -- EDR, MDR, or SOC coverage
- **MFA enforcement** -- Required on all privileged and remote access
- **Encrypted offline backups** -- Tested and verified recovery capability
- **Immediate insurer notification** -- Policy often requires notification within hours
- **Forensic retainer** -- Pre-arranged relationship with approved forensic vendors

CRITICAL: Failure to maintain these controls can void coverage. Many policies
include "failure to maintain" clauses that deny claims if controls lapsed before
the incident.

---

## 2. Core Security Principles

### 2.1 NIST IR Lifecycle (SP 800-61 Rev. 3)

NIST SP 800-61 Revision 3 (April 2025) restructured the IR lifecycle to align
with the Cybersecurity Framework 2.0 six functions. The traditional four-phase
model maps into this broader framework:

```
CSF 2.0 Mapping:

  GOVERN -----> IR Program Management, Policy, Roles
  IDENTIFY ---> Asset Inventory, Risk Assessment, Threat Intelligence
  PROTECT ----> Preventive Controls, Training, Access Management
  DETECT -----> Monitoring, Alert Triage, Indicator Analysis
  RESPOND ----> Containment, Eradication, Communication, Forensics
  RECOVER ----> Service Restoration, Lessons Learned, Plan Updates

Traditional Four-Phase Model (Rev. 2, still valid conceptually):

  1. Preparation
     |
  2. Detection & Analysis
     |
  3. Containment, Eradication & Recovery
     |
  4. Post-Incident Activity
     |
     +---> feeds back to Preparation
```

### 2.2 Incident Classification and Severity Levels

Define severity levels BEFORE an incident occurs. Use a consistent taxonomy
across all playbooks.

| Severity | Label | Description | Response SLA | Escalation |
|---|---|---|---|---|
| SEV-1 | Critical | Active data exfiltration, ransomware spreading, production down | 15 min initial response | CISO, CEO, Legal, Board |
| SEV-2 | High | Confirmed compromise, lateral movement detected, sensitive data exposed | 30 min initial response | CISO, VP Engineering, Legal |
| SEV-3 | Medium | Suspicious activity confirmed, single system compromised, no spread | 2 hours initial response | Security Lead, IT Manager |
| SEV-4 | Low | Policy violation, failed attack attempt, single phishing click (no exec) | 8 hours initial response | SOC Analyst, Team Lead |
| SEV-5 | Informational | Vulnerability disclosure, threat intel alert, false positive | Next business day | SOC Analyst |

Severity can ONLY escalate during an incident, never downgrade until post-incident
review confirms reduced scope.

### 2.3 Communication Plans

Establish communication channels and authority BEFORE an incident:

```
Communication Matrix:

  Internal:
    - War room channel (Slack/Teams) -- created per-incident, invite-only
    - Bridge call number -- always-available conference line
    - Status cadence -- every 30 min (SEV-1), every 2 hours (SEV-2)
    - Stakeholder updates -- executive summary every 4 hours (SEV-1/2)

  External:
    - Legal counsel -- engaged immediately for SEV-1/2
    - Cyber insurance -- notify within policy-required window
    - Law enforcement -- FBI IC3, local field office for criminal activity
    - Regulators -- per notification deadline table above
    - Customers -- only after legal review, coordinated messaging
    - Media -- only through designated spokesperson, prepared statement

  Rules:
    - NO public disclosure without legal approval
    - NO technical details in external communications
    - ALL external communications reviewed by legal before release
    - Document every communication with timestamp and recipient
```

### 2.4 Chain of Custody for Digital Forensics

Evidence handling must withstand legal scrutiny. Any break in chain of custody
renders evidence inadmissible.

Requirements:
1. **Document acquisition** -- Who collected what, when, from where, using what tool
2. **Cryptographic hashing** -- SHA-256 hash of all evidence at time of collection
3. **Write protection** -- Use write blockers for disk imaging; read-only mounts
4. **Secure storage** -- Evidence stored in access-controlled, tamper-evident storage
5. **Access log** -- Every access to evidence documented with purpose and authorization
6. **Continuous integrity** -- Re-verify hashes before and after any analysis
7. **Chain documentation** -- Transfer of custody forms signed by both parties

```
Evidence Tag Template:

  Case ID:        _______________
  Evidence ID:    _______________
  Date/Time:      _______________
  Collected By:   _______________
  Description:    _______________
  Source Device:   _______________
  Serial Number:  _______________
  SHA-256 Hash:   _______________
  Storage Location: _____________
  Chain of Custody:
    From: _______ To: _______ Date: _______ Purpose: _______
```

---

## 3. Implementation Patterns

### 3.1 IR Plan Template Structure

Every organization needs a written, tested, and maintained IR plan:

```
Incident Response Plan -- Table of Contents

  1. Purpose and Scope
  2. Definitions and Terminology
  3. Roles and Responsibilities
     3.1 IR Team (CSIRT) composition
     3.2 Executive sponsors
     3.3 External partners (forensics, legal, PR)
  4. Incident Classification Taxonomy
  5. Detection and Reporting Procedures
  6. Severity Assessment Matrix
  7. Escalation Procedures
  8. Containment Strategies
     8.1 Network isolation procedures
     8.2 Account lockout procedures
     8.3 Service shutdown procedures
  9. Evidence Collection and Preservation
  10. Eradication Procedures
  11. Recovery Procedures
  12. Communication Plans
      12.1 Internal communication templates
      12.2 Customer notification templates
      12.3 Regulatory notification templates
      12.4 Media statement templates
  13. Post-Incident Review Process
  14. Plan Maintenance Schedule
  15. Appendices
      A. Contact lists (internal + external)
      B. Network diagrams
      C. System inventory
      D. Playbook index
```

### 3.2 Containment Strategies

Select containment based on incident type and severity. Always prefer reversible
actions when possible.

| Strategy | When to Use | Reversibility | Risk |
|---|---|---|---|
| **Network segment isolation** | Lateral movement detected | High | May disrupt dependent services |
| **Host firewall rules** | Single compromised host | High | Attacker may detect and accelerate |
| **VLAN quarantine** | Multiple hosts in same segment | High | Requires network team coordination |
| **Account lockout** | Compromised credentials | Medium | May lock out legitimate users |
| **Service shutdown** | Compromised application | Low | Direct business impact |
| **DNS sinkhole** | C2 communication detected | High | May not catch all C2 channels |
| **Full network disconnect** | Active ransomware spreading | Low | Maximum disruption, last resort |
| **Cloud security group** | Cloud workload compromise | High | Fast; API-driven |

### 3.3 Escalation Procedures

```
Escalation Flow:

  Alert Triggered
    |
    v
  SOC Analyst (L1) -- 15 min triage
    |-- False positive --> Close with documentation
    |-- Confirmed --> Assign severity
         |
         v
  IR Lead (L2) -- Validate severity, begin investigation
    |-- SEV-4/5 --> IR Lead manages to resolution
    |-- SEV-3 --> IR Lead + relevant team
    |-- SEV-1/2 --> Activate full IR team
         |
         v
  CSIRT Activation -- War room, roles assigned
    |-- SEV-1 --> Notify CISO within 15 min
    |              Notify CEO within 30 min
    |              Engage legal counsel
    |              Activate forensic retainer
    |              Notify cyber insurance carrier
    |
  Ongoing: Status updates per communication cadence
```

### 3.4 Post-Incident Review Process

Conduct a blameless post-incident review (PIR) within 5 business days of
incident closure. Focus on process improvement, not individual fault.

PIR Agenda:
1. **Timeline reconstruction** -- Minute-by-minute from detection to resolution
2. **Root cause analysis** -- What allowed the incident to occur
3. **Detection effectiveness** -- How was it found? How could it be found faster?
4. **Response effectiveness** -- What worked? What didn't? Where were delays?
5. **Communication assessment** -- Were stakeholders informed appropriately?
6. **Control gap identification** -- What preventive controls were missing or failed?
7. **Action items** -- Specific, assigned, time-bound improvements
8. **Metrics update** -- Update MTTD, MTTR, incident count dashboards

### 3.5 Tabletop Exercise Design

Run tabletop exercises at least quarterly. Vary scenarios and participants.

```
Tabletop Exercise Structure (90-120 minutes):

  Pre-Exercise (1 week before):
    - Distribute scenario overview (not details)
    - Confirm participants and roles
    - Prepare injects (escalation points)

  Exercise Flow:
    Phase 1: Initial Detection (20 min)
      - Present scenario trigger
      - Teams discuss: What do we do first?
    Phase 2: Escalation (20 min)
      - Inject: situation worsens
      - Teams discuss: containment decisions
    Phase 3: Stakeholder Management (20 min)
      - Inject: media inquiry, customer calls
      - Teams discuss: communication approach
    Phase 4: Recovery (15 min)
      - Teams discuss: eradication + recovery steps
    Phase 5: Debrief (15-25 min)
      - What went well? What gaps emerged?
      - Action items assigned

  Document: Findings report within 1 week
  Track: Action item completion
```

---

## 4. Vulnerability Catalog -- Incident Scenarios and Response Playbooks

### 4.1 Ransomware

**Attack Chain**: Phishing/RDP exploit -> credential theft -> lateral movement ->
domain admin compromise -> disable backups -> deploy encryption

**Detection Indicators**:
- Mass file rename operations (entropy change in file extensions)
- Volume Shadow Copy deletion (`vssadmin delete shadows`)
- Anomalous SMB traffic patterns across multiple hosts
- EDR alerts for known ransomware behaviors
- Canary file modifications (honeypot files placed in shares)

**Containment**:
1. Immediately isolate affected systems from network (do NOT power off)
2. Disable all privileged accounts except designated IR admin accounts
3. Block lateral movement: disable SMB, RDP, WinRM between segments
4. Preserve at least one encrypted system for forensic analysis
5. Identify patient zero and attack vector

**Recovery**: Restore from verified clean backups. Rebuild domain controllers
if AD was compromised. Reset ALL credentials. Verify backup integrity before
restoration. Monitor for re-infection indicators for 90 days.

**Decision: Pay or not pay ransom?** -- Engage legal counsel, law enforcement
(FBI), and cyber insurance carrier. Payment does NOT guarantee recovery; only
65% of organizations that paid recovered all data (Sophos 2024). Payment may
violate OFAC sanctions.

### 4.2 Data Breach / Data Exfiltration

**Attack Chain**: Initial access -> reconnaissance -> privilege escalation ->
data staging -> compression/encryption -> exfiltration via HTTPS/DNS/cloud storage

**Detection Indicators**:
- Unusual outbound data volume (DLP alerts)
- Large archive files created on servers
- DNS tunneling patterns (high query volume, long subdomain names)
- Unauthorized cloud storage access (Google Drive, Dropbox, Mega)
- Database query anomalies (bulk SELECT, pg_dump, mysqldump)

**Containment**:
1. Block identified exfiltration channels (IPs, domains, protocols)
2. Revoke compromised credentials
3. Enable enhanced logging on data stores
4. Assess scope: what data, how much, how sensitive
5. Engage legal for notification obligation assessment

**Recovery**: Determine regulatory notification requirements based on data
type and jurisdiction. Prepare notification letters. Offer credit monitoring
if PII involved. Implement DLP controls to prevent recurrence.

### 4.3 Business Email Compromise (BEC) / Account Compromise

**Attack Chain**: Credential phishing -> mailbox access -> inbox rule creation
(hide evidence) -> reconnaissance of financial workflows -> impersonation of
executive -> fraudulent wire transfer request

**Detection Indicators**:
- Impossible travel alerts (login from two distant locations)
- New inbox rules forwarding to external addresses
- OAuth app consent from unfamiliar applications
- MFA bypass or enrollment of new MFA device
- Password spray patterns against Azure AD/Entra ID

**Containment**:
1. Force password reset and revoke all sessions/tokens
2. Remove malicious inbox rules and OAuth app consents
3. Enable conditional access policies (block risky sign-ins)
4. Review sent items for impersonation emails
5. Contact financial institutions to freeze fraudulent transfers (time-critical)

### 4.4 Distributed Denial of Service (DDoS)

**Detection Indicators**:
- Sudden traffic spike exceeding baseline by 10x+
- Geo-anomalous traffic sources
- SYN flood, UDP amplification, or HTTP flood patterns
- CDN/WAF alerts for volumetric attacks

**Containment**:
1. Activate DDoS mitigation service (Cloudflare, AWS Shield, Akamai)
2. Implement rate limiting and geo-blocking if attack source is concentrated
3. Enable upstream provider scrubbing
4. Scale infrastructure if cloud-based (auto-scaling groups)
5. Communicate service degradation to customers

### 4.5 Insider Threat

**Detection Indicators**:
- Access to resources outside normal job function
- Bulk data downloads before resignation/termination date
- USB device usage on sensitive systems
- After-hours access to critical systems
- UEBA behavioral anomaly alerts

**Containment**:
1. Coordinate with HR and legal BEFORE confronting the individual
2. Preserve evidence: email, file access logs, badge access records
3. Disable access in coordination with HR action (simultaneous)
4. Image workstation and mobile devices
5. Review access to all systems in the 90 days prior to detection

### 4.6 Supply Chain Compromise

**Real-World Examples**: SolarWinds Orion (2020), Codecov bash uploader (2021),
3CX Desktop App (2023), xz-utils backdoor (2024)

**Detection Indicators**:
- Unexpected outbound connections from trusted software
- Hash mismatch between vendor-published and installed binaries
- Anomalous behavior from recently updated trusted applications
- Threat intelligence alerts on vendor compromises

**Containment**:
1. Identify all instances of the compromised software/component
2. Isolate affected systems from network
3. Block C2 indicators (IPs, domains) at perimeter
4. Assess downstream impact (did compromised software access secrets/data?)
5. Engage vendor for IOCs, patches, and coordinated response

### 4.7 Web Application Attack (SQLi, RCE, SSRF)

**Detection Indicators**:
- WAF alerts for injection patterns
- Unusual process spawning from web server (webshell)
- Database errors in application logs
- SSRF-pattern requests to cloud metadata endpoints (169.254.169.254)

**Containment**:
1. Block attacking IPs at WAF/firewall
2. Take vulnerable endpoint offline or deploy virtual patch
3. Check for webshells in web root directories
4. Rotate database credentials and API keys accessed by the application
5. Review database for data tampering or exfiltration

### 4.8 Cloud Infrastructure Compromise

**Detection Indicators**:
- GuardDuty/SCC alerts for anomalous API calls
- New IAM users or roles created outside change management
- EC2 instances launched in unusual regions
- S3 bucket policies modified to allow public access
- CloudTrail logging disabled or modified

**Containment**:
1. Disable compromised IAM credentials (do NOT delete -- preserve for forensics)
2. Apply restrictive security group/network ACLs to affected resources
3. Snapshot affected EC2 instances for forensic analysis
4. Revoke temporary credentials and rotate long-term keys
5. Review CloudTrail for full scope of attacker activity

### 4.9 Phishing Campaign (Targeted)

**Detection Indicators**:
- Multiple users reporting similar suspicious emails
- Email gateway alerts for malicious attachments/links
- Spike in credential page visits from email links
- Sandbox detonation alerts for malicious payloads

**Containment**:
1. Search and purge malicious emails from all mailboxes (admin search)
2. Block sender domain/IP at email gateway
3. Block phishing URLs at proxy/DNS
4. Identify users who clicked -- force password reset
5. Check for post-compromise activity on clicked-user accounts

### 4.10 Malware Outbreak

**Detection Indicators**:
- EDR alerts on multiple endpoints simultaneously
- Signature or behavioral detection of known malware families
- Anomalous network beaconing patterns (regular interval callbacks)
- Unexpected processes, services, or scheduled tasks

**Containment**:
1. Isolate affected endpoints via EDR network isolation feature
2. Identify malware family and propagation mechanism
3. Block C2 infrastructure at firewall and DNS
4. Deploy IOCs to all endpoints for immediate scanning
5. Identify initial infection vector to prevent re-infection

### 4.11 Cryptomining / Resource Hijacking

**Detection Indicators**:
- Sustained high CPU/GPU utilization on servers or cloud instances
- Connections to known mining pool domains/IPs
- Unexpected large cloud compute bills
- New containers or Lambda functions not in deployment pipeline

**Containment**:
1. Terminate unauthorized compute workloads
2. Revoke compromised cloud credentials
3. Block mining pool connections at network level
4. Review infrastructure-as-code for unauthorized modifications

### 4.12 Zero-Day Exploitation

**Detection Indicators**:
- Threat intelligence alerts for newly disclosed CVE
- Anomalous behavior from patched/current software
- Exploit attempts matching published PoC patterns
- Vendor emergency advisory

**Containment**:
1. Apply vendor mitigations or workarounds immediately
2. Implement virtual patching via WAF/IPS rules
3. Increase monitoring on affected systems
4. Assess exposure: how many instances, internet-facing?
5. Patch as soon as vendor releases fix; prioritize internet-facing systems

---

## 5. Security Checklist

### Preparation Phase

- [ ] Written IR plan approved by CISO and legal counsel
- [ ] CSIRT team defined with roles, backups, and contact info
- [ ] Severity classification matrix documented and distributed
- [ ] Communication templates pre-approved by legal (internal, customer, regulatory, media)
- [ ] Forensic retainer agreement in place with qualified vendor
- [ ] Cyber insurance policy reviewed; notification requirements documented
- [ ] IR tooling deployed: SIEM, EDR, forensic tools, communication channels
- [ ] Evidence storage solution configured (write-once, access-controlled)
- [ ] Tabletop exercises conducted quarterly with documented findings
- [ ] Asset inventory current and accessible during incident
- [ ] Network diagrams and data flow diagrams current
- [ ] Playbooks written for top 10 incident scenarios

### Detection Phase

- [ ] 24/7 monitoring coverage (SOC, MDR, or on-call rotation)
- [ ] Alert triage SLAs defined and monitored (15 min for critical)
- [ ] Threat intelligence feeds integrated into SIEM
- [ ] Canary tokens/files deployed on critical systems
- [ ] Log retention meets minimum 90-day hot, 1-year cold requirement
- [ ] Detection rules mapped to MITRE ATT&CK techniques

### Containment and Eradication Phase

- [ ] Network isolation procedures tested and documented
- [ ] Account lockout procedures cover AD, cloud IAM, SaaS applications
- [ ] Backup integrity verified monthly; restore tested quarterly
- [ ] Forensic imaging procedures documented with hash verification
- [ ] Chain of custody forms available and team trained on use

### Recovery Phase

- [ ] Recovery priority list defined (critical services first)
- [ ] Clean rebuild procedures documented for all system types
- [ ] Credential rotation procedures cover all credential types
- [ ] Post-recovery monitoring plan for 90-day watch period

### Post-Incident Phase

- [ ] Post-incident review conducted within 5 business days
- [ ] Root cause analysis documented
- [ ] Action items assigned with owners and deadlines
- [ ] IR plan updated based on lessons learned
- [ ] Metrics updated: MTTD, MTTR, incident count, cost

---

## 6. Tools and Automation

### 6.1 SIEM (Security Information and Event Management)

| Tool | Deployment | Strengths | Consideration |
|---|---|---|---|
| **Splunk Enterprise Security** | On-prem / Cloud | Mature correlation, extensive app ecosystem | Cost scales with data volume |
| **Elastic SIEM** | On-prem / Cloud | Open source core, flexible schema | Requires tuning expertise |
| **Microsoft Sentinel** | Azure Cloud | Native Azure/M365 integration, KQL | Best for Microsoft-heavy environments |
| **Google Chronicle/SecOps** | Cloud | Massive data ingestion at flat cost | Google ecosystem advantages |
| **CrowdStrike LogScale** | Cloud | Sub-second search, streaming architecture | Newer entrant |

### 6.2 EDR (Endpoint Detection and Response)

| Tool | Key Feature | Deployment |
|---|---|---|
| **CrowdStrike Falcon** | Cloud-native, threat intelligence integration | Agent-based, cloud console |
| **SentinelOne Singularity** | Autonomous response, built-in SOAR | Agent-based, cloud console |
| **Microsoft Defender for Endpoint** | M365 integration, attack surface reduction | Agent-based, cloud console |
| **Carbon Black (VMware)** | Behavioral EDR, application control | Agent-based, on-prem/cloud |
| **Elastic Defend** | Open agent, integrated with Elastic SIEM | Agent-based, self-managed/cloud |

### 6.3 Forensic Tools

| Tool | Purpose | Type |
|---|---|---|
| **Volatility 3** | Memory forensics and analysis | Open source |
| **Autopsy / Sleuth Kit** | Disk image analysis, file recovery | Open source |
| **KAPE (Kroll)** | Rapid triage artifact collection | Commercial (free) |
| **Velociraptor** | Endpoint visibility and forensic collection at scale | Open source |
| **FTK Imager** | Forensic disk imaging | Commercial (free) |
| **Wireshark** | Network packet capture and analysis | Open source |
| **Plaso/log2timeline** | Super timeline creation from multiple log sources | Open source |

### 6.4 Incident Management Platforms

| Tool | Use Case |
|---|---|
| **PagerDuty** | On-call management, alert routing, escalation |
| **Opsgenie (Atlassian)** | Alert aggregation, on-call schedules |
| **Jira Service Management** | Incident tracking, SLA management |
| **ServiceNow SecOps** | Enterprise IR workflow, CMDB integration |
| **TheHive** | Open source IR case management |
| **DFIR-IRIS** | Open source IR case management with timeline analysis |

### 6.5 Threat Intelligence

| Tool | Type |
|---|---|
| **MISP** | Open source threat intelligence sharing platform |
| **AlienVault OTX** | Community threat intelligence feeds |
| **VirusTotal** | Malware and IOC analysis |
| **Shodan** | Internet-facing asset discovery |
| **GreyNoise** | Mass scanner identification (reduce noise) |
| **Abuse.ch (URLhaus, MalBazaar)** | Malware and URL threat feeds |

### 6.6 SOAR (Security Orchestration, Automation and Response)

SOAR platforms reduce MTTR by up to 50% and analyst workload by 40%:

| Tool | Deployment | Integration |
|---|---|---|
| **Palo Alto XSOAR (Demisto)** | Cloud / On-prem | 700+ integrations |
| **Splunk SOAR (Phantom)** | Cloud / On-prem | Native Splunk integration |
| **Tines** | Cloud | No-code automation, strong API support |
| **Shuffle** | Self-hosted | Open source SOAR |
| **SentinelOne Singularity** | Cloud | Built-in SOAR capabilities |

---

## 7. Platform-Specific Guidance

### 7.1 AWS Incident Response

**Key Services**:
- **GuardDuty**: Threat detection from CloudTrail, VPC Flow Logs, DNS logs
- **Security Hub**: Aggregated findings, compliance checks
- **CloudTrail**: API audit log -- ESSENTIAL for forensics
- **AWS Security Incident Response**: AI-powered investigation service
- **Detective**: Visualize and investigate security findings

**AWS IR Playbook -- Compromised IAM Credentials**:
```
1. Identify the compromised access key / role
   aws iam list-access-keys --user-name <user>

2. Disable (do NOT delete) the access key
   aws iam update-access-key --access-key-id <key> --status Inactive --user-name <user>

3. Revoke all active sessions for the role/user
   aws iam put-role-policy --role-name <role> --policy-name DenyAll \
     --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}'

4. Analyze CloudTrail for attacker activity
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=<key> \
     --start-time <time> --end-time <time>

5. Check for persistence mechanisms
   - New IAM users, roles, or policies created
   - Lambda functions deployed
   - EC2 instances launched
   - S3 bucket policies modified

6. Snapshot affected EC2 instances for forensics
   aws ec2 create-snapshot --volume-id <vol-id> --description "IR-forensic-<case-id>"
```

**CloudTrail Analysis Queries (Athena)**:
```sql
-- Find all actions by a compromised access key
SELECT eventtime, eventsource, eventname, sourceipaddress,
       requestparameters, responseelements
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIA...'
  AND eventtime BETWEEN '2025-01-15T00:00:00Z' AND '2025-01-16T00:00:00Z'
ORDER BY eventtime;

-- Detect IAM persistence: new users, roles, policies
SELECT eventtime, eventname, useridentity.arn, sourceipaddress
FROM cloudtrail_logs
WHERE eventname IN ('CreateUser', 'CreateRole', 'CreatePolicy',
                    'AttachUserPolicy', 'AttachRolePolicy',
                    'PutRolePolicy', 'CreateAccessKey')
  AND eventtime > DATE_ADD('day', -7, NOW())
ORDER BY eventtime;

-- Detect data exfiltration via S3
SELECT eventtime, eventname, requestparameters, sourceipaddress
FROM cloudtrail_logs
WHERE eventsource = 's3.amazonaws.com'
  AND eventname IN ('GetObject', 'PutBucketPolicy', 'PutBucketAcl')
  AND sourceipaddress NOT IN ('10.0.0.0/8')  -- internal range
ORDER BY eventtime;
```

### 7.2 GCP Incident Response

**Key Services**:
- **Security Command Center (SCC)**: Centralized security findings
- **Cloud Audit Logs**: API activity (Admin Activity + Data Access logs)
- **Chronicle**: SIEM and SOAR platform
- **Cloud Forensics**: Disk snapshot and analysis toolkit

**GCP IR Playbook -- Compromised Service Account**:
```
1. List and disable service account keys
   gcloud iam service-accounts keys list --iam-account <sa-email>
   gcloud iam service-accounts keys disable <key-id> --iam-account <sa-email>

2. Analyze audit logs
   gcloud logging read 'protoPayload.authenticationInfo.principalEmail="<sa-email>"' \
     --project <project> --freshness=7d --format=json

3. Snapshot affected VM disks
   gcloud compute disks snapshot <disk-name> --zone <zone> \
     --snapshot-names ir-forensic-<case-id>

4. Review IAM bindings for persistence
   gcloud projects get-iam-policy <project> --format=json | \
     jq '.bindings[] | select(.members[] | contains("<sa-email>"))'
```

### 7.3 Kubernetes Incident Response

Container environments require specialized IR procedures due to their ephemeral
nature. Evidence disappears when containers terminate.

**Critical First Actions**:
```bash
# 1. Cordon the node (prevent new scheduling, preserve evidence)
kubectl cordon <node-name>

# 2. Capture pod state before it disappears
kubectl get pod <pod-name> -n <namespace> -o yaml > pod-state.yaml
kubectl logs <pod-name> -n <namespace> --all-containers > pod-logs.txt
kubectl describe pod <pod-name> -n <namespace> > pod-describe.txt

# 3. Capture container filesystem
kubectl cp <namespace>/<pod-name>:/  ./container-fs-dump/ -c <container>

# 4. Capture node-level evidence
# SSH to node, then:
crictl ps -a                           # list all containers including stopped
crictl inspect <container-id>          # container metadata
crictl logs <container-id>             # container logs

# 5. Snapshot the node's disk for forensic analysis
# (cloud-provider specific -- see AWS/GCP sections)

# 6. After evidence captured, drain the node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

**Runtime Security Tools**:
- **Falco**: Runtime threat detection via syscall monitoring
- **Sysdig Secure**: Container forensics and runtime security
- **Aqua Security**: Container and Kubernetes security platform
- **KubeArmor**: Runtime enforcement of security policies

### 7.4 Application-Level Incident Response

For application-layer incidents (injection, authentication bypass, data leak):

1. **Capture application state**: Thread dumps, heap dumps, connection pools
2. **Preserve logs**: Application logs, access logs, error logs, audit logs
3. **Database audit**: Query logs, recent schema changes, data modifications
4. **API audit**: Recent API key usage, rate limit events, authentication failures
5. **Feature flags**: Check for unauthorized feature flag modifications
6. **Dependency check**: Verify no dependency tampering (lock file integrity)

---

## 8. Incident Patterns -- Detailed Attack Chains

### 8.1 Ransomware Attack Chain (Double Extortion)

```
Phase 1: Initial Access (Day 0)
  - Phishing email with macro-enabled document
  - OR: Exploit public-facing VPN/RDP (CVE exploitation)
  - OR: Compromised credentials from infostealers

Phase 2: Execution & Persistence (Day 0-1)
  - Macro executes PowerShell downloader
  - Cobalt Strike / Sliver beacon deployed
  - Scheduled tasks or registry run keys for persistence
  - Detect: EDR behavioral alerts, PowerShell logging

Phase 3: Credential Access (Day 1-3)
  - Mimikatz / LSASS dump for credential harvesting
  - Kerberoasting for service account hashes
  - DCSync for domain credential replication
  - Detect: Honey tokens, LSASS access alerts

Phase 4: Lateral Movement (Day 2-5)
  - PsExec, WMI, WinRM for remote execution
  - RDP with harvested credentials
  - SMB file share access for reconnaissance
  - Detect: Anomalous auth patterns, UEBA alerts

Phase 5: Exfiltration (Day 3-7)
  - Data staged in archive files
  - Exfiltrated via HTTPS to cloud storage or Mega
  - Used as leverage for double extortion
  - Detect: DLP alerts, unusual outbound volume

Phase 6: Impact (Day 5-14)
  - Disable/delete backups (Veeam, shadow copies)
  - Disable security tools (tamper protection bypass)
  - Deploy ransomware across domain via GPO or PsExec
  - Ransom note dropped
  - Detect: Canary files, mass file operations
```

### 8.2 Cloud Account Takeover Chain

```
Phase 1: Initial Access
  - Phished cloud console credentials
  - Leaked access keys in public repository
  - Compromised CI/CD pipeline with cloud credentials

Phase 2: Reconnaissance
  - Enumerate IAM users, roles, policies
  - List S3 buckets, databases, secrets
  - Map network topology (VPCs, subnets, peering)
  - Detect: GuardDuty Recon findings, unusual API patterns

Phase 3: Privilege Escalation
  - Attach admin policy to compromised role
  - Create new access keys for existing admin users
  - Assume cross-account roles
  - Detect: IAM policy change alerts, CloudTrail anomalies

Phase 4: Persistence
  - Create new IAM users with console access
  - Deploy Lambda for backdoor access
  - Modify trust policies on existing roles
  - Detect: New IAM entity alerts, Lambda deployment monitoring

Phase 5: Impact
  - Data exfiltration from S3/RDS/DynamoDB
  - Cryptomining on large EC2 instances
  - Resource destruction (deletion of infrastructure)
  - Detect: Cost anomalies, data transfer alerts
```

### 8.3 Supply Chain Attack Pattern

```
Phase 1: Vendor Compromise
  - Attacker compromises build system of trusted vendor
  - Malicious code injected into software update
  - Signed with legitimate vendor certificate

Phase 2: Distribution
  - Trojanized update distributed through normal channels
  - Customers install automatically (trusted source)
  - Backdoor activates after delay or on specific trigger

Phase 3: Command and Control
  - Backdoor communicates with attacker infrastructure
  - Disguised as legitimate vendor traffic
  - DNS-based or HTTPS-based C2

Phase 4: Lateral Movement
  - Use privileges of compromised application
  - Access secrets, tokens, API keys managed by application
  - Pivot to additional systems using harvested credentials

Detection Strategy:
  - Monitor behavioral baselines of all software (new connections, processes)
  - Verify checksums of installed software against vendor manifests
  - Implement network segmentation for vendor software
  - Subscribe to vendor security advisories and threat intel feeds
```

---

## 9. Compliance and Standards

### 9.1 NIST SP 800-61 Rev. 3 (April 2025)

Major changes from Rev. 2:
- Aligns with NIST CSF 2.0 six functions (Govern, Identify, Protect, Detect, Respond, Recover)
- Emphasizes IR as part of broader cybersecurity risk management, not a standalone activity
- Incident preparation activities mapped across Govern, Identify, and Protect functions
- Recognizes that modern incidents are more frequent, complex, and dynamic
- Replaces the four-phase lifecycle with CSF 2.0 function mapping while maintaining
  conceptual continuity

### 9.2 GDPR Breach Notification (Articles 33-34)

- **Article 33**: Notify supervisory authority within 72 hours of becoming "aware"
- **Article 34**: Notify affected data subjects "without undue delay" if high risk
- "Awareness" = reasonable degree of certainty that personal data was compromised
- Notification must include: nature of breach, categories and approximate number of
  data subjects, likely consequences, measures taken to address and mitigate
- If 72 hours not feasible, provide reasons for delay with notification
- Document ALL breaches regardless of notification requirement (accountability principle)

### 9.3 PCI-DSS Incident Response (Requirement 12.10)

- **12.10.1**: Establish an IR plan; be prepared to respond immediately to a breach
- **12.10.2**: Review and test the plan at least annually
- **12.10.3**: Designate specific personnel to be available 24/7 for incident response
- **12.10.4**: Provide appropriate training to staff with IR responsibilities
- **12.10.4.1**: Periodically train IR personnel (frequency based on risk assessment)
- **12.10.5**: Include alerts from security monitoring systems (IDS/IPS, FIM, etc.)
- **12.10.6**: Evolve and update the IR plan based on lessons learned and industry changes
- **12.10.7**: Incident response procedures in place for detection of unauthorized
  wireless access points (PCI-DSS v4.0 specific requirement)

Card brand notification: Notify the payment card brands and acquirer within 24-72
hours depending on brand-specific requirements.

### 9.4 SOC 2 Incident Management (Common Criteria 7.x)

- **CC7.2**: Monitor system components for anomalies indicative of malicious acts
- **CC7.3**: Evaluate detected events to determine if they constitute incidents
- **CC7.4**: Respond to identified security incidents using defined procedures
- **CC7.5**: Identify the root cause and communicate remediation to prevent recurrence
- Annual IR plan testing is required for SOC 2 Type II certification
- All incidents must be documented with classification, response, and resolution
- Incidents that affect service commitments must be disclosed in SOC 2 reports

### 9.5 State Breach Notification Laws (US)

All 50 US states plus DC, Guam, Puerto Rico, and USVI have breach notification laws.
Key variations:

| State | Notification Window | Notable Requirement |
|---|---|---|
| California (CCPA/CPRA) | "Most expedient time possible" | Private right of action for breaches |
| New York (SHIELD Act) | "Most expedient time possible" | Broad definition of private information |
| Texas | 60 days | AG notification required for 250+ residents |
| Florida | 30 days | Penalties up to $500K for failure to notify |
| Colorado | 30 days | AG notification within 30 days |
| Massachusetts | "As soon as practicable" | Requires specific security program elements |

### 9.6 CISA Reporting (CIRCIA)

The Cyber Incident Reporting for Critical Infrastructure Act (2022):
- Covered entities in 16 critical infrastructure sectors
- 72-hour reporting for covered cyber incidents
- 24-hour reporting for ransom payments
- Supplemental reports required if substantially new information emerges
- Reports submitted to CISA; shared with relevant agencies
- Safe harbor: reports cannot be used for regulatory enforcement against reporter

---

## 10. Code Examples

### 10.1 Incident Severity Calculator

```python
"""
Incident severity calculator based on impact and urgency.
Use during initial triage to consistently classify incidents.
"""

from enum import IntEnum
from datetime import datetime

class Impact(IntEnum):
    CRITICAL = 4   # Organization-wide, customer data, production down
    HIGH = 3       # Department-wide, sensitive data, major service degraded
    MEDIUM = 2     # Team-level, internal data, minor service degraded
    LOW = 1        # Individual, no sensitive data, no service impact

class Urgency(IntEnum):
    CRITICAL = 4   # Active attack, spreading, time-sensitive regulatory
    HIGH = 3       # Confirmed compromise, potential for spread
    MEDIUM = 2     # Suspicious activity, contained, no active threat
    LOW = 1        # Informational, historical, no immediate action

SEVERITY_MATRIX = {
    (4, 4): "SEV-1",  (4, 3): "SEV-1",  (4, 2): "SEV-2",  (4, 1): "SEV-2",
    (3, 4): "SEV-1",  (3, 3): "SEV-2",  (3, 2): "SEV-2",  (3, 1): "SEV-3",
    (2, 4): "SEV-2",  (2, 3): "SEV-2",  (2, 2): "SEV-3",  (2, 1): "SEV-3",
    (1, 4): "SEV-2",  (1, 3): "SEV-3",  (1, 2): "SEV-4",  (1, 1): "SEV-5",
}

RESPONSE_SLA = {
    "SEV-1": "15 minutes",
    "SEV-2": "30 minutes",
    "SEV-3": "2 hours",
    "SEV-4": "8 hours",
    "SEV-5": "Next business day",
}

def classify_incident(impact: Impact, urgency: Urgency) -> dict:
    severity = SEVERITY_MATRIX[(impact.value, urgency.value)]
    return {
        "severity": severity,
        "impact": impact.name,
        "urgency": urgency.name,
        "response_sla": RESPONSE_SLA[severity],
        "classified_at": datetime.utcnow().isoformat() + "Z",
    }

# Usage:
# result = classify_incident(Impact.CRITICAL, Urgency.HIGH)
# => {"severity": "SEV-1", "response_sla": "15 minutes", ...}
```

### 10.2 Notification Timeline Tracker

```python
"""
Track regulatory notification deadlines from moment of breach awareness.
Alerts when deadlines are approaching.
"""

from datetime import datetime, timedelta
from dataclasses import dataclass, field

@dataclass
class NotificationDeadline:
    regulation: str
    recipient: str
    hours: int
    notified: bool = False
    notified_at: str | None = None

@dataclass
class BreachTimeline:
    case_id: str
    awareness_time: datetime
    deadlines: list[NotificationDeadline] = field(default_factory=list)

    def __post_init__(self):
        if not self.deadlines:
            self.deadlines = [
                NotificationDeadline("CISA/CIRCIA", "CISA", 72),
                NotificationDeadline("CISA/CIRCIA (ransom)", "CISA", 24),
                NotificationDeadline("GDPR Art.33", "Supervisory Authority", 72),
                NotificationDeadline("GDPR Art.34", "Data Subjects", 72),
                NotificationDeadline("SEC 8-K", "SEC", 96),
                NotificationDeadline("PCI-DSS", "Card Brands", 72),
                NotificationDeadline("HIPAA", "HHS OCR", 1440),  # 60 days
                NotificationDeadline("NIS2 Early Warning", "CSIRT", 24),
                NotificationDeadline("NIS2 Full", "CSIRT", 72),
            ]

    def check_deadlines(self) -> list[dict]:
        now = datetime.utcnow()
        alerts = []
        for d in self.deadlines:
            deadline = self.awareness_time + timedelta(hours=d.hours)
            remaining = deadline - now
            hours_left = remaining.total_seconds() / 3600
            alerts.append({
                "regulation": d.regulation,
                "recipient": d.recipient,
                "deadline": deadline.isoformat() + "Z",
                "hours_remaining": round(hours_left, 1),
                "status": "NOTIFIED" if d.notified else
                         "OVERDUE" if hours_left < 0 else
                         "URGENT" if hours_left < 6 else
                         "WARNING" if hours_left < 24 else "OK",
                "notified": d.notified,
            })
        return sorted(alerts, key=lambda x: x["hours_remaining"])

    def mark_notified(self, regulation: str):
        for d in self.deadlines:
            if d.regulation == regulation:
                d.notified = True
                d.notified_at = datetime.utcnow().isoformat() + "Z"

# Usage:
# timeline = BreachTimeline("IR-2025-042", datetime(2025, 6, 15, 14, 30))
# print(timeline.check_deadlines())
```

### 10.3 Post-Incident Report Template

```markdown
# Post-Incident Report

## Incident Summary
- **Case ID**: IR-YYYY-NNN
- **Severity**: SEV-N
- **Status**: Closed
- **Date Detected**: YYYY-MM-DD HH:MM UTC
- **Date Resolved**: YYYY-MM-DD HH:MM UTC
- **Duration**: N hours
- **MTTD (Mean Time to Detect)**: N hours from initial compromise
- **MTTR (Mean Time to Respond)**: N hours from detection to containment

## Incident Description
[2-3 paragraph summary of what happened]

## Timeline
| Time (UTC) | Event |
|---|---|
| YYYY-MM-DD HH:MM | Initial compromise occurred |
| YYYY-MM-DD HH:MM | Alert triggered by [system] |
| YYYY-MM-DD HH:MM | SOC analyst began triage |
| YYYY-MM-DD HH:MM | Incident declared, CSIRT activated |
| YYYY-MM-DD HH:MM | Containment actions implemented |
| YYYY-MM-DD HH:MM | Eradication completed |
| YYYY-MM-DD HH:MM | Recovery and service restoration |
| YYYY-MM-DD HH:MM | Incident closed |

## Root Cause Analysis
[What was the root cause? How did the attacker gain access?]

## Impact Assessment
- **Systems affected**: [list]
- **Data affected**: [type, volume, sensitivity]
- **Business impact**: [downtime, revenue, reputation]
- **Users/customers affected**: [count, notification status]

## Response Effectiveness
- **What worked well**: [list]
- **What could improve**: [list]
- **Detection gap**: [how could we detect this sooner?]

## Regulatory Notifications
| Regulation | Deadline | Notified | Date |
|---|---|---|---|
| [regulation] | [deadline] | Yes/No | [date] |

## Action Items
| # | Action | Owner | Deadline | Status |
|---|---|---|---|---|
| 1 | [action] | [owner] | [date] | Open |

## Lessons Learned
[Key takeaways and systemic improvements needed]
```

### 10.4 Automated CloudTrail Suspicious Activity Detector

```python
"""
Scan CloudTrail logs for common attacker behaviors.
Run as a Lambda or scheduled job for continuous monitoring.
"""

import json
from datetime import datetime, timedelta

# High-risk API calls that indicate potential compromise
SUSPICIOUS_EVENTS = {
    "persistence": [
        "CreateUser", "CreateRole", "CreateAccessKey",
        "AttachUserPolicy", "AttachRolePolicy", "PutRolePolicy",
        "CreateLoginProfile", "UpdateAssumeRolePolicy",
    ],
    "defense_evasion": [
        "StopLogging", "DeleteTrail", "UpdateTrail",
        "PutEventSelectors", "DeleteFlowLogs",
        "DisableGuardDuty", "DeleteDetector",
    ],
    "exfiltration": [
        "PutBucketPolicy", "PutBucketAcl",
        "ModifySnapshotAttribute", "ModifyImageAttribute",
        "CreateSnapshot", "SharedSnapshotCopyInitiated",
    ],
    "credential_access": [
        "GetSecretValue", "GetParametersByPath",
        "GetCallerIdentity",  # reconnaissance indicator
    ],
}

def analyze_cloudtrail_event(event: dict) -> dict | None:
    """Analyze a single CloudTrail event for suspicious activity."""
    event_name = event.get("eventName", "")
    source_ip = event.get("sourceIPAddress", "")
    user_arn = event.get("userIdentity", {}).get("arn", "")
    event_time = event.get("eventTime", "")

    for category, events in SUSPICIOUS_EVENTS.items():
        if event_name in events:
            return {
                "category": category,
                "event_name": event_name,
                "source_ip": source_ip,
                "user_arn": user_arn,
                "event_time": event_time,
                "risk": "HIGH" if category in ("defense_evasion", "persistence") else "MEDIUM",
                "raw_event": event,
            }
    return None

def detect_impossible_travel(events: list[dict], max_speed_kmh: int = 900) -> list[dict]:
    """Detect logins from geographically impossible locations."""
    # Group events by user, check for impossible location changes
    # Implementation requires GeoIP lookup for source IPs
    # Returns list of alerts for impossible travel detections
    alerts = []
    # ... GeoIP-based implementation ...
    return alerts

# Usage: Process CloudTrail log files
# for record in cloudtrail_records:
#     alert = analyze_cloudtrail_event(record)
#     if alert:
#         send_to_siem(alert)
```

### 10.5 IR Automation: Endpoint Isolation Script

```bash
#!/usr/bin/env bash
# ir-isolate.sh -- Isolate a compromised host via firewall rules
# Usage: ./ir-isolate.sh <hostname-or-ip> <case-id>
# Requires: SSH access to target, sudo privileges

set -euo pipefail

HOST="${1:?Usage: $0 <hostname-or-ip> <case-id>}"
CASE_ID="${2:?Usage: $0 <hostname-or-ip> <case-id>}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
LOG_FILE="/var/log/ir/${CASE_ID}-isolate-${TIMESTAMP}.log"
IR_ADMIN_IP="${IR_ADMIN_IP:?Set IR_ADMIN_IP to your IR workstation IP}"

mkdir -p /var/log/ir

echo "[${TIMESTAMP}] Isolating host ${HOST} for case ${CASE_ID}" | tee -a "${LOG_FILE}"

# Step 1: Capture current network state before isolation
ssh "${HOST}" "
  echo '=== Network connections ===' && ss -tulnp
  echo '=== Routing table ===' && ip route
  echo '=== ARP table ===' && ip neigh
  echo '=== Firewall rules ===' && iptables -L -n -v
" >> "${LOG_FILE}" 2>&1

# Step 2: Apply isolation firewall rules (allow only IR admin access)
ssh "${HOST}" "
  sudo iptables -I INPUT 1 -s ${IR_ADMIN_IP} -j ACCEPT
  sudo iptables -I OUTPUT 1 -d ${IR_ADMIN_IP} -j ACCEPT
  sudo iptables -I INPUT 2 -m state --state ESTABLISHED,RELATED -j ACCEPT
  sudo iptables -I OUTPUT 2 -m state --state ESTABLISHED,RELATED -j ACCEPT
  sudo iptables -A INPUT -j DROP
  sudo iptables -A OUTPUT -j DROP
  sudo iptables -A FORWARD -j DROP
"

echo "[$(date -u +%Y%m%dT%H%M%SZ)] Host ${HOST} isolated. Only ${IR_ADMIN_IP} can connect." \
  | tee -a "${LOG_FILE}"
echo "[INFO] To reverse: ssh ${HOST} sudo iptables -F" | tee -a "${LOG_FILE}"
```

---

## References

- NIST SP 800-61 Rev. 3 (April 2025) -- Incident Response Recommendations and Considerations
- NIST Cybersecurity Framework 2.0 (February 2024)
- IBM Cost of a Data Breach Report 2024, 2025
- Mandiant M-Trends 2025 Report
- Sophos Active Adversary Report 2025
- MITRE ATT&CK Framework (attack.mitre.org)
- GDPR Articles 33-34 -- Breach Notification
- PCI-DSS v4.0 Requirement 12.10
- SOC 2 Common Criteria (CC7.2-CC7.5)
- CISA Cyber Incident Reporting for Critical Infrastructure Act (CIRCIA)
- AWS Security Incident Response Guide
- GCP Security Command Center Documentation
- CrowdStrike Falcon Platform Documentation
- SentinelOne Singularity Platform Documentation
