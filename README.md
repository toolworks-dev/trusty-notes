# Rusty Notes

A secure, (WIP) cross-platform note-taking application built with Rust. Features end-to-end encryption for cloud sync and a modern React frontend.

![image](https://github.com/user-attachments/assets/ee3dc121-5413-44f6-b242-7b816b540fb2)


## Features

- 📝 Markdown editor with live preview
- 🔄 Secure cloud synchronization
- 🔐 End-to-end encryption
- 🌙 Dark/Light mode
- 💾 Automatic saving
- 🔍 Full-text search
- 📱 Cross-platform (Soon) (macOS, Linux, and Mobile are planned)
- 💾 Import/Export functionality
- 🔒 Seed phrase-based encryption
- 🖥️ System tray support

## To-Do
- [ ] Mobile support
- [ ] Improved Sync
- [ ] Rich Text
- [ ] Attachments/Files

## Installation

### Binary
1. Download the binary from the [releases page](https://github.com/0xgingi/rusty-notes/releases).
2. Run the binary.

### From Source

#### Prerequisites
- Rust (latest stable)
- Node.js
- npm

#### Build
1. Clone the repository
2. Run `npm install` to install the dependencies.
3. Run `npm run tuari build` to build the client.

## Server Self-Hosting

### Prerequisites
- Docker
- Docker Compose

### Setup
1. Clone the repository
2. Run `docker compose up --build` inside the server directory to build and start the server.

### Configuration
Add your ip:port or if reverse proxying, your domain in sync server settings



