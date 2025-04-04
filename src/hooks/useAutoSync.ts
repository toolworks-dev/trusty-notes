import { useEffect, useRef } from 'react';
import { WebStorageService } from '../services/webStorage';

export function useAutoSync(auto_sync: boolean, sync_interval: number) {
  const syncTimeoutRef = useRef<number | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function performSync() {
      if (isSyncingRef.current) {
        console.log('Auto-sync already in progress, skipping.');
        return;
      }
    
      try {
        isSyncingRef.current = true;
        const settings = await WebStorageService.getSyncSettings();
        
        if (!settings.auto_sync || !settings.seed_phrase || !settings.server_url) {
          console.log('Auto-sync skipped: Not configured or disabled in settings.');
          isSyncingRef.current = false;
          return; 
        }
    
        console.log('Triggering auto-sync via WebStorageService...');
        await WebStorageService.syncWithServer(settings.server_url);
        console.log('Auto-sync attempt via WebStorageService finished.');
    
      } catch (error: unknown) {
        console.error('Auto-sync failed:', error);
      } finally {
        isSyncingRef.current = false;
      }
    }

    function scheduleNextSync() {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
        
        if (!auto_sync) {
            console.log('Auto-sync scheduling stopped: auto_sync is false.');
            return;
        }
        
        console.log(`Scheduling next auto-sync in ${sync_interval} minutes.`);
        syncTimeoutRef.current = window.setTimeout(() => {
            performSync().finally(scheduleNextSync);
        }, sync_interval * 60 * 1000);
    }

    console.log('useAutoSync effect started/updated. Scheduling first sync.');
    scheduleNextSync();

    return () => {
      console.log('useAutoSync effect cleanup: Clearing sync timeout.');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      isSyncingRef.current = false;
    };
  }, [auto_sync, sync_interval]);
}