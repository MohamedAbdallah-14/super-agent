# Deployment Anti-Patterns

> Deployment is the most dangerous phase of the software lifecycle. Code that passes every test can still destroy a company in minutes if deployed carelessly. The history of software is littered with billion-dollar lessons: Knight Capital lost $440 million in 45 minutes from a botched deploy, GitLab deleted its own production database and discovered all five backup systems were broken, and CrowdStrike bricked 8.5 million Windows machines with an untested kernel update. These are not edge cases -- they are the predictable consequences of deployment anti-patterns that persist across the industry.

> **Domain:** Process
> **Anti-patterns covered:** 20
> **Highest severity:** Critical

## Anti-Patterns

### AP-01: No Rollback Plan

**Also known as:** One-Way Deploy, Burn the Ships, Forward-Only Release
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

The team deploys with no documented or tested procedure to revert to the previous version. Rollback is a theoretical exercise rather than a rehearsed capability.

```yaml
# deploy.sh -- no rollback logic anywhere
#!/bin/bash
docker pull myapp:latest
docker stop myapp
docker run -d myapp:latest
echo "Deploy complete"
# What happens when :latest is broken? Nobody knows.
```

**Why teams do it:**

Rolling forward feels faster. Teams assume the new version will work because it passed tests. Writing and maintaining rollback procedures doubles the deployment engineering effort, and "we've never needed it" becomes a self-reinforcing excuse -- until the day they do.

**What goes wrong:**

Knight Capital Group, August 1, 2012. A deployment of new trading software to their SMARS order routing system failed silently on one of eight servers. That server retained old code with a defunct "Power Peg" function. When the market opened, the old code executed millions of erroneous trades. With no rollback procedure, engineers scrambled for 45 minutes while the system purchased $7 billion in unintended stock. Knight Capital lost $440 million -- three times its annual earnings. The stock dropped 75% in two days, and the company was acquired within months.

**The fix:**

Every deployment must have a documented, tested rollback procedure. Treat rollback as a first-class deployment artifact.

```yaml
# deploy.yaml -- rollback-aware
deploy:
  steps:
    - name: snapshot_current
      run: docker tag myapp:current myapp:rollback-$(date +%s)
    - name: deploy_new
      run: docker pull myapp:${{ VERSION }} && docker run -d myapp:${{ VERSION }}
    - name: health_check
      run: ./scripts/health-check.sh --timeout 60
    - name: auto_rollback
      if: failure()
      run: docker run -d myapp:rollback-${{ SNAPSHOT_TS }}
```

**Detection rule:**

Flag deployment pipelines that lack a rollback step or `on_failure` handler. Flag releases without a tagged previous-version artifact.

---

### AP-02: Friday Deployments

**Also known as:** YOLO Friday, End-of-Week Push, Weekend Roulette
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Teams push significant changes to production on Friday afternoons, leaving minimal staff available if problems emerge over the weekend.

**Why teams do it:**

Sprint deadlines align with Friday. Product managers want features "shipped this week." Developers feel pressure to close tickets before the weekend. The deploy itself seems routine.

**What goes wrong:**

A small config change deployed Friday at 5 PM can cascade into a weekend-long outage with skeleton staff. The AWS S3 outage (February 28, 2017) showed how a single mistyped command removed more servers than intended, taking down a significant portion of the internet for four hours and costing S&P 500 companies an estimated $150 million. Incidents discovered after-hours take 2-3x longer to resolve due to reduced staffing and fatigue-impaired decision-making.

**The fix:**

Establish deployment windows: deploy Monday through Thursday before 2 PM local time. If your CI/CD is mature enough that every deploy is small and instantly reversible, Friday deploys become safe -- but earn that trust with data, not optimism.

```bash
# Deploy window gate in CI
DAY=$(date +%u)  # 1=Monday, 5=Friday
HOUR=$(date +%H)
if [ "$DAY" -ge 5 ] || [ "$HOUR" -ge 16 ]; then
  echo "::error::Deploys blocked outside window (Mon-Thu before 4PM)"
  exit 1
fi
```

**Detection rule:**

Flag deployments triggered on Friday after 2 PM or on weekends. Track deployment day-of-week distribution and alert if Friday exceeds 25% of total deploys.

---

### AP-03: Big Bang Deployment

**Also known as:** All-at-Once Release, Flag Day, Forklift Upgrade
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Months of accumulated changes are deployed in a single massive release. The diff is thousands of lines across hundreds of files.

**Why teams do it:**

Long release cycles accumulate changes. Testing "everything together" feels thorough. Some teams simply lack deployment automation.

**What goes wrong:**

TSB Bank, April 2018. TSB attempted a "big bang" migration from Lloyds' legacy platform to Sabadell's Proteo4UK system over a single weekend. Nearly 2 million customers were locked out; some could see other people's accounts. TSB did not return to normal until December 2018 -- eight months later. The bank lost 330 million pounds, 80,000 customers, its CEO, and was fined 48.65 million pounds by regulators.

**The fix:**

Deploy small, deploy often. Break large changes into independently deployable increments behind feature flags. Target deployment frequency of at least weekly, ideally daily.

**Detection rule:**

Flag releases containing more than 50 commits or more than 2 weeks of accumulated changes. Track release size (lines changed, files touched) and alert on outliers.

---

### AP-04: Manual Deployment Steps

**Also known as:** Artisanal Deploys, Human Pipeline, Click-Ops
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Deployment requires a human to SSH into servers, run commands in sequence, edit config files by hand, and verify by eyeballing logs.

```text
DEPLOYMENT RUNBOOK (manual):
1. SSH to prod-web-01
2. cd /opt/app && git pull origin main
3. Edit config.yaml -- change DB_HOST to new address
4. pip install -r requirements.txt && python manage.py migrate
5. sudo systemctl restart app
6. Repeat steps 1-5 for prod-web-02 through prod-web-08
7. Check https://app.example.com and "make sure it works"
```

**Why teams do it:**

The team started with one server and manual deploys worked fine. Automation requires upfront investment. "We know the steps" becomes knowledge locked in one person's head.

**What goes wrong:**

GitLab, January 31, 2017. During manual troubleshooting of replication lag, a sysadmin ran `rm -rf /var/opt/gitlab/postgresql/data/` on the wrong server -- deleting 300 GB of live production data instead of the replica. By the time it was cancelled, only 4.5 GB remained. Recovery took 18 hours. GitLab lost 6 hours of data including 5,000 projects and 700 user accounts. None of their five backup/replication strategies were functioning.

**The fix:**

Automate everything. No human should type commands on production servers during deployment.

```yaml
# Fully automated -- no SSH, no manual steps
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test
      - run: docker build -t app:${{ github.sha }} . && docker push $REGISTRY/app:${{ github.sha }}
      - uses: azure/k8s-deploy@v4
        with:
          images: $REGISTRY/app:${{ github.sha }}
          strategy: canary
```

**Detection rule:**

Flag any deployment process that includes SSH commands, manual file edits, or human-executed shell scripts. Audit deployment logs for interactive session indicators.

---

### AP-05: No Feature Flags

**Also known as:** Deploy-to-Release Coupling, All-or-Nothing Features, Binary Releases
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Every deployment is also a release. Code ships to all users with no ability to toggle features, ramp gradually, or disable a broken feature without a full redeploy.

**Why teams do it:**

Feature flags add complexity: management, cleanup, combinatorial testing. Small teams feel the overhead outweighs the benefit.

**What goes wrong:**

Facebook, October 4, 2021. During routine backbone maintenance, a command to assess network capacity accidentally withdrew all BGP routes, disconnecting every Facebook data center from the internet. Facebook, WhatsApp, Instagram, and Messenger went down for six hours. Engineers could not access internal tools because those tools depended on the same infrastructure. Technicians had to physically travel to data centers. A feature flag on the maintenance command -- or an independent circuit breaker -- could have prevented the cascade.

**The fix:**

Decouple deployment from release. Ship code behind flags; activate features independently of deployments.

```python
# Feature flag controlling gradual rollout
if feature_flags.is_enabled("new_checkout_flow", user_id=user.id):
    return new_checkout(cart)
else:
    return legacy_checkout(cart)
```

**Detection rule:**

Flag any user-facing feature that ships without a feature flag. Track the ratio of deploys to feature flag changes -- if they are 1:1, flags are not being used for gradual rollout.

---

### AP-06: Deploying Untested Code

**Also known as:** Ship and Pray, YOLO Deploy, Test in Production
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Code is deployed without passing through the full automated test suite. Tests are skipped "just this once" because the change is "trivial" or the deadline is urgent.

**Why teams do it:**

Slow CI pipelines create pressure to bypass. "It's just a config change." Hotfixes feel too urgent for a full test cycle. Management pressure overrides engineering discipline.

**What goes wrong:**

CrowdStrike, July 19, 2024. A "rapid response content update" to the Falcon Sensor kernel-level security software contained a faulty configuration file that caused Windows machines to crash on boot. Because it was classified as a "content update," it bypassed standard testing. Approximately 8.5 million systems were bricked worldwide -- the largest IT outage in history. Airlines grounded flights, hospitals postponed surgeries, banks went offline. Fortune 500 losses: an estimated $5.4 billion. Delta Air Lines filed a $500 million lawsuit alleging CrowdStrike "deployed untested software updates."

**The fix:**

No code reaches production without passing the full automated test suite. No exceptions.

```yaml
# CI pipeline -- tests are mandatory, not advisory
deploy:
  needs: [unit-tests, integration-tests, e2e-tests, security-scan]
  if: |
    needs.unit-tests.result == 'success' &&
    needs.integration-tests.result == 'success' &&
    needs.e2e-tests.result == 'success' &&
    needs.security-scan.result == 'success'
```

**Detection rule:**

Flag any deployment that does not have a completed test run as a prerequisite. Alert on manual pipeline overrides that skip test stages.

---

### AP-07: No Staging Environment

**Also known as:** Dev-to-Prod Pipeline, Missing Middle, Cowboy Pipeline
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Code moves directly from a developer's machine or CI build to production with no intermediate environment mirroring production's configuration and data volume.

**Why teams do it:**

Staging costs money and maintenance effort. "Our tests are good enough." Startups under cash pressure cut infrastructure corners first.

**What goes wrong:**

Without staging, the first time code meets production-like conditions is in production. The Fastly CDN outage (June 8, 2021) was caused by a software update deployed in May containing a bug triggerable only under specific conditions. It sat dormant until a customer's config change triggered it, taking down Amazon, BBC, CNN, Shopify, and UK/US government websites. A staging environment with production-level configuration complexity would have surfaced the trigger before it reached the global network.

**The fix:**

Maintain at least one pre-production environment that mirrors production in architecture, configuration, and data volume (anonymized). Deploy to staging first, run smoke tests, soak for a defined period, then promote to production.

**Detection rule:**

Flag CI/CD pipelines that deploy directly to production without a staging step. Audit infrastructure-as-code for production resources without corresponding staging equivalents.

---

### AP-08: Config Drift Across Environments

**Also known as:** Snowflake Environments, Works on My Machine, Env Parity Violations
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Environments differ in software versions, database schemas, or infrastructure topology. Dev uses SQLite while production uses PostgreSQL. Staging runs Python 3.11 while production runs 3.9.

```yaml
# dev.env                    # prod.env
DATABASE_URL=sqlite:///db    DATABASE_URL=postgres://prod-host/db
CACHE_DRIVER=memory          CACHE_DRIVER=redis
PYTHON_VERSION=3.11          PYTHON_VERSION=3.9   # different!
```

**Why teams do it:**

Local development prioritizes convenience over fidelity. Drift accumulates gradually and invisibly across teams.

**What goes wrong:**

Config drift means "works in staging" tells you nothing about production. GitLab's backup failure that compounded the 2017 database deletion is a textbook example: backups silently failed because pg_dump 9.2 was running against PostgreSQL 9.6. The version mismatch went undetected because nobody verified tool compatibility in production. Teams routinely discover that staging "green" means nothing when production has different connection pool sizes, timeout values, or TLS configurations.

**The fix:**

Use infrastructure-as-code to define environments from shared templates. Parameterize only values that must differ (hostnames, credentials) and lock everything else.

```hcl
# Shared Terraform module -- environments differ only in variables
module "app_env" {
  source           = "./modules/app"
  environment      = var.env_name        # "staging" or "production"
  instance_type    = var.instance_type    # parameterized
  postgres_version = "16"                 # locked across all envs
  redis_version    = "7.2"                # locked across all envs
}
```

**Detection rule:**

Diff environment configuration files weekly. Flag version mismatches for databases, runtimes, and key dependencies between staging and production. Automate parity checks in CI.

---

### AP-09: No Post-Deploy Monitoring

**Also known as:** Fire and Forget, Deploy and Walk Away, Blind Deploy
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

The team deploys and immediately moves on. No one watches error rates, latency, or business metrics for the first 30-60 minutes after deploy.

**Why teams do it:**

Deploys happen frequently and "usually work." Monitoring dashboards exist but nobody watches them post-deploy. Alert thresholds are too coarse to catch gradual degradations.

**What goes wrong:**

Knight Capital's 45-minute catastrophe is the canonical example. After deploying to 7 of 8 servers, the team moved on. No one watched for anomalous trading patterns. The eighth server, running old code, generated millions of erroneous orders. By the time anyone noticed, $440 million was gone. Silent failures -- memory leaks, slow query regressions, elevated error rates -- can compound for hours before a customer complaint triggers investigation.

**The fix:**

Implement mandatory post-deploy observation windows with automated anomaly detection.

```yaml
# Post-deploy monitoring gate
post_deploy:
  duration: 30m
  checks:
    - error_rate < baseline * 1.1
    - p99_latency < baseline * 1.2
    - cpu_usage < 80%
    - business_metric.orders_per_minute > baseline * 0.9
  on_violation: auto_rollback
```

**Detection rule:**

Flag deployments where no one accessed monitoring dashboards within 30 minutes post-deploy. Track time-to-detection for post-deploy incidents -- if it exceeds 15 minutes, monitoring is insufficient.

---

### AP-10: Coupled Database Migrations

**Also known as:** Big Bang Migration, Schema-Code Lock-Step, Migration Roulette
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Database schema changes are deployed simultaneously with application code changes in a single atomic release. The migration and the code that depends on it ship together, making rollback of either impossible without rolling back both.

```sql
-- Migration runs during deploy, before new code starts
ALTER TABLE users DROP COLUMN legacy_role;
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
-- If new code fails, old code crashes because legacy_role is gone
```

**Why teams do it:**

It feels logical to ship the schema change with the code that uses it. Separate deployments require handling both schemas temporarily. Migration frameworks encourage this coupling by default.

**What goes wrong:**

When migration and code are coupled, rollback becomes impossible: old code expects the old schema, but the migration has already altered it. The TSB Bank disaster exemplifies this -- the entire data migration was coupled with the application cutover, and when the application failed, there was no way to safely revert the data layer.

**The fix:**

Use the expand-contract pattern: (1) expand -- add new columns, (2) deploy code that writes to both old and new, (3) contract -- remove old columns after new code is stable for days.

```sql
-- Phase 1: EXPAND (add new, keep old)
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);
-- Phase 2: CODE deploys, writes both columns, reads new with fallback
-- Phase 3: CONTRACT (after stable for days)
ALTER TABLE users DROP COLUMN legacy_role;
```

**Detection rule:**

Flag pull requests that contain both migration files and application code changes. Flag migrations that use DROP COLUMN or destructive ALTER without a corresponding expand phase.

---

### AP-11: No Blue-Green or Canary Strategy

**Also known as:** All-at-Once Cutover, Replace-and-Pray, In-Place Upgrade
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Every deployment replaces the running application in-place for all users simultaneously. No traffic routing to a subset, no parallel old-version environment, no instant switch.

**Why teams do it:**

Blue-green requires double the infrastructure. Canary needs traffic routing capabilities. "Our app is stateless, we just restart."

**What goes wrong:**

Cloudflare, November 18, 2025. A routine ClickHouse database permission change caused the Bot Management system to receive malformed configuration files that doubled in size, overwhelming the global network. Because the faulty configuration was pushed to the entire fleet simultaneously, the blast radius was the entire Cloudflare network. A canary deployment to 1% of edge nodes would have detected the anomaly before global impact.

**The fix:**

Implement progressive delivery: canary a new version to a small percentage of traffic, observe metrics, then gradually increase.

```yaml
# Kubernetes canary with Argo Rollouts
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 5m }
        - analysis:
            templates: [{ templateName: success-rate }]
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
```

**Detection rule:**

Flag deployment configurations that route 100% of traffic to the new version immediately. Flag infrastructure that lacks a traffic-splitting mechanism.

---

### AP-12: Hardcoded Environment Values

**Also known as:** Baked-In Config, Magic Strings, Env-in-Code
**Frequency:** Very Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

Connection strings, API keys, hostnames, and environment-specific values are embedded directly in application code or committed to version control.

```python
# hardcoded.py
DATABASE_URL = "postgres://admin:s3cret@prod-db.internal:5432/myapp"
API_KEY = "sk-live-abc123def456"
REDIS_HOST = "10.0.1.42"
FEATURE_LIMIT = 1000  # different in staging (100) -- but hardcoded here
```

**Why teams do it:**

It works immediately. No environment variables, no secret management infrastructure. The prototype shipped with hardcoded values and nobody replaced them.

**What goes wrong:**

Hardcoded credentials are the root cause of countless breaches -- in 2023, researchers found over 100,000 valid API keys exposed in public GitHub repositories. Beyond security, hardcoded values make the same artifact behave differently across environments. The SolarWinds attack (discovered December 2020) exploited the build pipeline partly because credentials and configuration were insufficiently separated from code, enabling attackers to inject malicious code that was signed and distributed to 18,000 customers.

**The fix:**

Externalize all environment-specific values. Use environment variables, secret managers, and config services.

```python
import os

DATABASE_URL = os.environ["DATABASE_URL"]      # injected at runtime
API_KEY = os.environ["API_KEY"]                 # from secret manager
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")  # safe default
FEATURE_LIMIT = int(os.environ.get("FEATURE_LIMIT", "100"))
```

**Detection rule:**

Scan code for patterns matching connection strings, API key formats (`sk-live-`, `AKIA`, `ghp_`), IP addresses, and hardcoded port numbers. Use tools like `gitleaks`, `trufflehog`, or `detect-secrets` in CI.

---

### AP-13: No Backup Before Migrations

**Also known as:** Naked Migration, Leap of Faith, YOLO Schema Change
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

Database migrations run against production without first taking a backup or snapshot. The team assumes the migration will succeed.

**Why teams do it:**

Backups are slow on large databases. "The migration is simple, just adding a column." Nobody wants to add 30 minutes to the deploy window for a backup.

**What goes wrong:**

GitLab's 2017 database disaster is the definitive cautionary tale. When `rm -rf` deleted 300 GB of production data, the team discovered that regular PostgreSQL backups had been silently failing for months (pg_dump 9.2 vs PostgreSQL 9.6). LVM snapshots were not configured. Azure backups existed but were untested. Of five backup strategies, zero worked. A verified backup would have prevented the 18-hour recovery and permanent loss of 6 hours of data.

**The fix:**

Take and verify a backup immediately before every migration. Make backup verification part of the deployment pipeline, not a separate ops concern.

```bash
#!/bin/bash
# pre-migration backup with verification
BACKUP="pre_migration_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump $DATABASE_URL | gzip > "$BACKUP"

# Verify: restore to test database and check integrity
gunzip -c "$BACKUP" | psql $TEST_DATABASE_URL
ROWS=$(psql $TEST_DATABASE_URL -t -c "SELECT count(*) FROM users")
[ "$ROWS" -lt 1 ] && echo "BACKUP VERIFICATION FAILED" && exit 1
echo "Backup verified ($ROWS users). Proceeding with migration."
```

**Detection rule:**

Flag migration scripts that do not call a backup step. Alert if the most recent verified backup is older than the deployment window.

---

### AP-14: Deployment Order Ignored

**Also known as:** Out-of-Order Deploy, Dependency Blindness, Race to Production
**Frequency:** Occasional
**Severity:** High
**Detection difficulty:** Hard

**What it looks like:**

Services are deployed in arbitrary order without considering inter-service dependencies. A consumer is deployed before its provider, or a breaking API change ships before consumers are updated.

**Why teams do it:**

Each team owns its own pipeline and deploys independently. Nobody maintains a dependency graph. "Microservices are supposed to be independent."

**What goes wrong:**

The AWS DynamoDB outage (October 2025) demonstrated cascading failures: an automation error triggered a chain reaction propagating to thousands of applications -- consumer apps, smart devices, banking systems -- because upstream changes were not coordinated with dependent services. Deploying a provider with a breaking API change before consumers are updated causes immediate 5xx errors cascading through the call graph.

**The fix:**

Maintain a service dependency graph. Deploy providers before consumers. Use API versioning so breaking changes coexist with old versions during transition.

**Detection rule:**

Flag API-breaking changes (removed endpoints, changed contracts) without a consumer deployment plan. Track deployment order against the dependency graph.

---

### AP-15: SSH to Production

**Also known as:** Cowboy Ops, Direct Server Access, Admin Shell, Hotfix-by-Hand
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

Engineers SSH directly into production servers to diagnose issues, apply hotfixes, edit configs, or run database queries by hand.

```bash
ssh admin@prod-server-01
vim /opt/app/config.yaml           # manual edit, no review
sudo systemctl restart app
psql -h prod-db -c "UPDATE users SET role='admin' WHERE id=42;"
```

**Why teams do it:**

It is the fastest path from "problem identified" to "problem fixed." Incident pressure demands speed. The CI/CD pipeline feels too slow during an outage.

**What goes wrong:**

GitLab's 2017 database deletion happened because a sysadmin was SSH'd into what they thought was the replica but was actually the production server. Direct production access bypasses every safety control: code review, testing, audit logging, and rollback capability. Changes via SSH are invisible to version control, unreproducible, and often forgotten. SOC 2, PCI-DSS, and HIPAA explicitly prohibit interactive production access without compensating controls.

**The fix:**

Eliminate direct production access. All changes flow through version-controlled, reviewed, automated pipelines. For incident response, use runbook automation and read-only observability tools.

```yaml
# Controlled break-glass procedure instead of SSH
break_glass:
  requires: [approval_from_on_call_lead, justification, session_recording]
  limits: { time: 60m, audit_log: immutable }
  post_access: [review_all_changes, commit_to_repo]
```

**Detection rule:**

Alert on any SSH connection to production servers. Flag production firewall rules that allow SSH from developer workstations. Monitor for interactive shell sessions on production hosts.

---

### AP-16: No Deployment Runbooks

**Also known as:** Tribal Knowledge Deploys, Oral Tradition Ops, Hero-Dependent Releases
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Easy

**What it looks like:**

The deployment procedure exists only in the heads of one or two senior engineers. When they are unavailable, nobody knows how to deploy or what to do when something goes wrong.

**Why teams do it:**

Documentation is boring. The process "isn't that complicated." Key engineers are always available (until they're not).

**What goes wrong:**

When the sole deployment expert is unavailable, the team either cannot deploy or deploys incorrectly. Facebook's 2021 outage recovery was slowed because engineers needing physical data center access had to be dispatched and authenticated in person -- processes not well-documented for a scenario where all remote tools were simultaneously down. Without runbooks, incident response devolves into panicked improvisation.

**The fix:**

Write runbooks for every deployment procedure and common failure mode. Store them alongside the code. Test them by having someone other than the author follow them.

**Detection rule:**

Flag services with no `RUNBOOK.md` or linked runbook. Track bus factor -- if only one person has deployed a service in 90 days, the runbook is insufficient.

---

### AP-17: Shared Deploy Credentials

**Also known as:** Communal Keys, Shared Service Account, Everyone Is Root
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Moderate

**What it looks like:**

The entire team uses the same credentials to deploy: a shared SSH key, a shared CI/CD service account, or a single API token passed around via Slack.

```text
# Shared credentials in team wiki (real examples found in audits)
SSH key: /shared/deploy_key (same key on all machines)
AWS Access Key: AKIAEXAMPLE123456
Docker Hub: deploy-bot / P@ssw0rd2024
```

**Why teams do it:**

Individual credentials are more work. Rotating is a chore. The team is small and trusts each other. "We'll fix it when we scale."

**What goes wrong:**

With shared credentials, there is no audit trail -- when something breaks, you cannot determine who deployed what. When someone leaves the company, you must rotate every shared credential or accept that an ex-employee retains production access. The SolarWinds attack succeeded partly because attackers could operate within the build pipeline using compromised credentials, and the lack of individual attribution made intrusion harder to detect.

**The fix:**

Issue individual, scoped credentials with short-lived tokens. Use OIDC federation for CI/CD.

```yaml
# GitHub Actions with OIDC -- no long-lived credentials
permissions:
  id-token: write
jobs:
  deploy:
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/deploy-${{ github.actor }}
```

**Detection rule:**

Flag pipelines using long-lived credentials or static API keys. Alert on credentials not rotated in 90 days. Audit for shared SSH keys across machines.

---

### AP-18: No Audit Trail

**Also known as:** Ghost Deploys, Untracked Changes, Who Did What?
**Frequency:** Common
**Severity:** High
**Detection difficulty:** Moderate

**What it looks like:**

Deployments happen without recording who triggered them, what version was deployed, or whether the deploy succeeded. When an incident occurs, the team cannot answer "what changed recently?"

**Why teams do it:**

Logging feels like overhead. The CI/CD tool has some logs but they are not centralized or searchable. Manual deploys bypass logging entirely.

**What goes wrong:**

Without an audit trail, incident response starts with "does anyone know if anything was deployed recently?" The Knight Capital investigation revealed that the partial deployment (7 of 8 servers) was not logged in a way that made the anomaly visible. If an audit trail had shown "8 expected, 7 completed," the problem could have been caught before market open. SOC 2 Type II, PCI-DSS, and HIPAA require deployment audit trails; their absence blocks certifications.

**The fix:**

Log every deployment to a centralized, immutable audit system with structured metadata.

```json
{
  "event": "deployment",
  "timestamp": "2026-03-08T14:23:00Z",
  "deployer": "jane.doe@company.com",
  "service": "checkout-api",
  "version": "v2.14.3",
  "commit": "abc123f",
  "environment": "production",
  "status": "success",
  "rollback_version": "v2.14.2",
  "change_ticket": "JIRA-4521"
}
```

**Detection rule:**

Flag deployments without a structured audit log entry. Alert on version jumps (e.g., v2.14.2 to v2.14.5 suggests unlogged deploys).

---

### AP-19: Untested Rollbacks

**Also known as:** Rollback Theater, Paper Rollback, Theoretical Revert
**Frequency:** Very Common
**Severity:** Critical
**Detection difficulty:** Hard

**What it looks like:**

The deployment pipeline includes a rollback step, but it has never been executed. No one has verified it against real conditions: data migrations, cache invalidation, session state, downstream dependencies.

**Why teams do it:**

Testing rollbacks requires deliberate failure injection, which is scary and time-consuming. "We have a rollback plan" satisfies the process checkbox without actually testing it.

**What goes wrong:**

GitLab's five backup strategies all failed when tested under real disaster conditions. Untested recovery mechanisms are not recovery mechanisms. A rollback script that works against a clean database may fail post-migration. A rollback for stateless services may corrupt state in stateful ones. A 2023 Gartner study found that 75% of organizations that had not tested their disaster recovery plans failed to meet recovery time objectives during actual incidents.

**The fix:**

Regularly test rollbacks in production-like environments. Include rollback testing in your deployment pipeline validation.

```yaml
# Monthly rollback drill
rollback_drill:
  schedule: "0 10 1 * *"  # First of every month
  steps:
    - deploy: app:$NEXT_VERSION
    - verify: health_check
    - rollback: app:$CURRENT_VERSION
    - verify: [health_check, data_integrity_check]
    - report: post to #engineering with results
```

**Detection rule:**

Track last rollback execution per service. Flag services where rollback has never been tested or was last tested more than 90 days ago.

---

### AP-20: No Security Scanning in CI/CD

**Also known as:** Unguarded Pipeline, Security Afterthought, Shift-Right Security
**Frequency:** Common
**Severity:** Critical
**Detection difficulty:** Easy

**What it looks like:**

The CI/CD pipeline builds, tests, and deploys code without any automated security checks: no dependency scanning, no SAST, no container image scanning, no secrets detection.

```yaml
# Pipeline with zero security gates
pipeline: [lint, unit_test, build, deploy]
# no SAST, no DAST, no dependency audit, no secrets scan
```

**Why teams do it:**

Security scanning slows down the pipeline. Security is "someone else's job." Security tools generate too many false positives, so they were disabled.

**What goes wrong:**

The SolarWinds supply chain attack (2020) demonstrated catastrophic consequences. Attackers infiltrated SolarWinds' CI/CD system and injected the "SUNBURST" backdoor into the Orion build process. Trojanized updates were digitally signed and distributed to over 18,000 customers, including US government agencies and Fortune 500 companies. Automated integrity verification and security scanning in the pipeline could have detected the unauthorized modifications before signing and shipping.

**The fix:**

Integrate security scanning at every stage of the pipeline. Fail the build on critical vulnerabilities.

```yaml
# Security-hardened pipeline
stages:
  - secrets_scan: gitleaks detect --source . --verbose
  - dependency_audit: npm audit --audit-level=critical
  - sast: semgrep --config=auto --error
  - container_scan: trivy image myapp:$VERSION --severity CRITICAL,HIGH --exit-code 1
  - build_and_test: npm ci && npm test
  - deploy:  # only runs if all above pass
      needs: [secrets_scan, dependency_audit, sast, container_scan, build_and_test]
```

**Detection rule:**

Flag CI/CD pipelines without at least one security scanning step. Audit for disabled or "allow-failure" security jobs. Track deploys that bypass security gates.

---

## Root Cause Analysis

| Root Cause | Contributing Anti-Patterns | Systemic Fix |
|---|---|---|
| **Speed over safety culture** | AP-01, AP-06, AP-09, AP-15 | Automated rollback, canary deploys, fast pipelines with all checks |
| **Insufficient automation** | AP-04, AP-11, AP-17, AP-18 | CI/CD as product infrastructure; zero manual steps in deploy path |
| **Missing environments & parity** | AP-07, AP-08, AP-12 | Infrastructure-as-code with shared modules; parity checks in CI |
| **Deploy-release coupling** | AP-03, AP-05, AP-10 | Decouple deploy from release; expand-contract migrations; feature flags |
| **No resilience testing** | AP-19, AP-13, AP-01 | DR drills; chaos engineering; rollback testing in pipeline |
| **Organizational silos** | AP-14, AP-16, AP-02 | Cross-team coordination; dependency graph; deploy window policies |
| **Security as afterthought** | AP-20, AP-17, AP-12, AP-15 | Shift-left security; OIDC federation; zero-trust access; security gates |
| **Hero culture** | AP-04, AP-15, AP-16, AP-17 | Eliminate single points of human dependency; automate and document |
| **Budget constraints** | AP-07, AP-11, AP-08 | Quantify outage cost vs infrastructure cost; risk-adjusted ROI |
| **Incremental neglect** | AP-18, AP-19, AP-13, AP-08 | Scheduled audits; automated compliance checks; decay detection |

## Self-Check Questions

1. **Rollback readiness:** If your production deploy fails right now, can you revert within 5 minutes? Have you tested this in the last 90 days?

2. **Deploy timing:** What percentage of deploys happen on Fridays or after 4 PM? If above 20%, why?

3. **Release size:** How many commits in your average release? If more than 20, can you break into smaller, more frequent deploys?

4. **Automation coverage:** How many manual steps exist in your deployment? Can a new team member deploy on their first day using the pipeline alone?

5. **Feature flags:** Can you disable a feature in production without deploying new code?

6. **Environment parity:** When did you last diff staging and production configurations? Are runtime and dependency versions identical?

7. **Post-deploy observation:** After your last deploy, how long did someone actively monitor metrics? Is this defined in process or dependent on individual discipline?

8. **Migration safety:** Does your pipeline take a verified backup before running migrations? Have you tested restoring from it?

9. **Blast radius:** If your next deploy has a critical bug, what percentage of users are affected? Is it 100%?

10. **Credential hygiene:** Can you identify exactly who deployed last Tuesday? Are deploy credentials individual or shared?

11. **Security gates:** Does your pipeline include dependency scanning, secrets detection, and SAST? Can these be bypassed without approval?

12. **Runbook coverage:** If your primary deploy engineer is unreachable, can someone else deploy using written documentation alone?

13. **Rollback testing:** When did you last deliberately roll back a production deployment to verify the procedure works?

14. **Dependency awareness:** Do you know which services depend on yours? If you deploy a breaking change, will dependents fail gracefully or crash?

15. **Audit completeness:** Can you produce a complete deployment history for the last 12 months -- who, what, when, and whether it succeeded?

## Code Smell Quick Reference

| Anti-Pattern | AKA | Severity | Frequency | Key Signal | First Action |
|---|---|---|---|---|---|
| No Rollback Plan | Burn the Ships | Critical | Very Common | No rollback step in pipeline | Add rollback automation + test it |
| Friday Deploys | YOLO Friday | High | Very Common | >20% of deploys on Friday PM | Enforce deploy windows |
| Big Bang Deploy | Flag Day | Critical | Common | 50+ commits per release | Break into incremental releases |
| Manual Steps | Click-Ops | High | Common | SSH in deploy process | Automate the entire pipeline |
| No Feature Flags | Binary Release | High | Common | Deploy = release for all users | Add flag framework + gradual rollout |
| Untested Code | Ship and Pray | Critical | Common | Skipped test stages | Make test suite a hard gate |
| No Staging | Cowboy Pipeline | High | Common | CI deploys direct to prod | Create staging environment |
| Config Drift | Snowflake Envs | High | Very Common | Version mismatches across envs | Infrastructure-as-code parity |
| No Post-Deploy Monitoring | Fire and Forget | Critical | Common | No observation window defined | Add automated post-deploy checks |
| Coupled DB Migrations | Migration Roulette | Critical | Common | Migration + code in same PR | Expand-contract pattern |
| No Canary/Blue-Green | Replace and Pray | High | Common | 100% traffic to new version | Implement progressive delivery |
| Hardcoded Env Values | Baked-In Config | High | Very Common | Credentials in source code | Externalize config + secrets manager |
| No Pre-Migration Backup | YOLO Schema Change | Critical | Common | No backup step before migrate | Verified backup in pipeline |
| Deploy Order Ignored | Dependency Blindness | High | Occasional | Independent service deploys | Maintain dependency graph |
| SSH to Production | Cowboy Ops | Critical | Common | Interactive prod sessions | Zero-trust access + break-glass |
| No Runbooks | Tribal Knowledge | High | Common | One person can deploy | Write + test runbooks |
| Shared Credentials | Everyone Is Root | Critical | Common | Shared SSH keys / tokens | Individual OIDC credentials |
| No Audit Trail | Ghost Deploys | High | Common | Cannot answer "who deployed?" | Structured deploy logging |
| Untested Rollbacks | Rollback Theater | Critical | Very Common | Rollback script never executed | Monthly rollback drills |
| No Security Scanning | Unguarded Pipeline | Critical | Common | No SAST/SCA in CI/CD | Add security gates to pipeline |

---

*Researched: 2026-03-08 | Sources: Knight Capital SEC filing and post-mortem (henricodolfing.ch, SEC); GitLab.com database incident post-mortem (about.gitlab.com/blog); CrowdStrike July 2024 outage analysis (Wikipedia, CNN, Fortune, CybersecurityDive); TSB Bank migration disaster (ComputerWeekly, henricodolfing.ch); Facebook/Meta October 2021 outage post-mortem (engineering.fb.com, Cloudflare blog); AWS S3 February 2017 outage summary (aws.amazon.com/message/41926); Cloudflare November 2025 outage post-mortem (blog.cloudflare.com); Fastly CDN June 2021 outage; SolarWinds supply chain attack analysis (Fortinet, CyberArk, CISA); AWS DynamoDB October 2025 outage; charity.wtf Friday deploys analysis; enov8.com deployment management; alpacked.io DevOps anti-patterns*
