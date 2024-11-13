import { useState } from 'react';
import { Button, Stack, Text, PasswordInput } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';

export function SyncSetup() {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [status, setStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSync = async () => {
    try {
      setStatus('syncing');
      await invoke('initialize_sync', { seedPhrase });
      await invoke('sync_notes', { seedPhrase });
      setStatus('idle');
    } catch (err: any) {
      setStatus('error');
      setError(err.toString());
    }
  };
  return (
    <Stack>
      <Text>Enter your seed phrase to sync across devices:</Text>
      <PasswordInput
        value={seedPhrase}
        onChange={(e) => setSeedPhrase(e.currentTarget.value)}
        placeholder="Enter seed phrase"
      />
      <Button 
        onClick={handleSync}
        loading={status === 'syncing'}
      >
        Sync Notes
      </Button>
      {status === 'error' && (
        <Text c="red">{error}</Text>
      )}
    </Stack>
  );
} 