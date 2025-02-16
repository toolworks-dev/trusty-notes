import { CryptoService } from './cryptoService';
import { ApiService } from './apiService';
import { Note, SyncSettings } from '../types/sync';

export class WebStorageService {
  private static readonly NOTES_KEY = 'notes';
  private static readonly SETTINGS_KEY = 'sync_settings';
  private static readonly DELETE_RETENTION_DAYS = 1;
  private static crypto: CryptoService | null = null;

  static async initializeCrypto(seedPhrase: string) {
    this.crypto = await CryptoService.new(seedPhrase);
  }

  static async getNotes(): Promise<Note[]> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    return notes.filter(note => !note.deleted);
  }

  static async saveNote(note: Partial<Note>): Promise<void> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    const now = Date.now();
    
    const existingNote = notes.find(n => n.id === note.id);
    
    const updatedNote = {
      ...existingNote,
      ...note,
      updated_at: now,
      created_at: note.created_at || existingNote?.created_at || now,
      attachments: existingNote?.attachments || note.attachments || [],
      pending_sync: note.pending_sync || existingNote?.pending_sync || false
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

  static async deleteNote(noteId: number | number[]): Promise<void> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    let notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    const now = Date.now();
    
    if (Array.isArray(noteId)) {
      notes = notes.map(note => 
        noteId.includes(note.id!) 
          ? { ...note, deleted: true, updated_at: now }
          : note
      );
    } else {
      notes = notes.map(note => 
        note.id === noteId 
          ? { ...note, deleted: true, updated_at: now }
          : note
      );
    }
    
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
    
    const settings = await this.getSyncSettings();
    if (settings?.auto_sync && settings?.seed_phrase && this.crypto) {
      try {
        await this.syncWithServer(settings.server_url);
        await this.purgeDeletedNotes();
      } catch (error) {
        console.error('Failed to sync after deletion:', error);
      }
    }
  }

  static async getSyncSettings(): Promise<SyncSettings> {
    const settingsJson = localStorage.getItem(this.SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : {
      auto_sync: false,
      sync_interval: 300,
      server_url: 'https://sync.trustynotes.app',
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
    if (!navigator.onLine) {
      console.log('Device is offline, skipping sync');
      return;
    }
  
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
  
        const notesJson = localStorage.getItem(this.NOTES_KEY);
        const allNotes: Note[] = notesJson ? JSON.parse(notesJson) : [];
                
        console.log('Local notes before encryption:', allNotes);
        
        const notesWithIds = allNotes.map(note => ({
          ...note,
          id: note.id || Date.now(),
          deleted: note.deleted || false,
          timestamp: note.updated_at
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
        await this.purgeDeletedNotes();
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

  static async getDeletedNotes(): Promise<Note[]> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    return notes.filter(note => note.deleted);
  }

  private static mergeNotes(localNotes: Note[], serverNotes: Note[]): Note[] {
    const notesMap = new Map<number, Note>();
    
    localNotes.forEach(note => {
      if (note.id) {
        if (!note.deleted) {
          notesMap.set(note.id, note);
        }
      }
    });
    
    serverNotes.forEach(note => {
      if (note.id) {
        const existingNote = notesMap.get(note.id);
        
        if (note.deleted) {
          notesMap.delete(note.id);
        } else if (!existingNote || note.updated_at > existingNote.updated_at) {
          notesMap.set(note.id, note);
        }
      }
    });
    
    return Array.from(notesMap.values())
      .sort((a, b) => b.updated_at - a.updated_at);
  }

  static async purgeDeletedNotes(): Promise<void> {
    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    
    const cutoffDate = Date.now() - (this.DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    
    const filteredNotes = notes.filter(note => 
      !note.deleted || note.updated_at > cutoffDate
    );
    
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(filteredNotes));
  }

  static async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  static async saveNoteWithOfflineSupport(note: Partial<Note>): Promise<void> {
    await this.saveNote(note);
    
    if (!navigator.onLine) {
      const offlinePendingSync = JSON.parse(
        localStorage.getItem('offline_pending_sync') || '[]'
      );
      offlinePendingSync.push(note.id);
      localStorage.setItem('offline_pending_sync', JSON.stringify(offlinePendingSync));
    }
  }

  static async syncOfflineChanges(): Promise<void> {
    if (!navigator.onLine) return;

    const pendingSync = JSON.parse(
      localStorage.getItem('offline_pending_sync') || '[]'
    );

    if (pendingSync.length === 0) return;

    const settings = await this.getSyncSettings();
    if (settings?.auto_sync && settings?.seed_phrase) {
      try {
        await this.syncWithServer(settings.server_url);
        localStorage.setItem('offline_pending_sync', '[]');
      } catch (error) {
        console.error('Failed to sync offline changes:', error);
      }
    }
  }

  static initializeOfflineSupport(): void {
    window.addEventListener('online', () => {
      this.syncOfflineChanges();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline. Changes will be synced when online.');
    });
  }

  static async addAttachment(noteId: number, file: File): Promise<Note> {
    if (!this.crypto) {
      throw new Error('Crypto not initialized');
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const estimatedSize = file.size * 1.37;
    const availableSpace = this.getAvailableStorageSpace();
    if (estimatedSize > availableSpace) {
      throw new Error(`Not enough storage space. Need ${Math.ceil(estimatedSize / (1024 * 1024))}MB but only ${Math.ceil(availableSpace / (1024 * 1024))}MB available.`);
    }

    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note) {
      throw new Error('Note not found');
    }

    const MAX_TOTAL_ATTACHMENTS_SIZE = 50 * 1024 * 1024; // 50MB
    let totalSize = file.size;
    if (note.attachments) {
      for (const attachment of note.attachments) {
        totalSize += Buffer.from(attachment.data, 'base64').length;
      }
    }
    if (totalSize > MAX_TOTAL_ATTACHMENTS_SIZE) {
      throw new Error(`Total attachments size would exceed limit of ${MAX_TOTAL_ATTACHMENTS_SIZE / (1024 * 1024)}MB`);
    }

    const attachment = await this.crypto.encryptFile(file);
    
    note.attachments = note.attachments || [];
    note.attachments.push(attachment);
    note.updated_at = Date.now();
    note.pending_sync = true;

    const index = notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      notes[index] = note;
    }
    
    try {
      localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(`Storage quota exceeded. Try removing some attachments first.`);
      }
      throw error;
    }
    return note;
  }

  static async removeAttachment(noteId: number, attachmentId: string): Promise<void> {
    if (!this.crypto) {
      throw new Error('Crypto not initialized');
    }

    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note || !note.attachments) {
      throw new Error('Note not found');
    }

    note.attachments = note.attachments.filter(a => a.id !== attachmentId);
    note.updated_at = Date.now();
    note.pending_sync = true;

    const index = notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      notes[index] = note;
    }
    
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(notes));
  }

  static async downloadAttachment(noteId: number, attachmentId: string): Promise<void> {
    if (!this.crypto) {
      throw new Error('Crypto not initialized');
    }

    const notesJson = localStorage.getItem(this.NOTES_KEY);
    const notes: Note[] = notesJson ? JSON.parse(notesJson) : [];
    const note = notes.find(n => n.id === noteId);
    
    if (!note || !note.attachments) {
      throw new Error('Note not found');
    }

    const attachment = note.attachments.find(a => a.id === attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    try {
      const decryptedBlob = await this.crypto.decryptFile(attachment);
      
      // Create download link
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to decrypt attachment:', error);
      throw new Error('Failed to decrypt attachment');
    }
  }

  private static getAvailableStorageSpace(): number {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length * 2; 
        }
      }
      const maxSpace = 5 * 1024 * 1024;
      return maxSpace - total;
    } catch (e) {
      console.error('Failed to calculate storage space:', e);
      return 0;
    }
  }
}