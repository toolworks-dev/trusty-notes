# Trusty Notes

A secure cross-platform note-taking application. Features end-to-end encryption for cloud sync and a modern React frontend.

WebApp: https://trustynotes.app

Windows/Linux/Android Builds: https://github.com/toolworks-dev/trusty-notes/releases

<p align="center">
<a href="https://addons.mozilla.org/en-US/firefox/addon/trustynotes/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png"></a>
<a href="https://chromewebstore.google.com/detail/trustynotes/jbofhocadlfnlhgjkcnbldobinlfghei"><img src="https://user-images.githubusercontent.com/585534/107280622-91a8ea80-6a26-11eb-8d07-77c548b28665.png"></a><br><br>
</p>

![image](https://github.com/user-attachments/assets/f63a297a-3122-47c4-a57b-9042f3461c80)

## Features

- 📝 Markdown editor with live preview
- 🔄 Secure cloud synchronization
- 🔐 End-to-end encryption
- 🌙 Dark/Light mode
- 💾 Automatic saving
- 🔍 Full-text search
- 📱 Cross-platform
- 💾 Import/Export functionality
- 🔒 Seed phrase-based encryption

## To-Do
- [x] Improved Sync
- [x] Rich Text
- [x] Browser Extension
- [ ] Attachments/Files
- [x] Desktop Application
- [x] Mobile Application

## Client Self-Hosting

### Prerequisites
- Docker
- Docker Compose

### Setup & Run
```
git clone https://github.com/toolworks-dev/trusty-notes
cd trusty-notes
docker compose up --build -d
```

## Server Self-Hosting

### Prerequisites
- Docker
- Docker Compose

### Setup
```
git clone https://github.com/toolworks-dev/trusty-notes
cd trusty-notes/server
```

### Database
```
vim .env

MONGO_USERNAME=
MONGO_PASSWORD=
```

### Run
```
docker compose up --build -d
```

## Build Browser Extension

### Requires
- Bun (https://bun.sh)

### Build

```
bun install
./build-extension.sh
```

This Builds the Chrome and Firefox extensions and places them in the `browser-extension/web-ext-artifacts` directory. You can install the extension directly from the .zip in firefox, you must extract the .zip for chrome/chromium browsers and load the unpacked folder.

## Build Desktop Application

### Requires
- Bun (https://bun.sh)

### Build

```
bun install
cd desktop
bun install
cd ..
bun run dist:linux // for linux
bun run dist:windows // for windows
bun run dist:all // for both
```

Builds are in ```desktop/dist-electron```
