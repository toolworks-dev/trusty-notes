import { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  Button, 
  PasswordInput, 
  Switch,
  Group,
  Paper,
  Modal,
  CopyButton,
  Select,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { SyncProgress } from './SyncProgress';
import { SyncSettings as SyncSettingsType, SyncProgress as SyncProgressType } from '../types/sync';
import { listen } from '@tauri-apps/api/event';

const DEFAULT_SERVERS = [
  { label: 'Official Server', value: 'https://notes-sync.0xgingi.com' },
  { label: 'Local Server', value: 'http://localhost:3222' },
];

export function SyncSettings() {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [showNewSeedPhrase, setShowNewSeedPhrase] = useState(false);
  const [newSeedPhrase, setNewSeedPhrase] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressType | null>(null);
  const [selectedServer, setSelectedServer] = useState(DEFAULT_SERVERS[0].value);
  const [customServers, setCustomServers] = useState<string[]>([]);
  const [newServer, setNewServer] = useState('');
  const [showAddServer, setShowAddServer] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await invoke<SyncSettingsType>('get_sync_settings');
        setAutoSync(settings.auto_sync);
        setSelectedServer(settings.server_url);
        setCustomServers(settings.custom_servers);
        setSeedPhrase(settings.seed_phrase ?? '');
        console.log('Loaded settings:', settings);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setAutoSync(false);
        setSelectedServer(DEFAULT_SERVERS[0].value);
        setCustomServers([]);
        setSeedPhrase('');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const unlisten = listen<SyncProgressType>('sync:progress', (event) => {
      setSyncProgress(event.payload);
    });
  
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const saveSettings = async (updates: Partial<SyncSettingsType>) => {
    try {
      const currentSettings = await invoke<SyncSettingsType>('get_sync_settings');
      
      const newSettings: SyncSettingsType = {
        auto_sync: 'auto_sync' in updates ? updates.auto_sync! : autoSync,
        server_url: 'server_url' in updates ? updates.server_url! : selectedServer,
        custom_servers: 'custom_servers' in updates ? updates.custom_servers! : customServers,
        seed_phrase: 'seed_phrase' in updates ? updates.seed_phrase! : seedPhrase,
        sync_interval: currentSettings.sync_interval,
      };
  
      await invoke('save_sync_settings', { settings: newSettings });
      console.log('Saved settings:', newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
        color: 'red',
      });
    }
  };
  
  const generateNewSeedPhrase = async () => {
    try {
      const phrase = await invoke<string>('generate_seed_phrase');
      setNewSeedPhrase(phrase);
      setShowNewSeedPhrase(true);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate seed phrase',
        color: 'red',
      });
    }
  };

  const handleSync = async () => {
    if (!seedPhrase || !selectedServer) {
      notifications.show({
        title: 'Error',
        message: 'Please enter your seed phrase and select a server',
        color: 'red',
      });
      return;
    }

    try {
      setSyncing(true);
      
      await invoke('initialize_sync', { 
        seedPhrase,
        serverUrl: selectedServer
      });

      await invoke('sync_notes', { 
        seedPhrase,
        serverUrl: selectedServer
      });
      
      notifications.show({
        title: 'Sync Complete',
        message: 'Your notes have been synchronized successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Sync error:', error);
      notifications.show({
        title: 'Sync Failed',
        message: error instanceof Error ? error.message : 'Failed to sync notes',
        color: 'red',
      });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleServerChange = async (value: string | null) => {
    if (value) {
      setSelectedServer(value);
      await saveSettings({ server_url: value });
    }
  };
  
  const handleAddServer = async () => {
    if (!newServer) return;
    
    try {
      new URL(newServer);
      
      const updatedServers = [...customServers, newServer];
      setCustomServers(updatedServers);
      await saveSettings({ custom_servers: updatedServers });
      setNewServer('');
      setShowAddServer(false);
      
      await handleServerChange(newServer);
    } catch (error) {
      notifications.show({
        title: 'Invalid URL',
        message: 'Please enter a valid server URL',
        color: 'red',
      });
    }
  };
  
  const handleRemoveServer = async (serverUrl: string) => {
    const updatedServers = customServers.filter(url => url !== serverUrl);
    setCustomServers(updatedServers);
    await saveSettings({ custom_servers: updatedServers });
    
    if (selectedServer === serverUrl) {
      await handleServerChange(DEFAULT_SERVERS[0].value);
    }
  };
  
  const serverOptions = [
    ...DEFAULT_SERVERS,
    ...customServers.map(url => ({
      label: url,
      value: url,
      group: 'Custom Servers',
      rightSection: (
        <ActionIcon 
          size="sm" 
          color="red" 
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveServer(url);
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      ),
    })),
  ];

  // Save settings when they change
  useEffect(() => {
    if (seedPhrase) {
      saveSettings({ seed_phrase: seedPhrase });
    }
  }, [seedPhrase]);

  useEffect(() => {
    saveSettings({ auto_sync: autoSync });
  }, [autoSync]);

  return (
    <Stack>
      <Paper p="md" withBorder>
        <Stack>
          <Text size="lg" fw={500}>Sync Settings</Text>
          
          <Select
            label="Sync Server"
            placeholder="Select a server"
            data={serverOptions}
            value={selectedServer}
            onChange={handleServerChange}
            rightSection={
              <ActionIcon onClick={() => setShowAddServer(true)}>
                <IconPlus size={16} />
              </ActionIcon>
            }
            allowDeselect={false}
          />
          
          <PasswordInput
            label="Seed Phrase"
            description="Enter your seed phrase to sync across devices"
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.currentTarget.value)}
          />

          <Group justify="space-between">
            <Button 
              onClick={handleSync}
              loading={syncing}
            >
              Sync Now
            </Button>
            <Button 
              variant="light"
              onClick={generateNewSeedPhrase}
            >
              Generate New Seed Phrase
            </Button>
          </Group>

          <Switch
            label="Auto-sync"
            checked={autoSync}
            onChange={(e) => {
                setAutoSync(e.currentTarget.checked);
                saveSettings({ auto_sync: e.currentTarget.checked });
            }}
          />
        </Stack>
      </Paper>

      {syncProgress && (
        <SyncProgress progress={syncProgress} />
      )}

      <Modal
        opened={showAddServer}
        onClose={() => setShowAddServer(false)}
        title="Add Custom Server"
      >
        <Stack>
          <TextInput
            label="Server URL"
            placeholder="https://your-server.com"
            value={newServer}
            onChange={(e) => setNewServer(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setShowAddServer(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddServer}>
              Add Server
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showNewSeedPhrase}
        onClose={() => setShowNewSeedPhrase(false)}
        title="Your New Seed Phrase"
      >
        <Stack>
          <Text fw={500} c="red">
            Important: Save this phrase somewhere safe. You'll need it to sync your notes across devices.
          </Text>
          <Paper p="md" withBorder>
            <Text>{newSeedPhrase}</Text>
          </Paper>
          <Group>
            <CopyButton value={newSeedPhrase}>
              {({ copied, copy }) => (
                <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}