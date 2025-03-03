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
  IconNotes,
  IconCheck,
} from '@tabler/icons-react';
import { useDebouncedCallback, useMediaQuery } from '@mantine/hooks';
import { MobileNav } from './components/MobileNav';
import { notifications } from '@mantine/notifications';
import { NoteEditor } from './components/NoteEditor';
import { SyncSettings } from './components/SyncSettings';
import { useAutoSync } from './hooks/useAutoSync';
import { SyncSettings as SyncSettingsType, Note } from './types/sync';
import { WebStorageService } from './services/webStorage';
import './styles/richtext.css';
import './styles/editor-overrides.css';

const isElectron = !!window.electron;
const logoPath = isElectron ? './trusty.jpg' : '/trusty.jpg';

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
  const [ignoreNextSave, setIgnoreNextSave] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
        const decodedNote = decodeURIComponent(loadNoteParam);
        const noteToLoad = JSON.parse(decodedNote);
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
      await syncIfNeeded();
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

  useEffect(() => {
    if (selectedNote) {
      setSelectedNote({
        ...selectedNote,
        title: title.trim() === '' ? 'Untitled' : title
      });
    }
  }, [title]);

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
    
    // Force layout recalculation
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      // Force redraw of the main content area to fix sidebar overlap
      const mainContent = document.querySelector('.mantine-AppShell-main');
      if (mainContent) {
        // Trigger reflow
        mainContent.classList.add('force-redraw');
        
        // Apply explicit width calculation to fix overlap
        const navbarWidth = document.querySelector('.mantine-AppShell-navbar')?.clientWidth || 300;
        const mainContentHtml = mainContent as HTMLElement;
        
        // Add a permanent class to fix the layout
        document.body.classList.add('fixed-layout');
        mainContentHtml.style.width = `calc(100% - ${navbarWidth}px)`;
        mainContentHtml.style.marginLeft = `${navbarWidth}px`;
        
        // Just remove the animation class after transition
        setTimeout(() => {
          mainContentHtml.classList.remove('force-redraw');
        }, 300);
      }
    }, 50);
  }

  function clearForm() {
    const newNoteId = Date.now();
    setSelectedNote({ 
      id: newNoteId,
      title: 'Untitled',
      content: '',
      created_at: newNoteId,
      updated_at: newNoteId
    });
    setTitle('Untitled');
    setContent('');
  }
  
  useEffect(() => {
    WebStorageService.getSyncSettings().then(setSyncSettings);
  }, []);

  useEffect(() => {
    const initMobile = async () => {
      if (isMobile) {
        if (/android/i.test(navigator.userAgent)) {
          const { initializeAndroidApp } = await import('./services/androidInit');
          await initializeAndroidApp();
        } else {
          const { initializeMobileApp } = await import('./services/mobileInit');
          await initializeMobileApp();
        }
      }
    };
    
    initMobile();
  }, [isMobile]);

  useAutoSync(
    syncSettings?.auto_sync ?? false,
    syncSettings?.sync_interval ?? 5
  );

  useEffect(() => {
    if (window.electron?.updates) {
      console.log('Setting up update listener in App.tsx');
      window.electron.updates.onUpdateAvailable((info) => {
        console.log('Received update notification in App.tsx:', info);
        notifications.show({
          id: 'update-notification',
          title: 'Update Available',
          message: `Version ${info.version} is available. Click to download.`,
          color: 'blue',
          autoClose: false,
          withCloseButton: true,
          withBorder: true,
          radius: "md",
          icon: '🔄',
          styles: {
            root: {
              backgroundColor: 'var(--mantine-color-blue-light)',
              borderColor: 'var(--mantine-color-blue-filled)',
            },
            title: {
              fontWeight: 600,
            },
          },
          onClick: () => {
            console.log('Opening release URL:', info.releaseUrl);
            window.electron?.updates.openReleasePage(info.releaseUrl);
          }
        });
      });
    } else {
      console.log('Electron updates API not available');
    }
  }, []);

  const handleSave = async () => {
    try {
      const now = Date.now();
      const noteToSave = {
        id: selectedNote?.id,
        title: title.trim() === '' ? 'Untitled' : title,
        content,
        created_at: selectedNote?.created_at || now,
        updated_at: now
      };

      await WebStorageService.saveNote(noteToSave);
      await loadNotes();
      
      if (!selectedNote) {
        const updatedNotes = await WebStorageService.getNotes();
        const newNote = updatedNotes.find(note => 
          note.title === noteToSave.title && 
          note.content === noteToSave.content
        );
        if (newNote) {
          setSelectedNote(newNote);
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

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

  useEffect(() => {
    WebStorageService.initializeOfflineSupport();
    
    window.addEventListener('online', () => {
      notifications.show({
        title: 'Back Online',
        message: 'Your changes will be synced automatically.',
        color: 'green'
      });
    });

    window.addEventListener('offline', () => {
      notifications.show({
        title: 'Offline Mode',
        message: 'Changes will be saved locally and synced when online.',
        color: 'yellow'
      });
    });
  }, []);

  const syncIfNeeded = async () => {
    try {
      const settings = await WebStorageService.getSyncSettings();
      if (settings.server_url && settings.seed_phrase) {
        await WebStorageService.initializeCrypto(settings.seed_phrase);
        await WebStorageService.syncWithServer(settings.server_url);
      }
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  useEffect(() => {
    console.log("isMobile:", isMobile);
  }, [isMobile]);

  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);
    
    // Update CSS variable for navbar width
    document.documentElement.style.setProperty(
      '--mantine-navbar-width', 
      newCollapsedState ? '80px' : '300px'
    );
    
    // Force layout recalculation after sidebar state changes
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      // Update the main content width and margin based on new sidebar state
      const mainContent = document.querySelector('.mantine-AppShell-main');
      if (mainContent) {
        const navbarWidth = newCollapsedState ? 80 : 300;
        const mainContentHtml = mainContent as HTMLElement;
        mainContentHtml.style.width = `calc(100% - ${navbarWidth}px)`;
        mainContentHtml.style.marginLeft = `${navbarWidth}px`;
      }
    }, 50);
  };

  useEffect(() => {
    if (isMobile) {
      // Mobile-specific layout settings
      document.documentElement.style.setProperty('--mantine-navbar-width', '0px');
      document.body.classList.add('mobile-view');
      document.body.classList.remove('desktop-view');
      
      // Fix viewport height issues on mobile
      const setAppHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setAppHeight();
      window.addEventListener('resize', setAppHeight);
      
      return () => {
        window.removeEventListener('resize', setAppHeight);
      };
    } else {
      // Desktop-specific layout settings
      document.documentElement.style.setProperty(
        '--mantine-navbar-width', 
        sidebarCollapsed ? '80px' : '300px'
      );
      document.body.classList.add('desktop-view');
      document.body.classList.remove('mobile-view');
      
      // Apply initial layout for desktop
      const mainContent = document.querySelector('.mantine-AppShell-main');
      if (mainContent) {
        const navbarWidth = sidebarCollapsed ? 80 : 300;
        const mainContentHtml = mainContent as HTMLElement;
        mainContentHtml.style.width = `calc(100% - ${navbarWidth}px)`;
        mainContentHtml.style.marginLeft = `${navbarWidth}px`;
      }
    }
  }, [isMobile, sidebarCollapsed]);

  useEffect(() => {
    if (isMobile) {
      const handleResize = () => {
        const isKeyboard = window.innerHeight < window.outerHeight * 0.75;
        setIsKeyboardVisible(isKeyboard);
        document.body.classList.toggle('keyboard-visible', isKeyboard);
        
        // Update app height variable for mobile
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      };
      
      window.addEventListener('resize', handleResize);
      // Set initial value
      handleResize();
      
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  return (
    <AppShell
      className={sidebarCollapsed ? 'sidebar-collapsed' : ''}
      header={isMobile ? { height: 60 } : undefined}
      navbar={{
        width: isMobile ? 0 : (sidebarCollapsed ? 80 : 300),
        breakpoint: 'sm',
        collapsed: { mobile: true, desktop: false }
      }}
      padding="0"
      layout="default"
      styles={{
        main: {
          width: `calc(100% - ${isMobile ? 0 : (sidebarCollapsed ? 80 : 300)}px)`,
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 300),
          paddingLeft: 0,
          transition: 'margin-left 300ms ease, width 300ms ease'
        }
      }}
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
              <Image src={logoPath} alt="Logo" w={30} h={30} />
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
          selectedNote={selectedNote || undefined}
          notes={filteredNotes}
          onSelectNote={selectNote}
          onDeleteNote={deleteNote}
          isSelectionMode={isSelectionMode}
          selectedNotes={selectedNotes}
          onToggleSelectionMode={toggleSelectionMode}
          onToggleNoteSelection={toggleNoteSelection}
          onDeleteSelectedNotes={deleteSelectedNotes}
        />
      ) : (
        <AppShell.Navbar p="md">
          <Stack 
            h="100%" 
            gap="xs" 
            style={{ 
              overflow: 'hidden', 
              width: '100%'
            }}
          >
            <Group justify="space-between">
              <Group>
                <Image src={logoPath} alt="Logo" w={30} h={30} />
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
                        <IconCheck size={16} />
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
                    onClick={toggleSidebar}
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
                <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                  <Stack gap="xs">
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
                        <Group justify="apart" wrap="nowrap">
                          <Box style={{ overflow: 'hidden' }}>
                            <Text fw={500} lineClamp={1}>
                              {note.title || 'Untitled'}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={1}>
                              {format(note.updated_at, 'MMM d, yyyy HH:mm')}
                            </Text>
                          </Box>
                          {isSelectionMode ? (
                            <ActionIcon
                              variant={selectedNotes.has(note.id!) ? "filled" : "outline"}
                              color="blue"
                              onClick={(e) => toggleNoteSelection(note.id!, e)}
                              style={{ flexShrink: 0 }}
                            >
                              {selectedNotes.has(note.id!) && <IconCheck size={16} />}
                            </ActionIcon>
                          ) : (
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.id!);
                              }}
                              style={{ flexShrink: 0 }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
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
  
      <AppShell.Main style={{ 
        padding: 0, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isMobile ? (
          <Box className="mobile-content-container">
            {selectedNote ? (
              <NoteEditor 
                note={selectedNote}
                isMobile={true}
                isKeyboardVisible={isKeyboardVisible}
                onBack={() => setSelectedNote(null)}
                loadNotes={loadNotes}
              />
            ) : (
              <Stack p="md" gap="sm">
                <Group justify="apart" mb="md">
                  <TextInput
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    style={{ flex: 1 }}
                    leftSection={<IconSearch size={16} />}
                  />
                  <Group>
                    {filteredNotes.length > 0 && (
                      <ActionIcon
                        variant="light"
                        color={isSelectionMode ? "blue" : "gray"}
                        onClick={toggleSelectionMode}
                      >
                        <IconCheck size={20} />
                      </ActionIcon>
                    )}
                    <ActionIcon 
                      size="lg" 
                      color="blue" 
                      radius="xl"
                      onClick={clearForm}
                      className="mobile-fab"
                    >
                      <IconPlus size={24} />
                    </ActionIcon>
                  </Group>
                </Group>
                
                {isSelectionMode && selectedNotes.size > 0 && (
                  <Button
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={deleteSelectedNotes}
                    fullWidth
                    mb="md"
                  >
                    Delete Selected ({selectedNotes.size})
                  </Button>
                )}
                
                {filteredNotes.length > 0 ? (
                  <Stack gap="xs">
                    {filteredNotes.map(note => (
                      <Paper
                        key={note.id}
                        p="md"
                        withBorder
                        className="mobile-note-item"
                        onClick={() => selectNote(note)}
                      >
                        <Group justify="apart" wrap="nowrap">
                          <Box style={{ overflow: 'hidden' }}>
                            <Text fw={500} lineClamp={1}>
                              {note.title || 'Untitled'}
                            </Text>
                            <Text size="xs" color="dimmed" lineClamp={1}>
                              {format(note.updated_at, 'MMM d, yyyy HH:mm')}
                            </Text>
                          </Box>
                          {isSelectionMode ? (
                            <ActionIcon
                              variant={selectedNotes.has(note.id!) ? "filled" : "outline"}
                              color="blue"
                              onClick={(e) => toggleNoteSelection(note.id!, e)}
                            >
                              {selectedNotes.has(note.id!) && <IconCheck size={16} />}
                            </ActionIcon>
                          ) : (
                            <ActionIcon 
                              color="red" 
                              variant="subtle"
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
                ) : (
                  <Box py="xl" ta="center">
                    <IconNotes size={48} color={colorScheme === 'dark' ? 'gray.6' : 'gray.3'} stroke={1} />
                    <Text c="dimmed" mt="md">
                      No notes found
                    </Text>
                    <Button 
                      variant="light" 
                      mt="md" 
                      leftSection={<IconPlus size={16} />}
                      onClick={clearForm}
                    >
                      Create Your First Note
                    </Button>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        ) : (
          <Box p="md" style={{ 
            height: '100%', 
            overflow: 'auto', 
            display: 'flex', 
            flexDirection: 'column',
            flex: '1 1 auto'
          }}>
            {selectedNote ? (
              <NoteEditor 
                note={selectedNote}
                isMobile={false}
                isKeyboardVisible={isKeyboardVisible}
                loadNotes={loadNotes}
              />
            ) : (
              <Box py="xl" ta="center">
                <IconNotes size={64} color={colorScheme === 'dark' ? 'gray.6' : 'gray.3'} stroke={1} />
                <Text size="xl" c="dimmed" mt="md">
                  Select a note or create a new one
                </Text>
              </Box>
            )}
          </Box>
        )}
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