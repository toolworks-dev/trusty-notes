import { useState, useEffect } from 'react';
import { 
  Group, 
  ActionIcon, 
  Drawer, 
  Stack, 
  Button, 
  TextInput, 
  Box, 
  Text, 
  Paper, 
  Image, 
  MantineColorScheme, 
  Anchor 
} from '@mantine/core';
import { 
  IconPlus, 
  IconSearch,
  IconSun,
  IconMoon,
  IconCloud,
  IconDownload,
  IconUpload,
  IconBrandGithub,
  IconTrash,
  IconWifiOff
} from '@tabler/icons-react';
import { format } from 'date-fns';

interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

interface MobileNavProps {
  opened: boolean;
  onClose: () => void;
  onNewNote: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onToggleTheme: () => void;
  colorScheme: MantineColorScheme;
  onShowSyncSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  selectedNote: Note | null;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: number) => void;
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
  onImport,
  selectedNote,
  notes,
  onSelectNote,
  onDeleteNote
}: MobileNavProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNoteSelect = (note: Note) => {
    onSelectNote(note);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="100%"
      position="left"
      withCloseButton={false}
    >
      <Stack h="100%" p="md">
        <Group justify="space-between" mb="md">
          <Group>
            <Image src="/trusty.jpg" alt="Logo" w={30} h={30} />
            <Text size="lg" fw={500}>TrustyNotes</Text>
          </Group>
          <ActionIcon variant="subtle" onClick={onClose}>×</ActionIcon>
        </Group>

        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            onClick={() => {
              onNewNote();
              onClose();
            }}
            style={{ flex: 1 }}
          >
            New Note
          </Button>
        </Group>

        <TextInput
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
        />

        <Box style={{ flex: 1, overflowY: 'auto' }}>
          {!isOnline && (
            <Paper p="xs" mb="md" bg="yellow.1">
              <Group>
                <IconWifiOff size={16} />
                <Text size="sm">Offline Mode - Changes will sync when online</Text>
              </Group>
            </Paper>
          )}
          
          <Stack gap="xs">
            {notes.map((note) => (
              <Paper
                key={note.id}
                shadow="xs"
                p="md"
                onClick={() => handleNoteSelect(note)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedNote?.id === note.id ? 
                    'var(--mantine-color-blue-light)' : undefined
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} truncate="end">
                      {note.title || 'Untitled'}
                    </Text>
                    <Text size="xs" c="dimmed" truncate="end">
                      {format(note.updated_at, 'MMM d, yyyy HH:mm')}
                    </Text>
                  </Box>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id!);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>

        <Stack gap="xs">
          <Group>
            <ActionIcon 
              variant="default" 
              onClick={onToggleTheme} 
              size={36}
              style={{ flex: 1 }}
            >
              {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </ActionIcon>
            <ActionIcon 
              variant="default" 
              onClick={onShowSyncSettings} 
              size={36}
              style={{ flex: 1 }}
              disabled={!isOnline}
            >
              <IconCloud size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="default" 
              onClick={onExport} 
              size={36}
              style={{ flex: 1 }}
            >
              <IconDownload size={16} />
            </ActionIcon>
            <ActionIcon 
              variant="default" 
              onClick={onImport} 
              size={36}
              style={{ flex: 1 }}
            >
              <IconUpload size={16} />
            </ActionIcon>
          </Group>

          <Group justify="center">
            <Anchor 
              href="https://github.com/toolworks-dev/trusty-notes" 
              target="_blank" 
              rel="noreferrer"
            >
              <ActionIcon variant="subtle">
                <IconBrandGithub size={20} />
              </ActionIcon>
            </Anchor>
          </Group>

          <Anchor 
            href="https://raw.githubusercontent.com/toolworks-dev/trusty-notes/refs/heads/main/PRIVACY.md"
            target="_blank"
            rel="noreferrer"
            size="sm"
            c="dimmed"
            style={{ textAlign: 'center' }}
          >
            Privacy Policy
          </Anchor>
        </Stack>
      </Stack>
    </Drawer>
  );
}