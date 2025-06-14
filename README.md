# Trusty Notes

A secure cross-platform note-taking application. Features end-to-end encryption for cloud sync and a modern React frontend.

WebApp: https://trustynotes.app

Windows/Linux/Android Builds: https://github.com/toolworks-dev/trusty-notes/releases

iOS AltStore: https://raw.githubusercontent.com/toolworks-dev/trusty-notes/main/ios/altstore-source.json

Vim Mode documentation at: https://github.com/toolworks-dev/trusty-notes/blob/main/docs/vim.md

![image](https://github.com/user-attachments/assets/0d573b72-41af-4851-b90b-d2105bc50286)


## Features

- 📝 Markdown editor with live preview
- 🔄 Secure cloud synchronization 
- 🔐 End-to-end encryption + Post Quantum Encrpytion
- 🌙 Dark/Light mode
- 💾 Automatic saving
- 🔍 Full-text search
- 📱 Cross-platform
- 💾 Import/Export functionality
- 🔒 Seed phrase-based encryption

## To-Do
- [x] Improved Sync
- [x] Rich Text
- [ ] Browser Extension - No longer maintained
- [ ] Attachments/Files
- [x] Desktop Application
- [x] Mobile Application
- [x] Post Quantum Encrpytion

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


## Build Android Application

### Requires
- Bun (https://bun.sh)
- Android Studio Tools (https://developer.android.com/studio)
- OpenJDK 21+ (https://openjdk.org/)

### Build

```
bun install
bun run build:android
```

Build is in ```android/app/build/ouputs/apk/release```

