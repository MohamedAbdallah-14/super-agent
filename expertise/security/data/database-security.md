# Database Security

> Comprehensive security guidance for database deployments, access control, query safety,
> and breach prevention across PostgreSQL, MongoDB, MySQL, Redis, and cloud-managed services.

---

## 1. Threat Landscape

### 1.1 The Scale of Exposed Databases

Databases remain one of the most targeted assets in any infrastructure. The attack surface
is enormous and growing:

- **MongoDB**: Over 213,000 internet-exposed MongoDB instances identified via Shodan (2025).
  Of these, 3,100+ were accessible without any authentication. Nearly 45.6% of unauthenticated
  instances had already been compromised and wiped, with ransom notes left behind.
  (Source: Flare Security 2026 research, BleepingComputer)
- **Elasticsearch**: Routinely found exposed on Shodan with no authentication enabled.
  The default installation has no security enabled, making every deployment a potential breach.
- **Redis**: Approximately 330,000 Redis instances exposed to the internet, with ~60,000
  having no authentication configured. 57% of cloud environments install Redis as container
  images, many without proper security hardening. (Source: Wiz Research)
- **PostgreSQL/MySQL**: Less commonly exposed directly, but cloud misconfigurations
  (security groups set to 0.0.0.0/0) remain a frequent finding in penetration tests.

### 1.2 Real-World Breaches

**Microsoft (2019) -- 250 Million Support Records**
Five Elasticsearch servers containing 250 million Customer Service and Support records
were left accessible to anyone with a web browser -- no password or authentication needed.
The data spanned 14 years (2005-2019) and included email addresses, IP addresses, customer
locations, and descriptions of support cases, some marked confidential. Root cause: a
misconfiguration of security rules for an internal database. Discovered by Bob Diachenko
(Comparitech). (Source: Comparitech, WeLiveSecurity)

**Shanghai Police / Alibaba Cloud (2022) -- 1 Billion Records**
A hacker offered to sell data from a Shanghai police database containing personal information
on approximately 1 billion Chinese citizens -- names, addresses, national ID numbers, phone
numbers, and criminal records. The data was hosted on Alibaba Cloud and had been publicly
accessible via an unsecured backdoor link since at least April 2021. The breach was caused
by a misconfigured cloud server that did not require a password. The asking price: 10 Bitcoin
(~$200,000). (Source: The Register, TechCrunch, CNN)

**National Public Data (2024) -- 2.9 Billion Records**
Approximately 2.9 billion data records exposed, impacting 1.3 billion individuals. Exposed
data included full names, addresses, dates of birth, Social Security numbers, phone numbers,
and email addresses. One of the largest breaches in U.S. history. (Source: multiple reports)

**Snowflake Cloud Breaches (2024)**
Snowflake was involved in multiple major corporate data breaches, including attacks on AT&T
and Ticketmaster, attributed to threat actor UNC5537. Attackers exploited stolen credentials
and the absence of multi-factor authentication on Snowflake customer accounts.

**MongoBleed CVE-2025-14847**
A high-severity vulnerability in MongoDB's zlib-based network compression. Unauthenticated
attackers could leak sensitive information from server memory. Over 87,000 potentially
vulnerable instances were exposed at time of disclosure. Public PoC exploit code was released
shortly after. (Source: Resecurity, Arctic Wolf, Akamai)

### 1.3 Common Attack Vectors

| Vector | Description | Impact |
|--------|-------------|--------|
| Exposed management ports | DB port open to internet (5432, 3306, 27017, 6379) | Full data access |
| Default/weak credentials | Factory defaults or common passwords | Complete takeover |
| SQL injection | Malicious SQL via application layer | Data theft, modification |
| Privilege escalation | Exploiting overprivileged accounts | Lateral movement |
| Credential stuffing | Reused passwords from other breaches | Account takeover |
| Insider threat | Malicious or compromised insiders | Data exfiltration |
| Unencrypted backups | Backup files without encryption | Offline data theft |
| Memory disclosure | Vulnerabilities like MongoBleed | Credential/data leakage |

---

## 2. Core Security Principles

### 2.1 Least Privilege

Every database account should have the minimum permissions required for its function:

- **Application accounts**: SELECT, INSERT, UPDATE, DELETE on specific tables only.
  Never GRANT ALL PRIVILEGES. Never use the superuser/root account for application connections.
- **Migration accounts**: Temporary elevated privileges, revoked after migration completes.
- **Monitoring accounts**: Read-only access to system catalogs and statistics views.
- **Backup accounts**: Read-only with pg_dump/mongodump privileges, no write access.
- **Human operators**: Individual named accounts, never shared credentials.

### 2.2 Network Isolation

- Databases must never be directly accessible from the public internet.
- Place databases in private subnets with no public IP addresses.
- Use security groups / firewall rules to allow connections only from application servers.
- Use VPN or SSH tunnels for administrative access.
- Enable VPC peering or private endpoints for cloud-managed databases.

### 2.3 Encryption

**At rest:**
- Enable Transparent Data Encryption (TDE) or filesystem-level encryption.
- Encrypt all backup files. Use AES-256 as the minimum standard.
- Encrypt WAL/binlog files.

**In transit:**
- Require TLS 1.2+ for all database connections. Reject plaintext connections.
- Use strong cipher suites. Disable SSLv3, TLS 1.0, TLS 1.1.
- Verify server certificates from clients (sslmode=verify-full for PostgreSQL).

### 2.4 Authentication

- Use strong password hashing: SCRAM-SHA-256 (PostgreSQL), caching_sha2_password (MySQL).
- Never use MD5 or plaintext password storage.
- Enforce password complexity and rotation policies.
- Use certificate-based authentication where possible.
- Enable multi-factor authentication for administrative access.

### 2.5 Audit Logging

- Log all authentication attempts (success and failure).
- Log all DDL operations (CREATE, ALTER, DROP).
- Log all privilege changes (GRANT, REVOKE).
- Log data access to sensitive tables.
- Ship logs to a centralized, tamper-resistant logging system (SIEM).

### 2.6 Parameterized Queries

- Never construct SQL via string concatenation.
- Use prepared statements or parameterized queries exclusively.
- ORMs should be configured to use parameterized queries by default.
- Input validation is a secondary defense, not a replacement.

---

## 3. Implementation Patterns

### 3.1 PostgreSQL Security Hardening

**pg_hba.conf -- Host-Based Authentication:**

```conf
# TYPE  DATABASE  USER       ADDRESS         METHOD

# Reject all by default -- explicit entries only
# Local connections: require scram-sha-256
local   all       all                        scram-sha-256

# Application server subnet only -- require SSL + scram
hostssl appdb     app_user   10.0.1.0/24     scram-sha-256

# Admin access from bastion only -- require SSL + cert
hostssl all       admin_user 10.0.0.5/32     cert

# Deny everything else
host    all       all        0.0.0.0/0       reject
host    all       all        ::/0            reject
```

**Key pg_hba.conf rules:**
- Never use `trust` method for any remote connection.
- Never allow `0.0.0.0/0` for any database/user combination.
- Use `hostssl` instead of `host` to enforce TLS.
- Be specific: name exact databases and users, not `all`.

**postgresql.conf security settings:**

```conf
# Authentication
password_encryption = 'scram-sha-256'

# SSL/TLS
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
ssl_ca_file = '/etc/ssl/certs/ca.crt'
ssl_min_protocol_version = 'TLSv1.2'

# Connection limits
max_connections = 100
superuser_reserved_connections = 3

# Logging
log_connections = on
log_disconnections = on
log_statement = 'ddl'
log_line_prefix = '%m [%p] %q%u@%d '
```

**Row-Level Security (RLS):**

```sql
-- Enable RLS on sensitive table
ALTER TABLE customer_data ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE customer_data FORCE ROW LEVEL SECURITY;

-- Policy: users can only see their own organization's data
CREATE POLICY org_isolation ON customer_data
    USING (org_id = current_setting('app.current_org_id')::int);

-- Policy: read-only access for analysts
CREATE POLICY analyst_read ON customer_data
    FOR SELECT
    TO analyst_role
    USING (classification != 'top_secret');
```

**Least-privilege role setup:**

```sql
-- Create application role with minimal permissions
CREATE ROLE app_user WITH LOGIN PASSWORD 'use-secrets-manager'
    CONNECTION LIMIT 20
    VALID UNTIL '2025-12-31';

-- Grant only necessary table permissions
GRANT CONNECT ON DATABASE appdb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON customers, orders TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Explicitly deny dangerous operations
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- Read-only monitoring role
CREATE ROLE monitor_user WITH LOGIN PASSWORD 'use-secrets-manager';
GRANT CONNECT ON DATABASE appdb TO monitor_user;
GRANT USAGE ON SCHEMA public TO monitor_user;
GRANT SELECT ON pg_stat_activity, pg_stat_statements TO monitor_user;
```

### 3.2 MongoDB Access Control and Authentication

```javascript
// mongod.conf -- security configuration
// security:
//   authorization: enabled
//   javascriptEnabled: false
// net:
//   tls:
//     mode: requireTLS
//     certificateKeyFile: /etc/ssl/mongodb.pem
//     CAFile: /etc/ssl/ca.pem
//   bindIp: 10.0.1.10  # NEVER use 0.0.0.0

// Create admin user (do this BEFORE enabling authorization)
db.createUser({
  user: "admin",
  pwd: passwordPrompt(),  // interactive prompt, never hardcode
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
});

// Create application user with minimal privileges
db.createUser({
  user: "app_service",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "appdb" },
  ],
  mechanisms: ["SCRAM-SHA-256"]  // enforce strong auth
});

// Create read-only analytics user
db.createUser({
  user: "analyst",
  pwd: passwordPrompt(),
  roles: [{ role: "read", db: "appdb" }],
  mechanisms: ["SCRAM-SHA-256"]
});
```

**Critical MongoDB security settings:**
- Always enable `authorization: enabled` in mongod.conf.
- Set `bindIp` to specific internal addresses, never `0.0.0.0`.
- Disable JavaScript execution (`javascriptEnabled: false`) unless required.
- Require TLS for all connections.
- Disable the HTTP status interface and REST API in production.

### 3.3 Connection Pooling Security

```typescript
// Secure connection pool configuration (Node.js/Knex example)
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,         // from environment/secrets
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,  // from secrets manager
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true,         // CRITICAL: verify server cert
      ca: fs.readFileSync('/etc/ssl/certs/db-ca.crt'),
    },
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    // Validate connections before use
    afterCreate: (conn, done) => {
      conn.query('SELECT 1', (err) => done(err, conn));
    },
  },
});
```

### 3.4 Migration Security

- Run migrations with a dedicated migration user that has DDL privileges.
- Revoke DDL privileges from the migration user after deployment.
- Review all migration SQL for destructive operations before execution.
- Never store migration credentials in source code.
- Log all migration executions with timestamps and operator identity.

### 3.5 Backup Encryption

```bash
# PostgreSQL encrypted backup
pg_dump -h localhost -U backup_user appdb \
  | gpg --symmetric --cipher-algo AES256 \
  --passphrase-file /etc/backup/passphrase \
  > /backups/appdb_$(date +%Y%m%d).sql.gpg

# MongoDB encrypted backup
mongodump --uri="mongodb://backup_user:$PASS@10.0.1.10:27017/appdb" \
  --ssl --sslCAFile=/etc/ssl/ca.pem \
  --archive \
  | gpg --symmetric --cipher-algo AES256 \
  --passphrase-file /etc/backup/passphrase \
  > /backups/appdb_$(date +%Y%m%d).archive.gpg

# Verify backup integrity
gpg --decrypt /backups/appdb_$(date +%Y%m%d).sql.gpg | head -5
```

---

## 4. Vulnerability Catalog

### V-01: Default Credentials

**Risk**: Critical | **CVSS**: 9.8
**Description**: Database installed with factory-default or empty passwords.
**Affected**: All databases. Redis historically shipped with no password required.
MongoDB before 4.0 did not enable authentication by default.

```bash
# VULNERABLE: Redis with no authentication
redis-server  # starts with no password

# SECURE: Redis with strong authentication
# redis.conf
requirepass "$(openssl rand -base64 32)"
# Redis 6+ ACL system
user app_user on >strong_password ~app:* +get +set +del -@admin
```

### V-02: Overprivileged Application Accounts

**Risk**: High | **CVSS**: 8.1
**Description**: Application connects as superuser or with ALL PRIVILEGES.

```sql
-- VULNERABLE
GRANT ALL PRIVILEGES ON *.* TO 'app'@'%';

-- SECURE
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'app'@'10.0.1.%';
```

### V-03: Unencrypted Connections

**Risk**: High | **CVSS**: 7.5
**Description**: Database traffic transmitted in plaintext, vulnerable to MITM.

```python
# VULNERABLE: No SSL verification
conn = psycopg2.connect(host="db.example.com", sslmode="prefer")

# SECURE: Full SSL verification
conn = psycopg2.connect(
    host="db.example.com",
    sslmode="verify-full",
    sslrootcert="/etc/ssl/certs/db-ca.crt"
)
```

### V-04: Exposed Management Ports

**Risk**: Critical | **CVSS**: 9.8
**Description**: Database ports (5432, 3306, 27017, 6379) accessible from internet.

```hcl
# VULNERABLE: Terraform security group
resource "aws_security_group_rule" "db" {
  type        = "ingress"
  from_port   = 5432
  to_port     = 5432
  cidr_blocks = ["0.0.0.0/0"]  # Open to entire internet
}

# SECURE: Restrict to application subnet
resource "aws_security_group_rule" "db" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  source_security_group_id = aws_security_group.app.id
}
```

### V-05: Missing Audit Logs

**Risk**: Medium | **CVSS**: 5.3
**Description**: No logging of database operations, making breach detection impossible.
Without audit logs, organizations cannot detect unauthorized access, satisfy compliance
requirements, or perform forensic analysis after an incident.

### V-06: Unencrypted Backups

**Risk**: High | **CVSS**: 7.5
**Description**: Database backups stored as plaintext files. If backup storage is
compromised, all data is immediately readable. Backups often contain more sensitive
data than the live database (historical records, deleted data).

### V-07: SQL Injection Bypass at DB Level

**Risk**: Critical | **CVSS**: 9.8
**Description**: Even with application-level parameterized queries, stored procedures
or dynamic SQL within the database can be vulnerable.

```sql
-- VULNERABLE: Dynamic SQL in stored procedure
CREATE FUNCTION search_users(search_term TEXT) RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT * FROM users WHERE name = ''' || search_term || '''';
END;
$$ LANGUAGE plpgsql;

-- SECURE: Parameterized dynamic SQL
CREATE FUNCTION search_users(search_term TEXT) RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT * FROM users WHERE name = $1' USING search_term;
END;
$$ LANGUAGE plpgsql;
```

### V-08: Excessive Data Retention

**Risk**: Medium | **CVSS**: 5.0
**Description**: Storing more data than necessary increases breach impact. PII and
sensitive data kept indefinitely without business justification violates GDPR and
increases liability.

### V-09: Connection String Leakage

**Risk**: High | **CVSS**: 8.1
**Description**: Database credentials exposed in source code, logs, error messages,
or environment dumps.

```python
# VULNERABLE: Credentials in source code
DATABASE_URL = "postgresql://admin:SuperSecret123@db.prod.internal:5432/app"

# SECURE: Credentials from secrets manager
import boto3
client = boto3.client('secretsmanager')
secret = client.get_secret_value(SecretId='prod/db/credentials')
DATABASE_URL = json.loads(secret['SecretString'])['url']
```

### V-10: Missing Connection Limits

**Risk**: Medium | **CVSS**: 5.3
**Description**: No per-user or per-application connection limits, allowing a single
compromised service to exhaust all database connections (denial of service).

### V-11: Stale User Accounts

**Risk**: Medium | **CVSS**: 6.5
**Description**: Former employee or decommissioned service accounts still active.
Regular access reviews are mandatory.

### V-12: Unrestricted COPY/LOAD Operations

**Risk**: High | **CVSS**: 7.5
**Description**: PostgreSQL COPY TO/FROM and MySQL LOAD DATA can read/write server
filesystem. Must be restricted to superuser or specific roles.

### V-13: Enabled Debug Features in Production

**Risk**: Medium | **CVSS**: 5.0
**Description**: MongoDB JavaScript evaluation, Redis DEBUG commands, PostgreSQL
`log_statement = 'all'` exposing query parameters in logs.

### V-14: Missing Row-Level Security

**Risk**: High | **CVSS**: 7.5
**Description**: Multi-tenant applications relying solely on application logic for
data isolation. A single bug in the WHERE clause exposes all tenants' data.

### V-15: Weak TLS Configuration

**Risk**: Medium | **CVSS**: 5.9
**Description**: Database accepting TLS 1.0/1.1, weak cipher suites, or not verifying
client certificates when required.

---

## 5. Security Checklist

### Network & Access

- [ ] Database ports not accessible from public internet
- [ ] Security groups restrict access to application subnets only
- [ ] VPN or bastion host required for administrative access
- [ ] Private subnets with no public IP for database instances
- [ ] DNS resolution for database endpoints uses private DNS

### Authentication & Authorization

- [ ] No default or empty passwords on any database account
- [ ] Each application/service has its own dedicated database account
- [ ] Superuser/root accounts disabled or restricted to local access only
- [ ] Password hashing uses SCRAM-SHA-256 (PostgreSQL) or caching_sha2_password (MySQL)
- [ ] Application accounts have SELECT/INSERT/UPDATE/DELETE only on required tables
- [ ] DDL privileges (CREATE/ALTER/DROP) restricted to migration/admin accounts
- [ ] Connection limits set per user role
- [ ] Account expiration dates set for temporary/contractor access
- [ ] Regular access reviews performed (quarterly minimum)
- [ ] Service accounts cannot perform interactive login

### Encryption

- [ ] TLS 1.2+ required for all connections (reject plaintext)
- [ ] Server certificates verified by clients (sslmode=verify-full)
- [ ] Data encrypted at rest (TDE, filesystem encryption, or cloud KMS)
- [ ] Backup files encrypted with AES-256
- [ ] WAL/binlog encryption enabled
- [ ] Encryption keys rotated on defined schedule

### Monitoring & Logging

- [ ] Authentication attempts logged (success and failure)
- [ ] DDL operations logged
- [ ] Privilege changes logged (GRANT/REVOKE)
- [ ] Sensitive table access logged (pgAudit or equivalent)
- [ ] Logs shipped to centralized SIEM
- [ ] Alerting configured for suspicious patterns (brute force, bulk exports)
- [ ] Log retention meets compliance requirements (90+ days)

### Backup & Recovery

- [ ] Automated backups configured and tested
- [ ] Backup restoration tested at least quarterly
- [ ] Backup files encrypted and stored in separate security zone
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Backup credentials differ from application credentials

---

## 6. Tools & Automation

### 6.1 pgAudit (PostgreSQL)

pgAudit provides detailed session and object audit logging via PostgreSQL's standard
logging facility. It goes beyond standard logging by capturing the details of what
happened while the database was satisfying a request, not just what was requested.

```sql
-- Install pgAudit
CREATE EXTENSION pgaudit;

-- Configure in postgresql.conf
-- pgaudit.log = 'write, ddl, role'
-- pgaudit.log_catalog = off
-- pgaudit.log_relation = on

-- Object-level auditing for sensitive tables
ALTER TABLE financial_records SET (pgaudit.log = 'read, write');
```

Key capabilities:
- Session-level logging (all statements by specific users).
- Object-level logging (all access to specific tables).
- Compliance-ready output format for PCI-DSS, SOC2, HIPAA.
- Integrates with PostgreSQL 14-18.
- Source: https://www.pgaudit.org/

### 6.2 MongoDB Audit Log

```yaml
# mongod.conf audit configuration
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{
    atype: {
      $in: [
        "authenticate", "createUser", "dropUser",
        "grantRolesToUser", "revokeRolesFromUser",
        "createCollection", "dropCollection",
        "createDatabase", "dropDatabase"
      ]
    }
  }'
```

MongoDB Enterprise and Atlas provide built-in audit logging for authentication events,
CRUD operations, and schema changes. For Community Edition, use mongoaudit
(https://github.com/stampery/mongoaudit) for security scanning.

### 6.3 Database Vulnerability Scanners

| Tool | Database | Type | Key Features |
|------|----------|------|-------------|
| **pgaudit_analyze** | PostgreSQL | Audit analysis | Parse and analyze pgAudit logs |
| **mongoaudit** | MongoDB | Security scanner | Configuration audit, vulnerability detection |
| **mysqltuner** | MySQL | Security + perf | Privilege analysis, security recommendations |
| **redis-check** | Redis | Security audit | Auth check, exposure analysis |
| **Qualys** | All | Commercial | Compliance scanning, vulnerability assessment |
| **DbProtect** | All | Commercial | Real-time monitoring, access control |
| **DataSunrise** | All | Commercial | Activity monitoring, data masking, firewall |

### 6.4 Connection Security Testing

```bash
# Test PostgreSQL TLS configuration
openssl s_client -connect db.example.com:5432 -starttls postgres

# Verify minimum TLS version
psql "sslmode=verify-full sslrootcert=/etc/ssl/ca.crt host=db.example.com" \
  -c "SHOW ssl_min_protocol_version;"

# Test MongoDB TLS
openssl s_client -connect db.example.com:27017

# Check Redis authentication
redis-cli -h db.example.com --tls --cert /etc/ssl/client.crt \
  --key /etc/ssl/client.key --cacert /etc/ssl/ca.crt ping

# Scan for exposed database ports (internal audit only)
nmap -sV -p 5432,3306,27017,6379,9200,9300 target_subnet/24
```

### 6.5 Automated Security Monitoring

```yaml
# Prometheus alerting rules for database security
groups:
  - name: database_security
    rules:
      - alert: DatabaseAuthFailureSpike
        expr: rate(pg_stat_activity_count{state="authentication_failure"}[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Possible brute-force attack on database"

      - alert: DatabaseConnectionFromUnknownIP
        expr: pg_stat_activity_client_addr != "10.0.1.0/24"
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Database connection from unexpected network"

      - alert: HighVolumeDataRead
        expr: rate(pg_stat_user_tables_seq_tup_read[5m]) > 100000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Abnormally high sequential scan volume - possible exfiltration"
```

---

## 7. Platform-Specific Guidance

### 7.1 PostgreSQL

**Authentication**: Use SCRAM-SHA-256 exclusively. Never use `trust` or `md5`.
Configure pg_hba.conf with explicit entries per database/user/network.

**Row-Level Security**: Essential for multi-tenant applications. Always use
`FORCE ROW LEVEL SECURITY` to apply policies even to table owners.

**Extensions security**: Audit all installed extensions. Restrict `CREATE EXTENSION`
to superusers. Disable untrusted language handlers (PL/Python, PL/Perl) unless required.

**COPY command**: Restrict server-side COPY TO/FROM to superuser. Application users
should use `\copy` (client-side) instead.

### 7.2 MongoDB

**Authentication**: Always enable `authorization: enabled`. Use SCRAM-SHA-256.
Consider X.509 certificate authentication for service-to-service communication.

**Network binding**: Set `bindIp` to specific internal IPs. The default `bindIpAll`
is dangerous in any non-development environment.

**JavaScript**: Disable with `javascriptEnabled: false` unless your application
requires server-side JavaScript execution (rare).

**Field-Level Encryption**: MongoDB 4.2+ supports Client-Side Field Level Encryption
(CSFLE) for encrypting sensitive fields before they reach the server. Use this for
PII, payment data, and health records.

**MongoBleed mitigation (CVE-2025-14847)**: Upgrade to patched versions immediately.
Block public access to port 27017. Disable network compression if not required.

### 7.3 MySQL

**Authentication plugins**: Use `caching_sha2_password` (default in MySQL 8.0+).
Enable `component_validate_password` for password policy enforcement.

**Secure installation**: Always run `mysql_secure_installation` which removes
anonymous accounts, disables remote root login, removes test database.

**Binary log encryption**: Enable `binlog_encryption = ON` to encrypt binary logs.
Enable `innodb_redo_log_encrypt = ON` and `innodb_undo_log_encrypt = ON`.

**LOAD DATA LOCAL**: Disable with `local_infile = 0` to prevent client-initiated
file reads from the server filesystem.

```ini
# my.cnf security settings
[mysqld]
# Authentication
default_authentication_plugin = caching_sha2_password
password_history = 5
password_reuse_interval = 365

# Encryption
require_secure_transport = ON
ssl_ca = /etc/mysql/ssl/ca.pem
ssl_cert = /etc/mysql/ssl/server-cert.pem
ssl_key = /etc/mysql/ssl/server-key.pem
tls_version = TLSv1.2,TLSv1.3

# Hardening
local_infile = 0
symbolic_links = 0
log_raw = OFF
binlog_encryption = ON
```

### 7.4 Redis

Redis was designed for use within trusted networks and historically had minimal
security features. Modern Redis (6.0+) includes ACLs, but hardening is still critical.

**ACL system (Redis 6+):**

```redis
# Define application user with restricted commands and key patterns
ACL SETUSER app_user on >strong_password ~app:* ~session:* +get +set +del +expire +ttl -@admin -@dangerous

# Define monitoring user
ACL SETUSER monitor on >monitor_password +info +ping +client|list -@all

# Disable default user
ACL SETUSER default off
```

**Configuration hardening:**

```conf
# redis.conf security settings
bind 10.0.1.10                  # Bind to specific internal IP
protected-mode yes              # Reject external connections
requirepass "strong-password"   # Set authentication password (pre-ACL fallback)

# Disable dangerous commands
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""

# TLS
tls-port 6380
port 0                          # Disable non-TLS port
tls-cert-file /etc/ssl/redis.crt
tls-key-file /etc/ssl/redis.key
tls-ca-cert-file /etc/ssl/ca.crt
tls-auth-clients yes            # Require client certificates
```

**P2PInfect botnet (2024)**: Targeted internet-exposed Redis instances, installed
Monero cryptominers and ransomware modules. Underscores the critical need to never
expose Redis to the internet.

### 7.5 Cloud-Managed Databases

**AWS RDS / Aurora:**
- Enable encryption at rest (KMS). Cannot be enabled after creation.
- Use IAM database authentication where possible.
- Enable Performance Insights and Enhanced Monitoring.
- Configure automated backups with encryption.
- Use Security Groups, not IP-based rules.
- Store credentials in AWS Secrets Manager with automatic rotation.
- Enable Multi-AZ for high availability.
- Enable audit logging (pgAudit for PostgreSQL, general/slow query logs for MySQL).

**Google Cloud SQL:**
- Enable require_ssl flag for all instances.
- Use Cloud SQL Auth Proxy instead of direct IP connections.
- Enable automatic storage encryption (default with Google-managed keys,
  or use CMEK for customer control).
- Configure authorized networks carefully -- prefer private IP.
- Use IAM conditions for fine-grained access.

**MongoDB Atlas:**
- Enable IP Access List (whitelist) -- never use 0.0.0.0/0.
- Enable database auditing in cluster configuration.
- Use VPC/VNet Peering for private connectivity.
- Enable encryption at rest with customer-managed keys.
- Configure LDAP or X.509 authentication.
- Enable Advanced Threat Protection alerts.
- Use Atlas Data Lake for analytics to avoid querying production.

---

## 8. Incident Patterns

### 8.1 Database Breach Detection

**Indicators of Compromise (IoCs):**

- Spike in authentication failures from unfamiliar IP addresses.
- Abnormally high sequential scan volume or data read rates.
- Bulk SELECT or COPY/DUMP operations outside normal business hours.
- New database users or roles created without change tickets.
- Privilege escalation events (GRANT/REVOKE operations).
- Queries accessing tables not normally used by the connected application.
- Database connections from unexpected networks or geographies.
- Service accounts used for interactive login.
- Large outbound data transfers from database server.

### 8.2 Data Exfiltration Indicators

According to Unit 42's 2025 Incident Response Report, the median time to exfiltration
is now just two days from initial compromise, with nearly one in five cases seeing data
stolen within the first hour.

**Detection methods:**

- Monitor query result sizes -- flag queries returning >10,000 rows.
- Track connection duration -- long-lived sessions may indicate data staging.
- Alert on COPY TO, pg_dump, mysqldump, mongodump from non-backup users.
- Monitor outbound network traffic volume from database servers.
- Use Data Loss Prevention (DLP) tools on database egress points.
- Compare query patterns against baseline using anomaly detection.

### 8.3 Incident Response Playbook

1. **Contain**: Immediately revoke compromised credentials. Block suspicious IPs
   at firewall level. Do not shut down the database (preserve evidence).
2. **Preserve**: Capture database logs, connection logs, query history.
   Snapshot the database for forensic analysis.
3. **Assess**: Determine scope -- which tables were accessed, what data was read,
   what was modified. Check for backdoor accounts or triggers.
4. **Eradicate**: Remove unauthorized accounts, backdoors, and malicious triggers
   or stored procedures. Rotate all credentials.
5. **Recover**: Restore from known-good backup if data integrity is compromised.
   Rebuild from clean state if backdoors are suspected.
6. **Report**: Notify affected parties per regulatory requirements (GDPR: 72 hours,
   PCI-DSS: immediately to card brands, state breach notification laws).

---

## 9. Compliance & Standards

### 9.1 PCI-DSS Requirements

**Requirement 2 -- Secure System Configuration:**
- Change all vendor-supplied default passwords before deployment.
- Disable unnecessary services, protocols, and ports.
- Configure system security parameters to prevent misuse.
- Remove all unnecessary default accounts.

**Requirement 3 -- Protect Stored Cardholder Data:**
- Keep cardholder data storage to a minimum with data retention policies.
- Do not store sensitive authentication data after authorization.
- Mask PAN when displayed (show first six and last four digits maximum).
- Render PAN unreadable anywhere it is stored (encryption, hashing, truncation).
- Protect encryption keys against disclosure and misuse.

**Requirement 8 -- Identify and Authenticate Access:**
- Assign unique IDs to each person with computer access.
- Implement multi-factor authentication for remote access.
- Encrypt all passwords during transmission and storage.
- Remove/disable inactive user accounts within 90 days.

**Requirement 10 -- Log and Monitor Access:**
- Implement audit trails for all access to system components.
- Record user identification, event type, date/time, success/failure.
- Review logs daily using automated tools.
- Retain audit trail history for at least one year, with three months immediately available.

### 9.2 SOC2 Database Controls

**Security (Common Criteria):**
- CC6.1: Logical access security over information assets (database access controls).
- CC6.3: Role-based access, least privilege, segregation of duties.
- CC6.6: Restrictions on software installation (database extensions).
- CC7.2: Monitor system components for anomalies (database activity monitoring).

**Availability:**
- A1.2: Environmental protections (high availability, failover).
- Backup and recovery procedures tested regularly.

**Confidentiality:**
- C1.1: Identify and protect confidential information (encryption at rest).
- C1.2: Dispose of confidential information when no longer needed.

### 9.3 GDPR Data Storage Requirements

- **Data minimization** (Article 5(1)(c)): Only store personal data that is necessary.
- **Storage limitation** (Article 5(1)(e)): Define retention periods, delete data when
  no longer needed.
- **Integrity and confidentiality** (Article 5(1)(f)): Encryption at rest and in transit,
  access controls, protection against unauthorized processing.
- **Right to erasure** (Article 17): Implement the ability to delete individual records
  on request. This includes backups -- consider backup rotation cycles.
- **Data breach notification** (Articles 33-34): Report breaches to supervisory authority
  within 72 hours. Notify affected individuals without undue delay if high risk.
- **Data Protection Impact Assessment** (Article 35): Required for high-risk processing
  (large-scale processing of sensitive data).

**PostgreSQL GDPR implementation patterns:**

```sql
-- Data retention: automatic cleanup of expired records
CREATE OR REPLACE FUNCTION enforce_retention() RETURNS void AS $$
BEGIN
  DELETE FROM user_activity_logs WHERE created_at < NOW() - INTERVAL '2 years';
  DELETE FROM session_data WHERE expires_at < NOW();
  RAISE NOTICE 'Retention policy enforced at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Right to erasure: anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user(target_user_id INT) RETURNS void AS $$
BEGIN
  UPDATE users SET
    email = 'redacted-' || target_user_id || '@deleted.local',
    name = 'REDACTED',
    phone = NULL,
    address = NULL,
    anonymized_at = NOW()
  WHERE id = target_user_id;

  DELETE FROM user_sessions WHERE user_id = target_user_id;
  DELETE FROM user_tokens WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 10. Code Examples

### 10.1 Secure Connection Configuration -- TypeScript/Knex

```typescript
// VULNERABLE: No SSL, credentials hardcoded
const db = require('knex')({
  client: 'pg',
  connection: {
    host: 'db.example.com',
    user: 'root',                    // superuser!
    password: 'password123',          // hardcoded!
    database: 'production',
    ssl: false,                       // plaintext!
  },
});

// SECURE: SSL verified, credentials from secrets manager, least privilege
import knex from 'knex';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import fs from 'fs';

async function createSecureDb(): Promise<knex.Knex> {
  const sm = new SecretsManager({ region: 'us-east-1' });
  const secret = await sm.getSecretValue({ SecretId: 'prod/db/app-credentials' });
  const creds = JSON.parse(secret.SecretString!);

  return knex({
    client: 'pg',
    connection: {
      host: creds.host,
      port: creds.port,
      user: creds.username,            // least-privilege app user
      password: creds.password,         // from secrets manager
      database: creds.dbname,
      ssl: {
        rejectUnauthorized: true,       // verify server certificate
        ca: fs.readFileSync('/etc/ssl/certs/rds-ca-bundle.pem').toString(),
      },
    },
    pool: { min: 2, max: 10 },
    acquireConnectionTimeout: 10000,
  });
}
```

### 10.2 Secure Connection Configuration -- Python/SQLAlchemy

```python
# VULNERABLE: No SSL, credentials in code, superuser
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://postgres:admin@db.example.com:5432/production"
)

# SECURE: SSL verified, credentials from secrets manager, connection limits
import json
import ssl
import boto3
from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool

def get_db_credentials():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    secret = client.get_secret_value(SecretId='prod/db/app-credentials')
    return json.loads(secret['SecretString'])

def create_secure_engine():
    creds = get_db_credentials()

    ssl_context = ssl.create_default_context(
        cafile='/etc/ssl/certs/rds-ca-bundle.pem'
    )
    ssl_context.check_hostname = True
    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2

    engine = create_engine(
        f"postgresql://{creds['username']}:{creds['password']}"
        f"@{creds['host']}:{creds['port']}/{creds['dbname']}",
        connect_args={'ssl_context': ssl_context},
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,          # recycle connections every 30 min
        pool_pre_ping=True,          # validate connections before use
    )

    # Log slow queries for monitoring
    @event.listens_for(engine, "before_cursor_execute")
    def log_query_start(conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault('query_start_time', []).append(time.time())

    return engine
```

### 10.3 SQL Injection Prevention at Database Level

```sql
-- VULNERABLE: Dynamic SQL with concatenation in stored procedure
CREATE OR REPLACE FUNCTION get_user_orders(user_email TEXT)
RETURNS TABLE(order_id INT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT id, total FROM orders WHERE email = ''' || user_email || '''';
END;
$$ LANGUAGE plpgsql;
-- Attack: get_user_orders($$'; DROP TABLE orders; --$$)

-- SECURE: Parameterized dynamic SQL
CREATE OR REPLACE FUNCTION get_user_orders(user_email TEXT)
RETURNS TABLE(order_id INT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT id, total FROM orders WHERE email = $1'
    USING user_email;
END;
$$ LANGUAGE plpgsql;
```

### 10.4 Row-Level Security for Multi-Tenant Applications

```sql
-- Create tenant isolation with RLS
CREATE TABLE tenant_data (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable and force RLS
ALTER TABLE tenant_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_data FORCE ROW LEVEL SECURITY;

-- Isolation policy: each tenant sees only their data
CREATE POLICY tenant_isolation ON tenant_data
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::INT)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::INT);

-- Application sets tenant context per request
-- SET LOCAL ensures it is transaction-scoped
BEGIN;
  SELECT set_config('app.tenant_id', '42', true);  -- true = local to transaction
  SELECT * FROM tenant_data;  -- only sees tenant 42's data
COMMIT;
```

### 10.5 Complete Least-Privilege Role Hierarchy

```sql
-- Base roles (no login capability)
CREATE ROLE app_readonly NOLOGIN;
CREATE ROLE app_readwrite NOLOGIN;
CREATE ROLE app_admin NOLOGIN;

-- Schema permissions
GRANT USAGE ON SCHEMA public TO app_readonly, app_readwrite, app_admin;

-- Read-only: SELECT on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;

-- Read-write: SELECT, INSERT, UPDATE, DELETE (no DDL)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;

-- Admin: adds DDL capabilities
GRANT app_readwrite TO app_admin;
GRANT CREATE ON SCHEMA public TO app_admin;

-- Login users inherit from base roles
CREATE USER api_service WITH LOGIN PASSWORD 'from-secrets-manager'
  CONNECTION LIMIT 20 IN ROLE app_readwrite;

CREATE USER analyst WITH LOGIN PASSWORD 'from-secrets-manager'
  CONNECTION LIMIT 5 IN ROLE app_readonly;

CREATE USER migrator WITH LOGIN PASSWORD 'from-secrets-manager'
  CONNECTION LIMIT 2 IN ROLE app_admin
  VALID UNTIL '2025-06-30';  -- temporary elevated access
```

---

## References

- OWASP Database Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html
- OWASP SQL Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- pgAudit -- PostgreSQL Audit Extension: https://www.pgaudit.org/
- MongoDB Security Checklist: https://www.mongodb.com/docs/manual/administration/security-checklist/
- Redis Security Documentation: https://redis.io/docs/management/security/
- CIS Benchmarks for PostgreSQL, MySQL, MongoDB: https://www.cisecurity.org/cis-benchmarks
- AWS RDS Security Best Practices: https://aws.amazon.com/blogs/database/overview-of-security-best-practices-for-amazon-rds-for-postgresql-and-amazon-aurora-postgresql-compatible-edition/
- Microsoft 250M Record Breach (Comparitech): https://www.comparitech.com/blog/information-security/microsoft-customer-service-data-leak/
- Shanghai Police Breach (The Register): https://www.theregister.com/2022/07/05/shanghai_police_database_for_sell/
- MongoBleed CVE-2025-14847 (Arctic Wolf): https://arcticwolf.com/resources/blog/cve-2025-14847/
- Redis CVE-2025-49844 (Wiz): https://www.wiz.io/blog/wiz-research-redis-rce-cve-2025-49844
- Verizon 2025 Data Breach Investigations Report: https://www.verizon.com/business/resources/reports/dbir/
