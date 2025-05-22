# Privacy Policy for TrustyNotes

Last updated: 05/22/2024

## Overview

TrustyNotes is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our note-taking application.

## Information Collection and Use

### Notes and Content
- All notes and content you create are encrypted end-to-end using AES-GCM (Advanced Encryption Standard with Galois/Counter Mode)
- Encryption keys are derived from your sync code, which is never transmitted to our servers
- Notes are stored locally in your browser and optionally synchronized with our servers in encrypted form
- We cannot access, read, or decrypt your notes as we don't have access to your encryption keys

### Encryption Technology
- We implement quantum-resistant cryptographic methods
- For key exchange, we use ML-KEM (Module-Lattice Key Encapsulation Mechanism)
- ML-KEM securely generates and encapsulates a shared secret key, which is then used to derive an AES key
- Data encryption is performed using AES-GCM for authenticated encryption
- This hybrid approach combines quantum-resistance with high-performance encryption

### Technical Data We Collect
- Basic usage analytics through Plausible Analytics (privacy-focused analytics)
- Sync timestamps and note metadata (without content) for synchronization purposes
- Error logs (without personal information) for troubleshooting

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
- We implement regular security audits and updates

## Data Sharing
We do not share your data with third parties. Your encrypted notes are only:
- Stored locally on your devices
- Transmitted to our servers for sync purposes (if enabled)
- Accessible only with your sync code

## Your Rights
You have the right to:
- Export your notes at any time
- Delete your notes locally and from our servers
- Choose whether to enable synchronization
- Control which servers you sync with
- Generate new sync codes

## Data Retention
- Deleted notes are permanently removed from the server immediately upon sync
- You can manually purge deleted notes from your local storage at any time
- All user data on the server (including encrypted notes) is automatically deleted after 180 days of inactivity (no syncing)
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