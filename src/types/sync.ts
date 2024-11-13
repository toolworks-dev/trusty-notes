export interface SyncSettings {
    auto_sync: boolean;
    sync_interval: number;
    server_url: string;
    custom_servers: string[];
    seed_phrase: string | null;
  }
  
  export interface SyncProgress {
    total_notes: number;
    processed_notes: number;
    current_operation: string;
    errors: string[];
  }