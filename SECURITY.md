# Security Policy

## Supported versions

This repository is a starter project and does not currently publish supported production releases. Security fixes are handled on the default `main` branch.

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in public issues. Use GitHub's **Report a vulnerability** option in the repository's Security tab to submit a private report. Include affected files/versions, impact, and safe reproduction details. If private vulnerability reporting is unavailable, contact the repository owner privately through GitHub.

Please allow the maintainer reasonable time to investigate and coordinate a fix before public disclosure. Do not include real credentials, personal data, or sensitive location information in a report.

## Credential and location-data handling

- Never commit Mapbox access/download tokens, PostHog keys intended to be private, `.env` files, or other credentials. Use the ignored local configuration files and platform secret stores.
- Restrict public Mapbox tokens to the intended origins and scopes; rotate credentials if exposure is suspected.
- Avoid logging precise user location or sensitive provider data. Review privacy and consent requirements before enabling analytics or deploying event feeds.
