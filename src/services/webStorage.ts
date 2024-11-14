import { CryptoService } from './cryptoService';

interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

interface SyncSettings {
  auto_sync: boolean;
  sync_interval: number;
  server_url: string;
  custom_servers: string[];
  seed_phrase: string | null;
}

export class WebStorageService {
  private static NOTES_KEY = 'notes';
  private static SETTINGS_KEY = 'sync_settings';
  private static crypto: CryptoService | null = null;

  static async initializeCrypto(seedPhrase: string) {
    this.crypto = await CryptoService.new(seedPhrase);
  }

  static async getNotes(): Promise<Note[]> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  }

  static async saveNote(note: Note): Promise<void> {
    const notes = await this.getNotes();
    
    if (note.id) {
      const index = notes.findIndex(n => n.id === note.id);
      if (index !== -1) {
        notes[index] = note;
      }
    } else {
      note.id = Date.now();
      notes.push(note);
    }
    
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
  }

  static async deleteNote(noteId: number): Promise<void> {
    const notes = await this.getNotes();
    const filteredNotes = notes.filter(note => note.id !== noteId);
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(filteredNotes));
  }

  static async getSyncSettings(): Promise<SyncSettings> {
    const settingsJson = localStorage.getItem(this.SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : {
      auto_sync: false,
      sync_interval: 300,
      server_url: 'https://notes-sync.0xgingi.com',
      custom_servers: [],
      seed_phrase: null
    };
  }

  static async saveSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
    const currentSettings = await this.getSyncSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(newSettings));
  }

  static async syncWithServer(serverUrl: string): Promise<void> {
    if (!this.crypto) {
      throw new Error('Crypto not initialized. Please set up sync first.');
    }

    const notes = await this.getNotes();
    const encryptedNotes = await Promise.all(
      notes.map(note => this.crypto!.encryptNote(note))
    );

    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: await this.crypto.getPublicKeyBase64(),
        notes: encryptedNotes,
        client_version: '0.1.1'
      }),
    });

    if (!response.ok) {
      throw new Error('Sync failed: ' + await response.text());
    }

    const result = await response.json();
    
    const decryptedNotes = await Promise.all(
      result.notes.map((encNote: EncryptedNote) => this.crypto!.decryptNote(encNote))
    );

    localStorage.setItem(this.NOTES_KEY, JSON.stringify(decryptedNotes));
  }
}