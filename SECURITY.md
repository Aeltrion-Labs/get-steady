# Security Policy

## Supported Versions

Get Steady is early-stage software. Security fixes are only guaranteed on the latest code in
the default branch.

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities.

If GitHub private vulnerability reporting is enabled for this repository, use that channel.
Otherwise, contact the repository owner directly through GitHub before sharing details
publicly.

When reporting, include:

- affected version or commit
- impact summary
- reproduction steps
- any proof-of-concept details needed to validate the issue

## Security Posture Notes

- The desktop app is local-first and does not require an account.
- Data is stored locally on disk in SQLite.
- Desktop signing, notarization, and auto-update infrastructure are not part of this
  repository's current public-launch baseline.
