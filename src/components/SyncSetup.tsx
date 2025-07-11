import { useState } from 'react';
import { Button, Stack, Text, PasswordInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { WebStorageService } from '../services/webStorage';
import { getDefaultSyncServer } from '../config/sync';

interface SyncSetupProps {
  onSync?: () => Promise<void>;
}

export function SyncSetup({ onSync }: SyncSetupProps) {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const handleSync = async () => {
    if (!seedPhrase) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a sync code',
        color: 'red',
      });
      return;
    }

    try {
      setStatus('syncing');
      const defaultServer = getDefaultSyncServer();
      await WebStorageService.initializeCrypto(seedPhrase);
      await WebStorageService.syncWithServer(defaultServer);
      await WebStorageService.saveSyncSettings({ 
        seed_phrase: seedPhrase,
        server_url: defaultServer,
        auto_sync: false,
        sync_interval: 5,
        custom_servers: []
      });
      
      if (onSync) {
        await onSync();
      }

      notifications.show({
        title: 'Success',
        message: 'Notes synced successfully',
        color: 'green',
      });
      
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      console.error('Sync error:', error);
      notifications.show({
        title: 'Error',
        message: typeof error === 'string' ? error : 'Failed to sync notes',
        color: 'red',
      });
    }
  };

  return (
    <Stack>
      <Text>Enter your sync code to sync across devices:</Text>
      <PasswordInput
        value={seedPhrase}
        onChange={(e) => setSeedPhrase(e.currentTarget.value)}
        placeholder="Enter sync code"
        description="This phrase is used to encrypt your notes. Keep it safe!"
      />
      <Button 
        onClick={handleSync}
        loading={status === 'syncing'}
      >
        Sync Notes
      </Button>
      {status === 'error' && (
        <Text c="red">Failed to sync notes. Please try again.</Text>
      )}
    </Stack>
  );
}