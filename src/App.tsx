import { useState, useEffect } from 'react';
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
  Burger,
  Anchor,
  Image,
  Checkbox,
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
  IconBrandGithub,
  IconCheckbox,
} from '@tabler/icons-react';
import { useDebouncedCallback, useMediaQuery } from '@mantine/hooks';
import { MarkdownEditor } from './components/MarkdownEditor';
import { SyncSettings } from './components/SyncSettings';
import { useAutoSync } from './hooks/useAutoSync';
import { SyncSettings as SyncSettingsType } from './types/sync';
import { WebStorageService } from './services/webStorage';
import './styles/richtext.css';
import { MobileNav } from './components/MobileNav';

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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileNavOpened, setMobileNavOpened] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isNewNote, setIsNewNote] = useState(false);



  useEffect(() => {
    loadNotes();
  }, []);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadNotes = async () => {
    try {
      const notes = await WebStorageService.getNotes();
      setNotes(notes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedNotes(new Set());
    }
  };
  
  const toggleNoteSelection = (noteId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelection = new Set(selectedNotes);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNotes(newSelection);
  };
  
  const deleteSelectedNotes = async () => {
    if (selectedNotes.size === 0) return;
    
    try {
      await WebStorageService.deleteNote(Array.from(selectedNotes));
      setSelectedNotes(new Set());
      setIsSelectionMode(false);
      if (selectedNote && selectedNotes.has(selectedNote.id!)) {
        clearForm();
      }
      await loadNotes();
    } catch (error) {
      console.error('Failed to delete notes:', error);
      alert('Failed to delete notes');
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
    setIsNewNote(false);
    setSaveStatus(null);
  }

  function clearForm() {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setIsNewNote(true);
    setSaveStatus(null);
  }
  
  useEffect(() => {
    WebStorageService.getSyncSettings().then(setSyncSettings);
  }, []);

  useEffect(() => {
    const initMobile = async () => {
      if (isMobile) {
        const { initializeMobileApp } = await import('./services/mobileInit');
        await initializeMobileApp();
      }
    };
    
    initMobile();
  }, [isMobile]);

  useAutoSync(
    syncSettings?.auto_sync ?? false,
    syncSettings?.sync_interval ?? 5
  );

async function handleSave() {
  try {
    const now = Date.now();
    
    const noteId = selectedNote?.id || (isNewNote ? now : undefined);
    
    const note: Note = {
      id: noteId,
      title: title.trim() === '' ? 'Untitled' : title,
      content,
      created_at: selectedNote?.created_at || now,
      updated_at: now,
    };

    await WebStorageService.saveNote(note);
    
    if (isNewNote) {
      setSelectedNote(note);
      setIsNewNote(false);
    }
    
    await loadNotes();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(null), 2000);
  } catch (error) {
    console.error('Failed to save note:', error);
    setSaveStatus(null);
    alert(`Failed to save note: ${error}`);
  }
}

async function deleteNote(noteId: number) {
  if (!window.confirm('Are you sure you want to delete this note?')) return;
  try {
    await WebStorageService.deleteNote(noteId);
    if (selectedNote?.id === noteId) {
      clearForm();
    }
    await loadNotes();
  } catch (error) {
    console.error('Failed to delete note:', error);
    alert('Failed to delete note');
  }
}

  async function exportNotes() {
    const notes = await WebStorageService.getNotes();
    const blob = new Blob([JSON.stringify(notes)], { type: 'application/json' });
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
        const notes = JSON.parse(content);
        for (const note of notes) {
          await WebStorageService.saveNote(note);
        }
        await loadNotes();
      };
      reader.readAsText(file);
    };
    input.click();
  }
  return (
    <AppShell
      header={isMobile ? { height: 60 } : undefined}
      navbar={{
        width: isMobile ? 0 : (sidebarCollapsed ? 80 : 300),
        breakpoint: 'sm',
        collapsed: { mobile: true }
      }}
      padding="0"
    >
      {isMobile && (
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger
                opened={mobileNavOpened}
                onClick={() => setMobileNavOpened(o => !o)}
                hiddenFrom="sm"
                size="sm"
              />
              <Image src="/trusty.jpg" alt="Logo" w={30} h={30} />
            </Group>
            <TextInput
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Group>
              <Anchor href="https://github.com/toolworks-dev/trusty-notes" target="_blank">
                <ActionIcon variant="subtle">
                  <IconBrandGithub size={20} />
                </ActionIcon>
              </Anchor>
              <ActionIcon variant="subtle" onClick={clearForm}>
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>
      )}
  
      {isMobile ? (
        <MobileNav
          opened={mobileNavOpened}
          onClose={() => setMobileNavOpened(false)}
          onNewNote={clearForm}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
          onToggleTheme={toggleColorScheme}
          colorScheme={colorScheme}
          onShowSyncSettings={() => setShowSyncSettings(true)}
          onExport={exportNotes}
          onImport={importNotes}
          selectedNote={selectedNote}
          notes={filteredNotes}
          onSelectNote={selectNote}
          onDeleteNote={deleteNote}
        />
      ) : (
        <AppShell.Navbar p="md">
          <Stack h="100%" gap="sm">
          <Group justify="space-between">
            <Group>
              <Image src="/trusty.jpg" alt="Logo" w={30} h={30} />
              <Text size="lg" fw={500}>Trusty Notes</Text>
              <Tooltip label="GitHub">
                <Anchor href="https://github.com/toolworks-dev/trusty-notes" target="_blank">
                  <ActionIcon variant="default" size={30}>
                    <IconBrandGithub size={16} />
                  </ActionIcon>
                </Anchor>
              </Tooltip>
            </Group>
            <Group>
              {!sidebarCollapsed && (
                  <>
                    <Tooltip label="Selection Mode">
                      <ActionIcon
                        variant="default"
                        onClick={toggleSelectionMode}
                        color={isSelectionMode ? "blue" : undefined}
                        size={30}
                      >
                        <IconCheckbox size={16} />
                      </ActionIcon>
                    </Tooltip>
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
                <Group>
                  <Button
                    leftSection={<IconPlus size={14} />}
                    variant="light"
                    onClick={clearForm}
                    style={{ flex: 1 }}
                  >
                    New Note
                  </Button>
                  {isSelectionMode && selectedNotes.size > 0 && (
                    <Button
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={deleteSelectedNotes}
                    >
                      Delete ({selectedNotes.size})
                    </Button>
                  )}
                </Group>
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
                      onClick={() => !isSelectionMode && selectNote(note)}
                      style={{
                        cursor: isSelectionMode ? 'default' : 'pointer',
                        backgroundColor: (selectedNote?.id === note.id || selectedNotes.has(note.id!)) ? 
                          'var(--mantine-color-blue-light)' : undefined,
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group style={{ flex: 1 }}>
                          {isSelectionMode && (
                            <Checkbox
                              checked={selectedNotes.has(note.id!)}
                              onChange={(e) => toggleNoteSelection(note.id!, e as any)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <Box>
                            <Text fw={500} truncate="end">
                              {note.title || 'Untitled'}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {format(note.updated_at, 'MMM d, yyyy HH:mm')}
                            </Text>
                          </Box>
                        </Group>
                        {!isSelectionMode && (
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
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}
          {sidebarCollapsed && (
            <Stack 
              gap={0}
              align="center" 
              style={{ 
                flex: 1,
                paddingTop: 'var(--mantine-spacing-md)',
                '& > *:not(:last-child)': { marginBottom: 'var(--mantine-spacing-md)' }
              }}
            >
            </Stack>
          )}
          </Stack>
        </AppShell.Navbar>
      )}
  
      <AppShell.Main>
        <Stack h="100vh" gap={0}>
          {!isMobile && (
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
          )}
          <Box 
            style={{ 
              flex: 1, 
              position: 'relative', 
              minHeight: 0, 
              padding: isMobile ? '0.5rem' : '1rem',
              paddingTop: isMobile ? '0.5rem' : '1rem'
            }}
          >
            <MarkdownEditor
              content={content}
              onChange={setContent}
              isMobile={isMobile}
              defaultView="edit"
              editorType="richtext"
            />
          </Box>
        </Stack>
      </AppShell.Main>
  
      <Modal
        opened={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
        title="Sync Settings"
        size="lg"
        fullScreen={isMobile}
      >
        <SyncSettings onSync={loadNotes} />
      </Modal>
    </AppShell>
  );
}

export default App;