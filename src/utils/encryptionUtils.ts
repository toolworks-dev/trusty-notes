import { WebStorageService } from '../services/webStorage';

export async function migrateNotesToPQ(): Promise<{
  success: boolean;
  migrated: number;
  errors: number;
  errorDetails?: string[];
}> {
  try {
    const settings = await WebStorageService.getSyncSettings();
    if (!settings.seed_phrase) {
      throw new Error('No seed phrase available');
    }
    
    await WebStorageService.initializeCrypto(settings.seed_phrase);
    
    const notes = await WebStorageService.getNotes();
    
    let migrated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    
    for (const note of notes) {
      try {
        note.pending_sync = true;
        note.encryptionType = 2;
        await WebStorageService.saveNote(note);
        
        migrated++;
      } catch (error) {
        errors++;
        errorDetails.push(`Note ${note.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
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
    const cryptoService = WebStorageService.getCryptoInstance();
    return cryptoService ? cryptoService.isPQCryptoAvailable() : false;
  } catch (error) {
    console.error("Error checking PQ support:", error);
    return false;
  }
} 