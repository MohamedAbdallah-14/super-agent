# Directory Purpose

The `infrastructure` security directory focuses on hardening the environments where applications run, including networks, cloud providers, and containers.

# Key Concepts

- Network isolation and firewalls
- Container and orchestrator hardening
- Detecting and responding to breaches

# File Map

- `cloud-security-aws.md` — IAM policies, VPCs, and Security Groups
- `cloud-security-gcp.md` — GCP IAM, VPC Service Controls
- `container-security.md` — rootless containers, image scanning, and Docker hardening
- `incident-response.md` — playbooks, communication, and post-mortems
- `logging-and-monitoring.md` — SIEM, audit trails, and anomaly detection
- `network-security.md` — TLS, VPNs, WAF, and DDoS protection

# Reading Guide

If writing a Dockerfile → read `container-security.md`
If setting up a cloud environment → read `cloud-security-aws.md` or `cloud-security-gcp.md`
If designing system observability → read `logging-and-monitoring.md`