# Security Policy

## Reporting a Vulnerability

Please do not open public GitHub issues for suspected vulnerabilities until maintainers have had a chance to assess them.

Send reports with:

- affected version or commit
- reproduction steps
- impact assessment
- any proposed mitigation

Report vulnerabilities to:

- `mohamedmabdallah14@gmail.com`

If GitHub private vulnerability reporting is enabled for this repository, you may use that path instead.

## Scope

Security-sensitive areas include:

- generated host packages
- hook wrappers and guard enforcement
- path handling
- export drift checks
- external adapter boundaries
- any code that reads or writes outside the repo
