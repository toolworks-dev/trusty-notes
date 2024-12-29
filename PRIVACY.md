# Privacy Policy for TrustyNotes

Last updated: 12/19/2024s

## Overview

TrustyNotes is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our note-taking application.

## Information Collection and Use

### Notes and Content
- All notes and content you create are encrypted end-to-end using AES-GCM encryption
- Encryption keys are derived from your sync code, which is never transmitted to our servers
- Notes are stored locally in your browser and optionally synchronized with our servers in encrypted form
- We cannot access, read, or decrypt your notes as we don't have access to your encryption keys

### Technical Data We Collect
- Basic usage analytics through Plausible Analytics (privacy-focused analytics)
- Sync timestamps and note metadata (without content) for synchronization purposes
- Error logs (without personal information) for troubleshooting
- Browser extension status and version information

### Data Storage
- Notes are stored locally in your browser's storage
- If sync is enabled, encrypted notes are stored on our servers
- Your sync code is stored locally and optionally in the browser extension storage
- We use MongoDB for server-side storage of encrypted data

## Data Security
- All notes are encrypted using AES-GCM encryption before transmission
- Communication with our servers uses HTTPS encryption
- Notes are signed using ECDSA to verify authenticity
- Server access is restricted and monitored

## Data Sharing
We do not share your data with third parties. Your encrypted notes are only:
- Stored locally on your devices
- Transmitted to our servers for sync purposes (if enabled)
- Accessible only with your sync code

## Browser Extension
The TrustyNotes browser extension:
- Accesses only the trustynotes.app domain
- Stores encrypted notes locally
- Communicates with the web application for synchronization
- Requires explicit user permission for storage and tab access

## Your Rights
You have the right to:
- Export your notes at any time
- Delete your notes locally and from our servers
- Choose whether to enable synchronization
- Control which servers you sync with
- Generate new sync codes

## Data Retention
- Deleted notes are permanently removed after 24 hours
- You can manually purge deleted notes immediately
- Server logs are retained for 30 days
- You can delete all your notes at any time

## Changes to This Policy
We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.

## Contact Us
If you have any questions about this Privacy Policy, please contact us at:
- Email: 0xgingi@0xgingi.com
- GitHub: https://github.com/toolworks-dev/trusty-notes

## Open Source
TrustyNotes is open-source software. You can review our code and security implementations at:
https://github.com/toolworks-dev/trusty-notes