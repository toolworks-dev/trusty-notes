import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Drawer, 
  Stack, 
  Group, 
  Text, 
  ActionIcon, 
  TextInput, 
  Box, 
  Paper,
  Avatar,
  Anchor,
  Divider,
  useMantineTheme,
  Button
} from '@mantine/core';
import { 
  IconPlus, 
  IconSearch, 
  IconMoon, 
  IconSun, 
  IconTrash,
  IconCloud, 
  IconDownload, 
  IconUpload, 
  IconBrandGithub,
  IconWifiOff,
  IconX,
  IconNotes,
  IconChevronRight,
  IconCheck
} from '@tabler/icons-react';
import { Note } from '../types/sync';

interface MobileNavProps {
  opened: boolean;
  onClose: () => void;
  onNewNote: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  onToggleTheme: () => void;
  colorScheme: string;
  onShowSyncSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  selectedNote?: Note;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: number) => void;
  isSelectionMode: boolean;
  selectedNotes: Set<number>;
  onToggleSelectionMode: () => void;
  onToggleNoteSelection: (noteId: number, event: React.MouseEvent) => void;
  onDeleteSelectedNotes: () => void;
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
  onDeleteNote,
  isSelectionMode,
  selectedNotes,
  onToggleSelectionMode,
  onToggleNoteSelection,
  onDeleteSelectedNotes
}: MobileNavProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const theme = useMantineTheme();

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

  const handleShowSyncSettings = () => {
    console.log("[MobileNav] handleShowSyncSettings called");
    onClose();
    console.log("[MobileNav] after onClose, calling onShowSyncSettings prop");
    onShowSyncSettings();
  };

  const formatNoteDatetime = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy • HH:mm');
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="100%"
      position="left"
      withCloseButton={false}
      withOverlay={false}
      closeOnClickOutside={false}
      closeOnEscape={true}
      trapFocus={false}
      classNames={{
        content: 'mobile-drawer-content'
      }}
      styles={{
        content: {
          border: 'none',
          borderTop: 'none',
          borderRadius: 0
        }
      }}
    >
      <Stack h="100%" gap={0} onClick={(e) => e.stopPropagation()}>
        <Group p="md" className="mobile-nav-header" justify="space-between">
          <Group>
            <Avatar radius="xl" src="/trusty.jpg" alt="TrustyNotes Logo" />
            <div>
              <Text size="lg" fw={600}>TrustyNotes</Text>
              <Text size="xs" c="dimmed">Secure your thoughts</Text>
            </div>
          </Group>
          <Group align="center" gap="sm">
            {notes.length > 0 && (
              <ActionIcon 
                size="md"
                variant={isSelectionMode ? "filled" : "subtle"} 
                color={isSelectionMode ? "blue" : "gray"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectionMode();
                }}
                radius="xl"
              >
                <IconCheck size={18} />
              </ActionIcon>
            )}
            <ActionIcon variant="subtle" onClick={onClose} radius="xl" size="md">
              <IconX size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Box p="md">
          <Button
            leftSection={<IconPlus size={16} />}
            fullWidth
            radius="md"
            onClick={(e) => {
              e.stopPropagation();
              onNewNote();
              onClose();
            }}
          >
            New Note
          </Button>
        </Box>

        <Box px="md">
          <TextInput
            placeholder="     Search notes..."
            value={searchQuery}
            onChange={(e) => {
              e.stopPropagation();
              onSearch(e.currentTarget.value);
            }}
            onClick={(e) => e.stopPropagation()}
            leftSection={<IconSearch size={16} />}
            radius="md"
            size="md"
          />
        </Box>

        {!isOnline && (
          <Paper p="xs" mx="md" mt="md" withBorder radius="md" bg="yellow.0">
            <Group>
              <IconWifiOff size={16} color={theme.colors.yellow[7]} />
              <Text size="sm" c="yellow.7">
                Offline Mode
              </Text>
            </Group>
          </Paper>
        )}

        {isSelectionMode && selectedNotes.size > 0 && (
          <Box p="md">
            <Button
              leftSection={<IconTrash size={16} />}
              fullWidth
              radius="md"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSelectedNotes();
              }}
            >
              Delete Selected ({selectedNotes.size})
            </Button>
          </Box>
        )}

        <Box style={{ flex: 1, overflowY: 'auto' }} p="md">          
          <Stack gap="xs">
            {notes.length > 0 ? (
              notes.map((note) => (
                <Paper
                  key={note.id}
                  shadow="sm"
                  p="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNoteSelect(note);
                  }}
                  className="mobile-note-item"
                  withBorder
                  style={{
                    borderLeft: selectedNote?.id === note.id ? 
                      `4px solid ${theme.colors.blue[6]}` : undefined,
                    cursor: 'pointer'
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={500} truncate="end">
                        {note.title || 'Untitled'}
                      </Text>
                      <Text size="xs" c="dimmed" truncate="end">
                        {formatNoteDatetime(note.updated_at)}
                      </Text>
                    </Box>
                    <Group gap="xs">
                      {isSelectionMode ? (
                        <ActionIcon
                          variant={selectedNotes.has(note.id!) ? "filled" : "outline"}
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleNoteSelection(note.id!, e);
                          }}
                          radius="xl"
                        >
                          {selectedNotes.has(note.id!) && <IconCheck size={16} />}
                        </ActionIcon>
                      ) : (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id!);
                          }}
                          radius="xl"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                      <IconChevronRight size={16} color={theme.colors.gray[5]} />
                    </Group>
                  </Group>
                </Paper>
              ))
            ) : (
              <Box py="xl" ta="center">
                <IconNotes size={48} color={theme.colors.gray[3]} stroke={1} />
                <Text c="dimmed" mt="md">
                  No notes found
                </Text>
                <Button 
                  variant="light" 
                  mt="md" 
                  leftSection={<IconPlus size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewNote();
                    onClose();
                  }}
                >
                  Create Your First Note
                </Button>
              </Box>
            )}
          </Stack>
        </Box>

        <Divider />
        
        <Group grow p="md" className="mobile-nav-footer">
          <ActionIcon 
            variant="light" 
            onClick={(e) => {
              console.log("[MobileNav] Theme toggle button clicked");
              e.stopPropagation();
              onToggleTheme();
            }} 
            size="lg"
            radius="md"
          >
            {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
          <ActionIcon 
            variant="light" 
            onClick={(e) => {
              e.stopPropagation();
              handleShowSyncSettings();
            }} 
            size="lg"
            radius="md"
            disabled={!isOnline}
          >
            <IconCloud size={20} />
          </ActionIcon>
          <ActionIcon 
            variant="light" 
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }} 
            size="lg"
            radius="md"
          >
            <IconDownload size={20} />
          </ActionIcon>
          <ActionIcon 
            variant="light" 
            onClick={(e) => {
              e.stopPropagation();
              onImport();
            }} 
            size="lg"
            radius="md"
          >
            <IconUpload size={20} />
          </ActionIcon>
        </Group>

        <Group justify="center" p="xs" pb="md">
          <Text size="xs" c="dimmed">© 2025 Toolworks.dev</Text>
          <Anchor 
            href="https://github.com/toolworks-dev/trusty-notes" 
            target="_blank" 
            rel="noreferrer"
            size="xs"
            c="dimmed"
            onClick={(e) => e.stopPropagation()}
          >
            <Group gap={4}>
              <IconBrandGithub size={14} />
              <Text>GitHub</Text>
            </Group>
          </Anchor>
          <Anchor 
            href="https://raw.githubusercontent.com/toolworks-dev/trusty-notes/refs/heads/main/PRIVACY.md"
            target="_blank"
            rel="noreferrer"
            size="xs"
            c="dimmed"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy
          </Anchor>
        </Group>
      </Stack>
    </Drawer>
  );
}