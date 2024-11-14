export interface Note {
  id?: number;  // Make id optional
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export interface SyncSettings {
  auto_sync: boolean;
  sync_interval: number;
  server_url: string;
  custom_servers: string[];
  seed_phrase: string | null;
}