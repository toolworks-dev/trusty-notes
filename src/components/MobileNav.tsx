import { Group, ActionIcon, Drawer, Stack, Button, TextInput, Box, Text, Paper, Image, MantineColorScheme } from '@mantine/core';
import { 
  IconPlus, 
  IconSearch,
  IconSun,
  IconMoon,
  IconCloud,
  IconDownload,
  IconUpload,
  IconBrandGithub,
  IconTrash
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
  const isDark = colorScheme === 'dark' || (colorScheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="100%"
      padding="md"
      title={
        <Group>
          <Image src="/trusty.jpg" alt="Logo" w={30} h={30} />
          <Text size="lg" fw={500}>Trusty Notes</Text>
        </Group>
      }
    >
      <Stack h="100%" gap="md">
        <TextInput
          placeholder="Search notes..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => onSearch(e.currentTarget.value)}
        />

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            onNewNote();
            onClose();
          }}
          fullWidth
        >
          New Note
        </Button>

        <Box style={{ flex: 1, overflowY: 'auto' }}>
          <Stack gap="xs">
            {notes.map((note) => (
              <Paper
                key={note.id}
                shadow="xs"
                p="md"
                onClick={() => {
                  onSelectNote(note);
                  onClose();
                }}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedNote?.id === note.id ? 
                    'var(--mantine-color-blue-light)' : undefined,
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1 }}>
                    <Text fw={500} truncate="end">
                      {note.title || 'Untitled'}
                    </Text>
                    <Text size="xs" c="dimmed">
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
          <Button
            variant="light"
            leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
            onClick={onToggleTheme}
            fullWidth
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>

          <Button
            variant="light"
            leftSection={<IconCloud size={16} />}
            onClick={() => {
              onShowSyncSettings();
              onClose();
            }}
            fullWidth
          >
            Sync Settings
          </Button>

          <Group grow>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={onExport}
            >
              Export
            </Button>
            <Button
              variant="light"
              leftSection={<IconUpload size={16} />}
              onClick={onImport}
            >
              Import
            </Button>
          </Group>

          <Button
            variant="subtle"
            leftSection={<IconBrandGithub size={16} />}
            component="a"
            href="https://github.com/toolworks-dev/trusty-notes"
            target="_blank"
            fullWidth
          >
            GitHub
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}