import { WebStorageService } from '../services/webStorage';

export async function migrateNotesToPQ(): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
  errorDetails?: string[];
}> {
  try {
    // Get the settings
    const settings = await WebStorageService.getSyncSettings();
    if (!settings.seed_phrase) {
      throw new Error('No seed phrase available');
    }
    
    // Initialize crypto service if needed
    await WebStorageService.initializeCrypto(settings.seed_phrase);
    
    // Get all notes
    const notes = await WebStorageService.getNotes();
    
    // Counters
    let migrated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    // Process each note
    for (const note of notes) {
      try {
        // Update the note to use PQ encryption
        note.pending_sync = true;
        note.encryptionType = 2; // Mark as PQ encrypted
        await WebStorageService.saveNote(note);
        
        migrated++;
      } catch (error) {
        errors++;
        errorDetails.push(`Note ${note.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Trigger a sync
    if (settings.auto_sync && migrated > 0) {
      await WebStorageService.syncWithServer(settings.server_url);
    }
    
    return {
      success: true,
      migrated,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      migrated: 0,
      errors: 1,
      errorDetails: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export function isPQEncryptionSupported(): boolean {
  try {
    // Check if mlkem module is available and usable
    const MlKem768 = require('mlkem').MlKem768;
    return !!MlKem768;
  } catch (error) {
    return false;
  }
} 