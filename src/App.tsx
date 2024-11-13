import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import {
  AppShell,
  Button,
  Text,
  Paper,
  TextInput,
  Stack,
  Group,
  ActionIcon,
  useMantineColorScheme,
  Box,
  Tooltip,
  Modal,
} from '@mantine/core';
import { 
  IconSun, 
  IconMoon, 
  IconPlus, 
  IconCheck, 
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconDownload,
  IconUpload,
  IconCloud,
} from '@tabler/icons-react';
import { useDebouncedCallback } from '@mantine/hooks';
import { MarkdownEditor } from './components/MarkdownEditor';
import { SyncSettings } from './components/SyncSettings';
import { useAutoSync } from './hooks/useAutoSync';
import { SyncSettings as SyncSettingsType } from './types/sync';

interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettingsType | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadNotes = async () => {
    try {
      const notesJson = await invoke<string>('get_notes_json');
      setNotes(JSON.parse(notesJson));
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const debouncedSave = useDebouncedCallback(async () => {
    if (title.trim() === '' && content.trim() === '') return;
    setSaveStatus('saving');
    try {
      await handleSave();
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus(null);
    }
  }, 1000);

  useEffect(() => {
    if (title || content) {
      debouncedSave();
    }
  }, [title, content]);

  function selectNote(note: Note) {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
  }

  function clearForm() {
    setSelectedNote(null);
    setTitle('');
    setContent('');
  }

  useEffect(() => {
    invoke<SyncSettingsType>('get_sync_settings').then(setSyncSettings);
  }, []);
  
  useAutoSync(
    syncSettings?.auto_sync ?? false,
    syncSettings?.sync_interval ?? 5
  );

async function handleSave() {
  try {
    const now = Date.now();
    const note: Note = {
      id: selectedNote?.id,
      title: title.trim() === '' ? 'Untitled' : title,
      content,
      created_at: selectedNote?.created_at || now,
      updated_at: now,
    };
    
    console.log('Attempting to save note:', note);
    await invoke('save_note', { note });
    console.log('Save completed');
    
    await loadNotes();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  } catch (error) {
    console.error('Failed to save note:', error);
    setSaveStatus(null);
    // Add user feedback
    alert(`Failed to save note: ${error}`);
  }
}

  async function deleteNote(noteId: number) {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    await invoke('delete_note', { noteId });
    if (selectedNote?.id === noteId) {
      clearForm();
    }
    await loadNotes();
  }

  async function exportNotes() {
    const notesJson = await invoke<string>('export_notes');
    const blob = new Blob([notesJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function importNotes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await invoke('import_notes', { notesJson: content });
        await loadNotes();
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
      <AppShell
        navbar={{
          width: sidebarCollapsed ? 80 : 300,
          breakpoint: 'sm',
          collapsed: { mobile: sidebarCollapsed }
        }}
        padding="0"
      >
        <AppShell.Navbar p="md">
          <Stack h="100%" gap="sm">
            <Group justify="space-between">
              <Text size="lg" fw={500}>Notes</Text>
              <Group>
                {!sidebarCollapsed && (
                  <>
                    <Tooltip label="Sync Settings">
                      <ActionIcon variant="default" onClick={() => setShowSyncSettings(true)} size={30}>
                        <IconCloud size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Toggle Theme">
                      <ActionIcon variant="default" onClick={() => toggleColorScheme()} size={30}>
                        {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Export Notes">
                      <ActionIcon variant="default" onClick={exportNotes} size={30}>
                        <IconDownload size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Import Notes">
                      <ActionIcon variant="default" onClick={importNotes} size={30}>
                        <IconUpload size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
                <Tooltip label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                  <ActionIcon
                    variant="default"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    size={30}
                  >
                    {sidebarCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
  
            {!sidebarCollapsed && (
              <>
                <Button
                  leftSection={<IconPlus size={14} />}
                  variant="light"
                  onClick={clearForm}
                  fullWidth
                >
                  New Note
                </Button>
                <TextInput
                  placeholder="Search notes..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Stack gap="xs" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                  {filteredNotes.map((note) => (
                    <Paper
                      key={note.id}
                      shadow="xs"
                      p="md"
                      onClick={() => selectNote(note)}
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
                            deleteNote(note.id!);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}
            {sidebarCollapsed && (
              <Stack gap="xs" align="center">
                <Tooltip label="New Note" position="right">
                  <ActionIcon variant="light" onClick={clearForm} size="lg">
                    <IconPlus size={20} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Toggle Theme" position="right">
                  <ActionIcon variant="light" onClick={() => toggleColorScheme()} size="lg">
                    {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                  </ActionIcon>
                </Tooltip>
              </Stack>
            )}
          </Stack>
        </AppShell.Navbar>
  
        <AppShell.Main>
          <Stack h="100vh" gap={0}>
            <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <Group justify="space-between" align="center">
                <TextInput
                  placeholder="Note title"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  size="lg"
                  style={{ flex: 1 }}
                />
                <Group>
                  {saveStatus && (
                    <Group gap="xs">
                      <IconCheck size={16} style={{ color: 'var(--mantine-color-green-6)' }} />
                      <Text size="sm" c="dimmed">
                        {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                      </Text>
                    </Group>
                  )}
                  <Button variant="light" onClick={clearForm}>
                    New Note
                  </Button>
                </Group>
              </Group>
            </Box>
            <Box style={{ flex: 1, position: 'relative', minHeight: 0, padding: '1rem' }}>
              <MarkdownEditor
                content={content}
                onChange={setContent}
              />
            </Box>
          </Stack>
        </AppShell.Main>
  
        <Modal
          opened={showSyncSettings}
          onClose={() => setShowSyncSettings(false)}
          title="Sync Settings"
          size="lg"
        >
            <SyncSettings onSync={loadNotes} />
        </Modal>
      </AppShell>
    );
}

export default App;