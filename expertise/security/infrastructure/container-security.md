# Container Security Expertise Module

> Security guidance for containerized deployments across Docker, Kubernetes, and managed
> container platforms. Covers image hardening, runtime protection, orchestration security,
> and compliance. For use by AI agents securing container workloads.

---

## 1. Threat Landscape

### 1.1 Container Escape Vulnerabilities

Container escapes let attackers break out onto the host OS, compromising all co-located workloads.

**CVE-2024-21626 ("Leaky Vessels")** -- File descriptor leak in runc (<=1.1.11) allowed attackers
to manipulate WORKDIR via a leaked fd referencing the host filesystem. CVSS 8.6. Fixed in runc
1.1.12, containerd 1.6.28/1.7.13, Docker 25.0.2 (January 2024). Source: nvd.nist.gov.

**CVE-2025-31133/52565/52881** -- Three runc vulnerabilities (November 2025) exploiting race
conditions in /dev/null masking and /dev/console bind mounts. Malicious images could replace
/dev/null with a symlink, gaining host filesystem read-write. Fixed in runc v1.2.8/v1.3.3.
Source: sysdig.com.

**CVE-2025-9074** -- Docker Desktop vulnerability (CVSS 9.3) letting containers reach the Docker
Engine API via default subnet even with Enhanced Container Isolation enabled. On Windows,
attackers could mount the entire host filesystem. Fixed in Docker Desktop 4.44.3. Source: socprime.com.

### 1.2 Supply Chain and Malicious Images

87% of container images in production contain high or critical vulnerabilities (Red Hat 2024).

- **Kong Ingress Controller (2025):** Trojanized image published to Docker Hub after supply chain
  breach, embedding a cryptominer in an image used by thousands of organizations.
- **SolarWinds (2020):** Trojanized updates injected into a trusted build pipeline affected 18,000
  organizations. The same pattern applies to container image CI/CD pipelines.

### 1.3 Secrets in Images

Docker layers are permanent. Secrets in any layer (even deleted later) remain accessible via
`docker history` or layer extraction. Common: API keys, DB credentials, TLS keys.

### 1.4 Kubernetes RBAC Misconfiguration

89% of organizations experienced at least one K8s security incident in 2024 (Red Hat). Overly
permissive RBAC lets attackers escalate from a compromised pod to cluster-admin.

### 1.5 Exposed Docker Sockets

Mounting `/var/run/docker.sock` grants full daemon control -- equivalent to host root. Attackers
launch privileged containers, mount host filesystem, install persistent backdoors.

### 1.6 Cryptojacking

**Tesla (2018):** Attackers found an unauthenticated Kubernetes Dashboard, deployed cryptominers
with evasion (unlisted pool behind CloudFlare, low CPU). Also found exposed AWS S3 credentials
with telemetry data. Discovered by RedLock. Source: electrek.co.

---

## 2. Core Security Principles

**Minimal base images:** Distroless or Alpine. Fewer packages = fewer CVEs, smaller attack surface.

**Non-root containers:** Root in container = UID 0 on host. Escape from root = host root access.
Always set USER in Dockerfile; enforce via SecurityContext.

**Immutable infrastructure:** Build once, deploy everywhere. Read-only root filesystems. State in
mounted volumes or external services.

**Image scanning in CI/CD:** Scan at build, before push, and continuously in production. Block
critical/high CVEs. Tools: Trivy, Snyk Container, Grype, Docker Scout.

**Network policies:** K8s pods communicate freely by default. Implement default-deny ingress/egress,
then explicitly allow required paths.

**Pod Security Standards (K8s 1.25+):**
- **Privileged:** No restrictions (system-level workloads only).
- **Baseline:** Prevents known privilege escalations. Prohibits hostNetwork/PID/IPC, privileged mode.
- **Restricted:** Full hardening. Non-root, drop all capabilities, seccomp, read-only rootfs.

**Secrets management:** Never in env vars, ConfigMaps, or layers. Use K8s Secrets (encrypted at
rest via KMS), HashiCorp Vault, CSI Secret Store Driver, or Sealed Secrets.

---

## 3. Implementation Patterns

### 3.1 Dockerfile Hardening

```dockerfile
# INSECURE
FROM ubuntu:latest
COPY . /app
ENV DB_PASSWORD=supersecret123
RUN apt-get update && apt-get install -y curl wget netcat
CMD ["python", "app.py"]

# SECURE - hardened multi-stage build
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM gcr.io/distroless/python3-debian12:nonroot
COPY --from=builder /install /usr/local
COPY --chown=nonroot:nonroot app/ /app/
WORKDIR /app
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["python", "app.py"]
```

### 3.2 Image Scanning with Trivy (CI)

```yaml
# .github/workflows/container-scan.yml
name: Container Security Scan
on:
  push:
    paths: ['Dockerfile', 'requirements.txt']
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Trivy vulnerability scan
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### 3.3 Kubernetes RBAC (Least Privilege)

```yaml
# INSECURE - cluster-admin to dev team
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dev-team-admin
subjects:
  - kind: Group
    name: dev-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io

# SECURE - namespace-scoped, minimal verbs, no secret access
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: app-production
  name: app-deployer
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-deployer-binding
  namespace: app-production
subjects:
  - kind: Group
    name: dev-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: app-deployer
  apiGroup: rbac.authorization.k8s.io
```

### 3.4 Network Policies

```yaml
# Default deny all in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: app-production
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
# Allow frontend -> backend:8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: app-production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
---
# Backend egress: database:5432 + DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress
  namespace: app-production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes: [Egress]
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - { protocol: TCP, port: 5432 }
    - ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }
```

### 3.5 Pod Security Context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: app-production
spec:
  replicas: 3
  selector:
    matchLabels: { app: secure-app }
  template:
    metadata:
      labels: { app: secure-app }
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: registry.example.com/app@sha256:abc123...
          ports: [{ containerPort: 8080 }]
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          resources:
            limits: { cpu: "500m", memory: "256Mi" }
            requests: { cpu: "100m", memory: "128Mi" }
          volumeMounts:
            - { name: tmp, mountPath: /tmp }
      volumes:
        - name: tmp
          emptyDir: { sizeLimit: 100Mi }
```

### 3.6 OPA/Gatekeeper Policy

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequirenonroot
spec:
  crd:
    spec:
      names:
        kind: K8sRequireNonRoot
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequirenonroot
        violation[{"msg": msg}] {
          c := input.review.object.spec.containers[_]
          not c.securityContext.runAsNonRoot
          msg := sprintf("Container '%v' must set runAsNonRoot=true", [c.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireNonRoot
metadata:
  name: require-non-root
spec:
  match:
    kinds: [{ apiGroups: [""], kinds: ["Pod"] }]
    namespaces: ["app-production", "app-staging"]
  enforcementAction: deny
```

### 3.7 Service Mesh mTLS (Istio)

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata: { name: default, namespace: istio-system }
spec:
  mtls: { mode: STRICT }
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata: { name: backend-authz, namespace: app-production }
spec:
  selector:
    matchLabels: { app: backend }
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/app-production/sa/frontend"]
      to:
        - operation: { methods: ["GET", "POST"], paths: ["/api/*"] }
```

---

## 4. Vulnerability Catalog

### V-01: Running as Root
**Risk:** Critical. UID 0 in container = UID 0 on host. Escape = full host compromise.
**Fix:** `USER nonroot` in Dockerfile + `runAsNonRoot: true` in SecurityContext.

### V-02: Docker Socket Mounted
**Risk:** Critical. Full daemon control = host root. **Fix:** Never mount socket. Use Kaniko
for in-cluster builds.

### V-03: Privileged Containers
**Risk:** Critical. Disables cgroups, seccomp, AppArmor, all capabilities.
**Fix:** `privileged: false`, `capabilities: { drop: ["ALL"] }`.

### V-04: Secrets in Env Vars / Layers
**Risk:** High. Visible in `docker inspect`, `kubectl describe`, process listings.
**Fix:** K8s Secrets with secretKeyRef, or CSI Secret Store Driver.

### V-05: `latest` Tag
**Risk:** High. Mutable, no reproducibility, no audit trail.
**Fix:** Pin by digest: `image: nginx@sha256:6926dd...`

### V-06: No Resource Limits
**Risk:** Medium. Enables DoS and unlimited cryptomining compute.
**Fix:** Set `resources.limits` for CPU and memory.

### V-07: Host PID/Network/IPC Sharing
**Risk:** High. Container can see host processes and bind host interfaces.
**Fix:** `hostPID/hostNetwork/hostIPC: false` (defaults).

### V-08: Writable Root Filesystem
**Risk:** Medium. Attackers write malware, modify binaries, plant backdoors.
**Fix:** `readOnlyRootFilesystem: true` + emptyDir for /tmp.

### V-09: Auto-mounted Service Account Tokens
**Risk:** High. Compromised pod queries K8s API with token.
**Fix:** `automountServiceAccountToken: false`.

### V-10: Missing Network Policies
**Risk:** High. Any pod can talk to any pod. Enables lateral movement.
**Fix:** Default-deny + explicit allow rules (Section 3.4).

### V-11: Unscanned / Outdated Base Images
**Risk:** High. 87% of images have high/critical CVEs.
**Fix:** Scan in CI, rebuild weekly, set max-age policies.

### V-12: allowPrivilegeEscalation=true
**Risk:** Medium. SUID binaries can gain root.
**Fix:** `allowPrivilegeEscalation: false`, `capabilities: { drop: ["ALL"] }`.

### V-13: No Seccomp Profile
**Risk:** Medium. Access to 300+ syscalls including ptrace, mount, unshare.
**Fix:** `seccompProfile: { type: RuntimeDefault }`.

### V-14: Exposed Kubernetes Dashboard
**Risk:** Critical. Unauthenticated dashboard = full cluster control (Tesla 2018 attack).
**Fix:** Never expose publicly. Require auth. Use `kubectl proxy` only.

### V-15: Default Namespace Usage
**Risk:** Medium. Lacks policies, collects misc workloads.
**Fix:** Dedicated namespaces with Pod Security Standards labels.

---

## 5. Security Checklist

### Build Phase
- [ ] Minimal base images (distroless, Alpine, scratch)
- [ ] Pin images by digest, never `latest`
- [ ] Multi-stage builds (exclude build tools from runtime)
- [ ] Non-root USER in Dockerfile
- [ ] No secrets in Dockerfile or layers
- [ ] Scan images in CI (fail on CRITICAL/HIGH)
- [ ] Lint Dockerfiles (hadolint, Trivy config)
- [ ] Sign images (cosign/Notation), verify at deploy
- [ ] Use `.dockerignore` to exclude sensitive files

### Deploy Phase
- [ ] `runAsNonRoot: true`
- [ ] `readOnlyRootFilesystem: true`
- [ ] `allowPrivilegeEscalation: false`
- [ ] Drop ALL capabilities, add only needed
- [ ] Resource limits (CPU, memory)
- [ ] Seccomp profile (RuntimeDefault or custom)
- [ ] `automountServiceAccountToken: false`
- [ ] Never `privileged: true`
- [ ] Never share host namespaces
- [ ] Never mount Docker socket

### Cluster Phase
- [ ] Pod Security Standards (restricted for prod)
- [ ] Default-deny network policies
- [ ] Least-privilege RBAC (namespace-scoped)
- [ ] Audit logging on API server
- [ ] etcd encryption at rest
- [ ] OPA/Gatekeeper or Kyverno for policy enforcement
- [ ] kube-bench CIS compliance checks

### Runtime Phase
- [ ] Falco for runtime threat detection
- [ ] Alert on unexpected processes (shells in containers)
- [ ] Alert on anomalous outbound connections
- [ ] Continuous vulnerability scanning
- [ ] Centralized log aggregation

---

## 6. Tools and Automation

### Image Scanning
| Tool | Type | Key Features |
|------|------|-------------|
| **Trivy** | OSS (Aqua) | Images, filesystems, IaC, secrets. SARIF/JSON. CI/CD native. |
| **Snyk Container** | Commercial+Free | Base image recommendations, IDE integration, registry monitoring. |
| **Grype** | OSS (Anchore) | Fast scanner. SBOM-based via Syft. |
| **Docker Scout** | Docker-native | Integrated into Docker Desktop/Hub. Policy-based analysis. |

### Runtime Security
| Tool | Type | Key Features |
|------|------|-------------|
| **Falco** | OSS (CNCF) | eBPF-based. Behavioral rules. Cryptojacking detection. |
| **Tetragon** | OSS (Cilium) | eBPF enforcement. Blocks threats at kernel level. |

### Configuration and Compliance
| Tool | Type | Key Features |
|------|------|-------------|
| **kube-bench** | OSS (Aqua) | CIS Kubernetes Benchmark checks. |
| **kubesec** | OSS | Security risk scoring for K8s manifests. |
| **Polaris** | OSS (Fairwinds) | Best practices validation. Dashboard + webhook. |
| **OPA/Gatekeeper** | OSS (CNCF) | Admission control. Rego-based policies. |
| **Kyverno** | OSS (CNCF) | K8s-native policies. YAML-based (no Rego). |

### Supply Chain
| Tool | Type | Key Features |
|------|------|-------------|
| **cosign** | OSS (Sigstore) | Image signing. Keyless via OIDC. |
| **Syft** | OSS (Anchore) | SBOM generation. CycloneDX/SPDX. |

### Trivy CLI Quick Reference
```bash
trivy image --severity CRITICAL,HIGH myapp:v1.2.3        # scan image
trivy image --exit-code 1 --severity CRITICAL myapp:v1    # fail CI on critical
trivy config --severity HIGH,CRITICAL ./k8s/              # scan K8s manifests
trivy k8s --report summary cluster                        # scan running cluster
trivy image --format cyclonedx --output sbom.json myapp   # generate SBOM
```

---

## 7. Platform-Specific Guidance

### Docker
- Enable Docker Content Trust: `export DOCKER_CONTENT_TRUST=1`
- User namespace remapping to prevent UID 0 = host root
- `--security-opt=no-new-privileges` on all containers
- Use BuildKit `--secret` for build-time secrets (not cached in layers)
- Never use `--net=host`, `--pid=host`, `--privileged` in production
- Run docker-bench-security for CIS compliance

### Kubernetes (Self-Managed)
- Pod Security Admission with `restricted` for production namespaces
- Encrypt etcd at rest (KMS provider)
- Audit logging with policies covering auth + secret access
- NetworkPolicy-compatible CNI (Calico, Cilium)
- Disable anonymous API server authentication
- Admission webhooks (Gatekeeper/Kyverno)

### Amazon EKS
- IAM Roles for Service Accounts (IRSA) or EKS Pod Identity
- Fargate profiles for strong isolation (dedicated micro-VM per pod)
- GuardDuty for EKS runtime threat detection
- ECR image scanning and envelope encryption for secrets via AWS KMS

### Google GKE
- GKE Autopilot for hardened, managed node configuration
- Binary Authorization for image signing enforcement
- Shielded GKE Nodes for verified boot
- Workload Identity for secure GCP service access

### AWS ECS/Fargate
- Fargate for task-level isolation (dedicated micro-VM per task)
- Secrets in AWS Secrets Manager, referenced in task definitions
- Task-level IAM roles (never EC2 instance role)

### Podman
- Rootless by default -- no daemon, no root needed
- No socket by default (eliminates Docker socket attack vector)
- Native user namespace, seccomp, SELinux support

---

## 8. Incident Patterns

### 8.1 Container Escape Detection
**IOCs:** Processes outside expected cgroup, unexpected mount operations, access to host
/proc/1 or /etc/shadow, unusual runc/containerd behavior, fd manipulation.

```yaml
# Falco rule
- rule: Container Escape via Host Mount
  condition: >
    container and
    (fd.name startswith /proc/1 or fd.name startswith /etc/shadow)
    and not trusted_container
  output: "Host filesystem access (container=%container.name file=%fd.name)"
  priority: CRITICAL
```

### 8.2 Cryptojacking Detection
**IOCs:** Sustained high CPU without load, outbound to ports 3333/4444/5555/8333, mining
binaries (xmrig, ccminer, minerd), stratum+tcp protocol, "hashrate"/"cryptonight" in args.

```yaml
# Falco rule
- rule: Detect Cryptomining
  condition: >
    spawned_process and container and
    (proc.name in (xmrig, ccminer, minerd) or
     proc.args contains "stratum+tcp" or
     proc.args contains "cryptonight")
  output: "Cryptomining detected (container=%container.name cmd=%proc.cmdline)"
  priority: CRITICAL
```

### 8.3 Compromised Image Detection
**IOCs:** Digest changes without CI/CD run, unexpected layers, images from unknown registries,
unexpected binaries (wget, curl, nc, nmap), processes not in entrypoint.

### 8.4 RBAC Abuse Detection
**IOCs:** Service accounts accessing out-of-scope resources, cross-namespace secret listing,
new ClusterRoleBindings, unusual API requests from pod IPs. Monitor K8s audit logs for
`verb:create resource:clusterrolebindings` from service accounts.

---

## 9. Compliance and Standards

### NIST SP 800-190: Application Container Security Guide
Five risk tiers: (1) Image risks -- vulnerabilities, malware, secrets; (2) Registry risks --
insecure connections, stale images; (3) Orchestrator risks -- unrestricted traffic, overprivileged
workloads; (4) Container risks -- runtime vulns, rogue processes; (5) Host OS risks -- large
attack surface, shared kernel. Key recommendation: use container-specific host OSs.

### CIS Docker Benchmark
100+ checks across: host config, daemon config, daemon files, images/build, container runtime,
security operations, Docker Swarm. Automate with docker-bench-security.

### CIS Kubernetes Benchmark
Covers: API server (auth, admission, audit), etcd (encryption, auth), kubelet (auth, kernel
defaults), policies (PSS, network policies, RBAC, secrets). Automate with kube-bench.

### SOC 2 Container Controls
| Criteria | Container Control |
|----------|------------------|
| CC6.1 (Logical Access) | RBAC, service accounts, image pull policies |
| CC7.1 (Config Mgmt) | IaC, GitOps, policy-as-code |
| CC7.2 (Change Mgmt) | Image signing, admission webhooks, audit logs |
| CC8.1 (Vuln Mgmt) | Image scanning in CI/CD, continuous monitoring |

---

## 10. Code Examples

### 10.1 Complete Secure Deployment

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-app
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secure-app-sa
  namespace: secure-app
automountServiceAccountToken: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: secure-app
spec:
  replicas: 3
  selector:
    matchLabels: { app: secure-app }
  template:
    metadata:
      labels: { app: secure-app }
    spec:
      serviceAccountName: secure-app-sa
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        runAsGroup: 65534
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: app
          image: registry.example.com/app@sha256:a1b2c3d4e5...
          ports: [{ containerPort: 8080 }]
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits: { cpu: "500m", memory: "256Mi" }
          livenessProbe:
            httpGet: { path: /healthz, port: 8080 }
          readinessProbe:
            httpGet: { path: /ready, port: 8080 }
          volumeMounts: [{ name: tmp, mountPath: /tmp }]
      volumes:
        - name: tmp
          emptyDir: { sizeLimit: 64Mi }
```

### 10.2 Security Gate Script

```bash
#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:?Usage: $0 <image:tag>}"

echo "=== Scanning: ${IMAGE} ==="
trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "${IMAGE}" || {
  echo "BLOCKED: high/critical vulnerabilities found"; exit 1; }
trivy image --exit-code 1 --scanners secret "${IMAGE}" || {
  echo "BLOCKED: embedded secrets found"; exit 1; }
trivy image --format cyclonedx --output "sbom.json" "${IMAGE}"
echo "PASSED: ${IMAGE} cleared security gate"
```

### 10.3 Kyverno: Require Image Digest

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-digest
      match:
        any: [{ resources: { kinds: ["Pod"] } }]
      validate:
        message: "Images must use digest (sha256), not tag."
        pattern:
          spec:
            containers: [{ image: "*@sha256:*" }]
            =(initContainers): [{ image: "*@sha256:*" }]
```

---

## References

- NIST SP 800-190 (https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- CIS Docker Benchmark (https://www.cisecurity.org/benchmark/docker)
- K8s Pod Security Standards (https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- CVE-2024-21626 Leaky Vessels (https://nvd.nist.gov/vuln/detail/cve-2024-21626)
- CVE-2025-31133 runc escape (https://www.sysdig.com/blog/runc-container-escape-vulnerabilities)
- CVE-2025-9074 Docker Desktop (https://socprime.com/blog/cve-2025-9074-docker-desktop-vulnerability/)
- Tesla K8s cryptojacking (https://electrek.co/2018/02/20/tesla-cloud-hijacked-hackers-mine-cryptocurrencies/)
- OWASP Docker Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- Red Hat K8s Security Report 2024 (https://www.redhat.com/en/resources/state-kubernetes-security-report)
- Falco cryptomining detection (https://falco.org/blog/falco-detect-cryptomining/)
- OPA Gatekeeper (https://github.com/open-policy-agent/gatekeeper)
