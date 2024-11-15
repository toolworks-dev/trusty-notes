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
import { notifications } from '@mantine/notifications';
import { WebStorageService } from '../services/webStorage';
import { SyncSettings as SyncSettingsType } from '../types/sync';
import { CryptoService } from '../services/cryptoService';
import { ApiService } from '../services/apiService';
//import { NumberInput } from '@mantine/core';

const DEFAULT_SERVERS = [
  { label: 'Official Server', value: 'https://notes-sync.toolworks.dev' },
  { label: 'Local Server', value: 'http://localhost:3222' },
];

interface SyncSettingsProps {
  onSync?: () => Promise<void>;
}

export function SyncSettings({ onSync }: SyncSettingsProps) {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [showNewSeedPhrase, setShowNewSeedPhrase] = useState(false);
  const [newSeedPhrase, setNewSeedPhrase] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [selectedServer, setSelectedServer] = useState(DEFAULT_SERVERS[0].value);
  const [customServers, setCustomServers] = useState<string[]>([]);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [showAddServer, setShowAddServer] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setNewServerUrl(value);
    setIsValidUrl(validateUrl(value));
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && isValidUrl) {
      handleAddServer();
    }
  };



  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await WebStorageService.getSyncSettings();
        setAutoSync(settings.auto_sync);
        setSelectedServer(settings.server_url);
        setCustomServers(settings.custom_servers || []);
        setSeedPhrase(settings.seed_phrase ?? '');
        setSyncInterval(settings.sync_interval);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);


  const saveSettings = async (updates: Partial<SyncSettingsType>) => {
    try {
      const currentSettings = await WebStorageService.getSyncSettings();
      const newSettings: SyncSettingsType = {
        auto_sync: 'auto_sync' in updates ? updates.auto_sync! : autoSync,
        server_url: 'server_url' in updates ? updates.server_url! : selectedServer,
        custom_servers: 'custom_servers' in updates ? updates.custom_servers! : customServers,
        seed_phrase: 'seed_phrase' in updates ? updates.seed_phrase! : seedPhrase,
        sync_interval: 'sync_interval' in updates ? updates.sync_interval! : currentSettings.sync_interval,
      };
      await WebStorageService.saveSyncSettings(newSettings);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
      });
    }
  };

  const handleAddServer = async () => {
    try {
      if (!isValidUrl) {
        return;
      }
      
      if (customServers.includes(newServerUrl) || 
          DEFAULT_SERVERS.some(s => s.value === newServerUrl)) {
        notifications.show({
          title: 'Error',
          message: 'Server already exists',
          color: 'red',
        });
        return;
      }
      
      const updatedServers = [...customServers, newServerUrl];
      setCustomServers(updatedServers);
      setSelectedServer(newServerUrl);
      await saveSettings({ 
        custom_servers: updatedServers,
        server_url: newServerUrl
      });
      setNewServerUrl('');
      setShowAddServer(false);
      
      notifications.show({
        title: 'Success',
        message: 'Server added successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to add server',
        color: 'red',
      });
    }
  };
  
  const handleRemoveServer = async (serverUrl: string) => {
    const updatedServers = customServers.filter(url => url !== serverUrl);
    setCustomServers(updatedServers);
    await saveSettings({ custom_servers: updatedServers });
    
    if (selectedServer === serverUrl) {
      const newServer = DEFAULT_SERVERS[0].value;
      setSelectedServer(newServer);
      await saveSettings({ server_url: newServer });
    }
  };

  const handleServerChange = async (value: string | null) => {
    if (value) {
      setSelectedServer(value);
      await saveSettings({ server_url: value });
    }
  };

  const handleSync = async () => {
    if (!seedPhrase) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a seed phrase',
        color: 'red',
      });
      return;
    }
  
    setSyncing(true);
    try {
      console.log('Starting sync process...');
      
      await WebStorageService.initializeCrypto(seedPhrase);
      console.log('Crypto initialized');
      
      const isHealthy = await ApiService.healthCheck(selectedServer);
      if (!isHealthy) {
        throw new Error(`Server ${selectedServer} is not healthy`);
      }
      console.log('Server health check passed');
      
      await WebStorageService.syncWithServer(selectedServer);
      console.log('Sync completed');
      
      await WebStorageService.saveSyncSettings({ seed_phrase: seedPhrase });
      console.log('Settings saved');
      
      if (onSync) {
        await onSync();
      }
      
      notifications.show({
        title: 'Success',
        message: 'Notes synced successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Sync error:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to sync notes',
        color: 'red',
        autoClose: false,
      });
    } finally {
      setSyncing(false);
    }
  };

  const generateNewSeedPhrase = async () => {
    try {
      const mnemonic = CryptoService.generateNewSeedPhrase();
      
      await WebStorageService.initializeCrypto(mnemonic);
      
      setNewSeedPhrase(mnemonic);
      setSeedPhrase(mnemonic);
      await saveSettings({ seed_phrase: mnemonic });
      setShowNewSeedPhrase(true);
    } catch (error) {
      console.error('Failed to generate seed phrase:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to generate seed phrase',
        color: 'red',
      });
    }
  };

  const serverOptions = [
    ...DEFAULT_SERVERS,
    ...customServers.map(url => ({
      label: url,
      value: url,
      rightSection: (
        <ActionIcon 
          size="sm" 
          color="red" 
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveServer(url);
          }}
        >
          <IconTrash size={14} />
        </ActionIcon>
      )
    }))
  ];

  return (
    <Stack>
      <Paper p="md" withBorder>
        <Stack>
          <Group align="flex-end">
            <Select
              label="Sync Server"
              placeholder="Select a server"
              data={serverOptions}
              value={selectedServer}
              onChange={handleServerChange}
              style={{ flex: 1 }}
            />
            <Button 
              variant="light"
              onClick={() => setShowAddServer(true)}
              leftSection={<IconPlus size={16} />}
            >
              Add Server
            </Button>
          </Group>
          
          <PasswordInput
            label="Seed Phrase"
            description="Enter your seed phrase to sync across devices"
            value={seedPhrase}
            onChange={(e) => {
              setSeedPhrase(e.currentTarget.value);
              saveSettings({ seed_phrase: e.currentTarget.value });
            }}
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

          <Stack gap="xs">
            <Switch
              label="Auto-sync"
              checked={autoSync}
              onChange={(e) => {
                setAutoSync(e.currentTarget.checked);
                saveSettings({ auto_sync: e.currentTarget.checked });
              }}
            />
            
            {autoSync && (
              <Select
                label="Sync Interval"
                description="Minutes between auto-syncs"
                value={syncInterval.toString()}
                data={[
                  { value: '1', label: '1 minute' },
                  { value: '5', label: '5 minutes' },
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' }
                ]}
                onChange={(value) => {
                  const numericValue = parseInt(value || '1');
                  setSyncInterval(numericValue);
                  saveSettings({ sync_interval: numericValue });
                }}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      <Modal
        opened={showAddServer}
        onClose={() => setShowAddServer(false)}
        title="Add Custom Server"
      >
        <Stack>
          <TextInput
            label="Server URL"
            description="Enter the full URL of your sync server"
            placeholder="https://your-server.com"
            value={newServerUrl}
            onChange={(e) => handleUrlChange(e.currentTarget.value)}
            onKeyPress={handleKeyPress}
            error={newServerUrl && !isValidUrl ? "Please enter a valid URL" : null}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setShowAddServer(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddServer}
              disabled={!isValidUrl}
            >
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