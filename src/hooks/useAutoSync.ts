import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';

export function useAutoSync(auto_sync: boolean, sync_interval: number) {
  const syncTimeoutRef = useRef<number>();
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function performSync() {
      if (isSyncingRef.current) return;

      try {
        isSyncingRef.current = true;
        await invoke('sync_notes');
        
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