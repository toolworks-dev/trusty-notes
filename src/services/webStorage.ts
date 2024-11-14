import { CryptoService } from './cryptoService';
import { ApiService } from './apiService';

interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface SyncSettings {
  auto_sync: boolean;
  sync_interval: number;
  server_url: string;
  custom_servers: string[];
  seed_phrase: string | null;
}

export class WebStorageService {
  private static readonly NOTES_KEY = 'notes';
  private static readonly SETTINGS_KEY = 'sync_settings';
  private static crypto: CryptoService | null = null;

  static async initializeCrypto(seedPhrase: string) {
    this.crypto = await CryptoService.new(seedPhrase);
  }

  static async getNotes(): Promise<Note[]> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  }

  static async saveNote(note: Partial<Note>): Promise<void> {
    const notes = await this.getNotes();
    const now = Date.now();
    
    const updatedNote = {
      ...note,
      updated_at: now,
      created_at: note.created_at || now,
    } as Note;

    if (!updatedNote.id) {
      updatedNote.id = now;
    }
    
    const index = notes.findIndex(n => n.id === updatedNote.id);
    if (index !== -1) {
      notes[index] = updatedNote;
    } else {
      notes.push(updatedNote);
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
      server_url: 'https://notes-sync.toolworks.dev',
      custom_servers: [],
      seed_phrase: null
    };
  }

  static async saveSyncSettings(settings: Partial<SyncSettings>): Promise<void> {
    const currentSettings = await this.getSyncSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(newSettings));
  }

  static async syncWithServer(serverUrl: string, retries = 3): Promise<void> {
    if (!this.crypto) {
      throw new Error('Crypto not initialized');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const isHealthy = await ApiService.healthCheck(serverUrl);
        if (!isHealthy) {
          throw new Error('Server is not healthy');
        }

        const localNotes = await this.getNotes();
        console.log('Local notes before encryption:', localNotes);
        
        // Ensure all notes have IDs
        const notesWithIds = localNotes.map(note => ({
          ...note,
          id: note.id || Date.now()
        }));

        const encryptedNotes = await Promise.all(
          notesWithIds.map(note => this.crypto!.encryptNote(note))
        );
        
        console.log('Encrypted notes:', encryptedNotes);
        
        //const publicKey = await this.crypto.getPublicKeyBase64();

        const userId = localStorage.getItem('user_id');
        if (!userId) {
          throw new Error('User ID not found');
        }

        const response = await ApiService.syncNotes(
          serverUrl, 
          userId,
          encryptedNotes
        );
        console.log('Server response:', response);
        
        const serverNotes = await Promise.all(
          response.notes.map(async note => {
            const decrypted = await this.crypto!.decryptNote(note);
            return decrypted;
          })
        );
        
        console.log('Decrypted server notes:', serverNotes);

        const mergedNotes = this.mergeNotes(notesWithIds, serverNotes);
        console.log('Merged notes:', mergedNotes);
        
        localStorage.setItem(this.NOTES_KEY, JSON.stringify(mergedNotes));
        return;
        
      } catch (error) {
        console.error(`Sync attempt ${attempt + 1} failed:`, error);
        lastError = error as Error;
        
        if (attempt < retries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }
      }
    }

    throw lastError || new Error('Sync failed after retries');
  }

  private static mergeNotes(localNotes: Note[], serverNotes: Note[]): Note[] {
    const notesMap = new Map<number, Note>();
    
    localNotes.forEach(note => {
      if (note.id) {
        notesMap.set(note.id, note);
      }
    });
    
    serverNotes.forEach(note => {
      if (note.id) {
        const existingNote = notesMap.get(note.id);
        if (!existingNote || note.updated_at > existingNote.updated_at) {
          notesMap.set(note.id, note);
        }
      }
    });
    
    return Array.from(notesMap.values())
      .sort((a, b) => b.updated_at - a.updated_at);
  }
}