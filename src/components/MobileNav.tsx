import { Group, ActionIcon, Drawer, Stack, Button, TextInput } from '@mantine/core';
import { 
  IconMenu2, 
  IconPlus, 
  IconSearch,
  IconSun,
  IconMoon,
  IconCloud,
  IconDownload,
  IconUpload
} from '@tabler/icons-react';

interface MobileNavProps {
  opened: boolean;
  onClose: () => void;
  onNewNote: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onToggleTheme: () => void;
  colorScheme: 'dark' | 'light';
  onShowSyncSettings: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function MobileNav({
  opened,
  onClose,
  onNewNote,
  onSearch,
  searchQuery,
  onToggleTheme,
  colorScheme,
  onShowSyncSettings,
  onExport,
  onImport
}: MobileNavProps) {
  return (
    <>
      <Group justify="space-between" p="md">
        <ActionIcon variant="subtle" onClick={() => onClose()}>
          <IconMenu2 size={24} />
        </ActionIcon>
        <Group>
          <ActionIcon variant="subtle" onClick={onNewNote}>
            <IconPlus size={24} />
          </ActionIcon>
        </Group>
      </Group>

      <Drawer opened={opened} onClose={onClose} title="Menu" position="left">
        <Stack p="md">
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            onClick={() => {
              onNewNote();
              onClose();
            }}
            fullWidth
          >
            New Note
          </Button>

          <TextInput
            placeholder="Search notes..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => onSearch(e.currentTarget.value)}
          />

          <Group grow>
            <Button
              variant="light"
              leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              onClick={onToggleTheme}
            >
              {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </Group>

          <Group grow>
            <Button
              variant="light"
              leftSection={<IconCloud size={16} />}
              onClick={() => {
                onShowSyncSettings();
                onClose();
              }}
            >
              Sync Settings
            </Button>
          </Group>

          <Group grow>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={onExport}
            >
              Export Notes
            </Button>
            <Button
              variant="light"
              leftSection={<IconUpload size={16} />}
              onClick={onImport}
            >
              Import Notes
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </>
  );
} 