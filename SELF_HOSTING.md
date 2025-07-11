# Self-Hosting Configuration Guide

This guide explains how to configure TrustyNotes for self-hosting

## Quick Start

1. **Configure Default Sync Server**: Edit `src/config/sync.ts` to set your default sync server
2. **Start Your Sync Server**: Use the provided server in the `server/` directory
3. **Build and Deploy**: Build the frontend and deploy to your chosen platform

## Configuration

### Frontend Configuration

Edit `src/config/sync.ts` to configure your default sync servers:

```typescript
export const DEFAULT_SYNC_SERVERS: SyncServerConfig[] = [
  {
    label: 'My Self-Hosted Server',
    value: 'https://sync.mydomain.com',
    isDefault: true
  },
  {
    label: 'Local Development',
    value: 'http://localhost:3222',
    isDefault: false
  },
];
```

### Server Setup

1. Navigate to the `server/` directory
2. Create a `.env` file with your MongoDB credentials:
   ```
   MONGO_USERNAME=your_username
   MONGO_PASSWORD=your_password
   ```
3. Start the server:
   ```bash
   docker compose up --build -d
   ```

### Android
Update `android/app/build.gradle` if you want to change the default server for Android builds:
```gradle
resValue "string", "server_url", "https://your-sync-server.com"
```