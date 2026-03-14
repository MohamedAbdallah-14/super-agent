# Directory Purpose

The `infrastructure` directory covers the deployment, hosting, and operational lifecycle of applications, including cloud providers, databases, and CI/CD.

# Key Concepts

- Infrastructure as Code (IaC)
- Cloud provider architectures and managed services
- Automating testing and deployment
- Database provisioning and tuning

# File Map

- `index.md` — semantic map of the infrastructure directory
- `cloud-aws.md` — EC2, S3, RDS, IAM, and AWS well-architected framework
- `cloud-gcp.md` — Cloud Run, GKE, Spanner, and Google Cloud design
- `cybersecurity.md` — securing infrastructure perimeters and zero-trust
- `database-mongodb.md` — replica sets, sharding, and NoSQL operations
- `database-postgres.md` — connection pooling, vacuums, and relational tuning
- `devops-cicd.md` — GitHub Actions, GitLab CI, artifact management, and pipelines

# Reading Guide

If configuring a deployment pipeline → read `devops-cicd.md`
If deploying to AWS → read `cloud-aws.md`
If provisioning a database → read `database-postgres.md` or `database-mongodb.md`
If securing infrastructure perimeters → read `cybersecurity.md`