# Trusty Notes

A secure cross-platform note-taking application designed for self-hosting. Features end-to-end encryption for cloud sync and a modern React frontend.

* As of now (v1.0.0) the public instance of trustynotes has been shutdown and moved to a selfhost only project

Windows/Linux/Android Builds: https://github.com/toolworks-dev/trusty-notes/releases

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

## Self-Hosting Setup

### Quick Start
1. **Configure Sync Server**: Edit `src/config/sync.ts` to set your sync server URL
2. **Start Server**: Follow the server setup instructions below  
3. **Build Frontend**: Run `bun run build` to create production files
4. **Deploy**: Serve the `dist/` folder or use Docker

See `SELF_HOSTING.md` for detailed configuration instructions.

### Frontend Build
```bash
# Install dependencies and build
bun install
bun run build

# Or use Docker
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
bun run dist:mac // for mac
bun run dist:all // for all
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

