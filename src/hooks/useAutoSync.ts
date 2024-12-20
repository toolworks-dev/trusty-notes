import { useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { WebStorageService } from '../services/webStorage';
import { CryptoService } from '../services/cryptoService';

export function useAutoSync(auto_sync: boolean, sync_interval: number) {
  const syncTimeoutRef = useRef<number>();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function performSync() {
      if (isSyncingRef.current) return;
    
      try {
        isSyncingRef.current = true;
        const settings = await WebStorageService.getSyncSettings();
        if (!settings.seed_phrase) {
          throw new Error('No seed phrase configured');
        }
    
        const cryptoService = await CryptoService.new(settings.seed_phrase);
        const notes = await WebStorageService.getNotes();
        const encryptedNotes = await Promise.all(
          notes.map(note => cryptoService.encryptNote(note))
        );
    
        const response = await fetch(`${settings.server_url}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_key: await cryptoService.getPublicKeyBase64(),
            notes: encryptedNotes,
            client_version: '0.1.5'
          }),
        });
    
        if (!response.ok) {
          throw new Error(await response.text());
        }
    
        notifications.show({
          title: 'Auto-sync Complete',
          message: 'Your notes have been synchronized',
          color: 'green',
        });
      } catch (error: unknown) {
        console.error('Auto-sync failed:', error);
        notifications.show({
          title: 'Auto-sync Failed',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
          color: 'red',
        });
      } finally {
        isSyncingRef.current = false;
      }
    }

    function scheduleNextSync() {
      if (!auto_sync) return;
      
      syncTimeoutRef.current = window.setTimeout(() => {
        performSync().finally(scheduleNextSync);
      }, sync_interval * 60 * 1000);
    }

    scheduleNextSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [auto_sync, sync_interval]);
}