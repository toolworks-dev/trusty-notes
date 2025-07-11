/**
 * Sync configuration for TrustyNotes
 * Configure default sync servers here for self-hosting
 */

export interface SyncServerConfig {
  label: string;
  value: string;
  isDefault?: boolean;
}

/**
 * Default sync servers configuration
 * Modify these values for your self-hosted setup
 */
export const DEFAULT_SYNC_SERVERS: SyncServerConfig[] = [
  {
    label: 'Local Server',
    value: 'http://localhost:3222',
    isDefault: true
  },
  // Add more default servers here as needed
  // {
  //   label: 'My Self-Hosted Server',
  //   value: 'https://sync.mydomain.com',
  //   isDefault: false
  // },
];

/**
 * Get the default sync server URL
 * Returns the first server marked as default, or the first server if none are marked
 */
export function getDefaultSyncServer(): string {
  const defaultServer = DEFAULT_SYNC_SERVERS.find(server => server.isDefault) || DEFAULT_SYNC_SERVERS[0];
  return defaultServer?.value || 'http://localhost:3222';
}

/**
 * Get all available default sync servers
 */
export function getAvailableSyncServers(): SyncServerConfig[] {
  return DEFAULT_SYNC_SERVERS;
}

/**
 * Check if a URL is in the default servers list
 */
export function isDefaultSyncServer(url: string): boolean {
  return DEFAULT_SYNC_SERVERS.some(server => server.value === url);
}