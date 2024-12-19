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

function isBrowserExtensionEnvironment(): boolean {
  return typeof chrome !== 'undefined' && 
         typeof chrome.runtime !== 'undefined' && 
         typeof chrome.runtime.sendMessage !== 'undefined';
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
  const [ignoreNextSave, setIgnoreNextSave] = useState(false);



  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    window.addEventListener('open-sync-settings', () => {
      setShowSyncSettings(true);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('openSync') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      setShowSyncSettings(true);
    }

    return () => {
      window.removeEventListener('open-sync-settings', () => {
        setShowSyncSettings(true);
      });
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadNoteParam = params.get('loadNote');
    const autoload = params.get('autoload');
    
    if (loadNoteParam && autoload === 'true') {
      try {
        const noteToLoad = JSON.parse(loadNoteParam);
        setSelectedNote(noteToLoad);
        setTitle(noteToLoad.title);
        setContent(noteToLoad.content);
        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        console.error('Failed to parse note from URL:', error);
      }
    }
  }, []);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadNotes = async () => {
    try {
      const notes = await WebStorageService.getNotes();
      setNotes(notes);
      await notifyExtension(notes);
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
    if (ignoreNextSave) {
      setIgnoreNextSave(false);
      return;
    }

    if (title.trim() === '' && content.trim() === '') return;
    try {
      await handleSave();
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, 1000);

  useEffect(() => {
    if (title || content) {
      debouncedSave();
    }
  }, [title, content]);

  useEffect(() => {
    if (!isMobile) return;

    const handleKeyboardEvent = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowUp' || 
        event.key === 'ArrowDown' || 
        event.key === 'ArrowLeft' || 
        event.key === 'ArrowRight' ||
        event.key === 'Enter'
      ) {
        setIgnoreNextSave(true);
      }
    };

    window.addEventListener('keydown', handleKeyboardEvent);
    return () => window.removeEventListener('keydown', handleKeyboardEvent);
  }, [isMobile]);

  function selectNote(note: Note) {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsNewNote(false);
  }

  function clearForm() {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setIsNewNote(true);
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
    
    const recentNote = notes.find(note => 
      note.title === title && 
      note.content === content && 
      now - note.updated_at < 2000
    );
    
    if (recentNote) {
      console.debug('Preventing duplicate save');
      return;
    }
    
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
  } catch (error) {
    console.error('Failed to save note:', error);
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

  async function notifyExtension(notes: Note[]) {
    if (isBrowserExtensionEnvironment()) {
      try {
        const runtime = chrome.runtime || browser.runtime;
        const settings = await WebStorageService.getSyncSettings();
        
        if (settings?.seed_phrase) {
          runtime.sendMessage(
            'trusty-notes@toolworks.dev',
            {
              type: 'SYNC_SETTINGS_UPDATED',
              settings: {
                seed_phrase: settings.seed_phrase
              }
            }
          );
        }

        runtime.sendMessage(
          'trusty-notes@toolworks.dev',
          {
            type: 'NOTES_UPDATED',
            notes: notes.map(note => ({
              id: note.id,
              title: note.title,
              content: note.content,
              created_at: note.created_at,
              updated_at: note.updated_at
            }))
          }
        ).catch(error => {
          console.debug('Extension communication failed:', error);
        });
      } catch (error) {
        console.debug('Browser extension not available:', error);
      }
    }
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
              <Anchor href="https://github.com/toolworks-dev/trusty-notes" target="_blank" rel="noreferrer">
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
              <Text size="lg" fw={500}>TrustyNotes</Text>
              <Tooltip label="GitHub">
                <Anchor href="https://github.com/toolworks-dev/trusty-notes" target="_blank" rel="noreferrer">
                  <ActionIcon variant="default" size={30}>
                    <IconBrandGithub size={16} />
                  </ActionIcon>
                </Anchor>
              </Tooltip>
              <Tooltip label="Privacy Policy">
                <Anchor 
                  href="https://raw.githubusercontent.com/toolworks-dev/trusty-notes/refs/heads/main/PRIVACY.md" 
                  target="_blank" 
                  rel="noreferrer"
                  size="sm"
                  c="dimmed"
                >
                  Privacy Policy
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
        <Stack h="100vh" gap={0} style={{ overflow: 'hidden' }}>
          {isMobile && (
            <Box 
              p="xs" 
              style={{ 
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backgroundColor: 'var(--mantine-color-body)'
              }}
            >
              <TextInput
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                size="sm"
                style={{ flex: 1 }}
              />
            </Box>
          )}
          <Box 
            style={{ 
              flex: 1, 
              position: 'relative', 
              height: isMobile ? 'calc(100vh - 60px)' : '100%',
              overflow: 'hidden'
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