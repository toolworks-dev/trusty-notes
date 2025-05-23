import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  AppShell,
  Button,
  Text,
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
  Paper,
  Badge,
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
  IconShieldLock,
  IconLock,
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
import './styles/modern-design.css';
import './styles/mobile.css';

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

  const isNoteSelected = (note: Note): boolean => {
    return selectedNote?.id !== undefined && note.id !== undefined && selectedNote.id === note.id;
  };

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
  
  const handleDeleteSelectedNotes = async () => {
    if (selectedNotes.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedNotes.size} selected notes?`)) {
      return;
    }
    
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

  const handleDeleteNote = async (noteId: number) => {
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
  };

  // Utility function to strip HTML tags
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Format note date and time
  const formatNoteDatetime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  // Get encryption badge for a note
  const getEncryptionBadge = (note: Note) => {
    if (note?.encryptionType === 2) {
      return (
        <Badge 
          color="green" 
          size="xs" 
          radius="md" 
          variant="light"
          leftSection={<IconShieldLock size={10} />}
        >
          PQ
        </Badge>
      );
    } else if (note?.encryptionType === 1) {
      return (
        <Badge 
          color="blue" 
          size="xs" 
          radius="md" 
          variant="light"
          leftSection={<IconLock size={10} />}
        >
          AES
        </Badge>
      );
    }
    return null;
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
      
      const mainContent = document.querySelector('.mantine-AppShell-main') as HTMLElement | null;

      if (!isMobile) {
        if (mainContent) {
          mainContent.classList.add('force-redraw');
          // Use the sidebarCollapsed state to determine width, consistent with AppShell styles
          const desktopNavbarWidth = sidebarCollapsed ? 80 : 300;
          
          document.body.classList.add('fixed-layout');
          mainContent.style.width = `calc(100% - ${desktopNavbarWidth}px)`;
          mainContent.style.marginLeft = `${desktopNavbarWidth}px`;

          setTimeout(() => {
            mainContent.classList.remove('force-redraw');
          }, 300);
        }
      } else {
        // On mobile, ensure proper layout by removing potentially problematic desktop styles/classes
        document.body.classList.remove('fixed-layout');
        if (mainContent) {
          // Reset inline styles so AppShell's own dynamic styles can take full effect for mobile
          mainContent.style.width = ''; 
          mainContent.style.marginLeft = '';
        }
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
        
        // Force mobile layout
        document.body.style.height = '100vh';
        document.body.style.overflow = 'hidden';
      };
      
      setAppHeight();
      window.addEventListener('resize', setAppHeight);
      window.addEventListener('orientationchange', setAppHeight);
      
      // Additional mobile fixes
      setTimeout(() => {
        const appShell = document.querySelector('.mantine-AppShell-root') as HTMLElement;
        if (appShell) {
          appShell.style.height = '100vh';
          appShell.style.width = '100vw';
          appShell.style.overflow = 'hidden';
        }
      }, 100);
      
      return () => {
        window.removeEventListener('resize', setAppHeight);
        window.removeEventListener('orientationchange', setAppHeight);
      };
    } else {
      // Desktop-specific layout settings
      document.documentElement.style.setProperty(
        '--mantine-navbar-width', 
        sidebarCollapsed ? '80px' : '300px'
      );
      document.body.classList.add('desktop-view');
      document.body.classList.remove('mobile-view');
      document.body.style.height = '';
      document.body.style.overflow = '';
      
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
    if (isMobile && !selectedNote) {
      // Brief delay to allow UI to update before recalculating layout
      // setTimeout(() => {
      //   window.dispatchEvent(new Event('resize'));
      // }, 100);
    }
  }, [selectedNote, isMobile]);

  return (
    <AppShell
      className={`modern-app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
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
        <AppShell.Header 
          className="modern-header"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
            height: 'calc(60px + max(0px, env(safe-area-inset-top)))',
            zIndex: mobileNavOpened ? 100 : 1000
          }}
        >
          <Group h="100%" px="md" justify="space-between" align="center">
            <Group>
              <Burger
                opened={mobileNavOpened}
                onClick={() => setMobileNavOpened(o => !o)}
                hiddenFrom="sm"
                size="sm"
              />
              <Image src={logoPath} alt="Logo" w={30} h={30} />
              <Text size="lg" fw={600} c="var(--text-primary)">
                TrustyNotes
              </Text>
            </Group>
            <Group>
              {filteredNotes.length > 0 && !selectedNote && (
                <ActionIcon
                  variant={isSelectionMode ? "filled" : "subtle"}
                  color={isSelectionMode ? "blue" : "gray"}
                  onClick={toggleSelectionMode}
                  size="lg"
                  radius="xl"
                >
                  <IconCheck size={20} />
                </ActionIcon>
              )}
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
          onToggleTheme={() => {
            console.log("[App.tsx] onToggleTheme called");
            toggleColorScheme();
          }}
          colorScheme={colorScheme}
          onShowSyncSettings={() => {
            console.log("[App.tsx] onShowSyncSettings called");
            setShowSyncSettings(true);
          }}
          onExport={exportNotes}
          onImport={importNotes}
          selectedNote={selectedNote || undefined}
          notes={filteredNotes}
          onSelectNote={selectNote}
          onDeleteNote={handleDeleteNote}
          isSelectionMode={isSelectionMode}
          selectedNotes={selectedNotes}
          onToggleSelectionMode={toggleSelectionMode}
          onToggleNoteSelection={toggleNoteSelection}
          onDeleteSelectedNotes={handleDeleteSelectedNotes}
        />
      ) : (
        <AppShell.Navbar p="md" className={`modern-navbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Stack 
            h="100%" 
            gap="xs" 
            style={{ 
              overflow: 'hidden', 
              width: '100%'
            }}
          >
            <Group justify="space-between">
              {!sidebarCollapsed && (
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
              )}
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
                {!sidebarCollapsed && (
                  <Tooltip label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                    <ActionIcon
                      variant="default"
                      onClick={toggleSidebar}
                      size={30}
                    >
                      {sidebarCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
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
                      onClick={handleDeleteSelectedNotes}
                    >
                      Delete ({selectedNotes.size})
                    </Button>
                  )}
                </Group>
                <TextInput
                  placeholder="     Search notes..."
                  leftSection={<IconSearch size={16} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  className="modern-search-input"
                />
                <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="smooth-scroll">
                  <Stack gap="xs">
                    {filteredNotes.map((note: Note) => (
                      <div
                        key={note.id}
                        className={`modern-note-card ${isNoteSelected(note) ? 'selected' : ''}`}
                        onClick={() => selectNote(note)}
                      >
                        <Group justify="apart" wrap="nowrap">
                          <Box style={{ overflow: 'hidden', flex: 1 }}>
                            <div className="modern-note-title">
                              {note.title || 'Untitled'}
                            </div>
                            <div className="modern-note-date">
                              {format(note.updated_at, 'MMM d, yyyy HH:mm')}
                            </div>
                          </Box>
                          {isSelectionMode ? (
                            <ActionIcon
                              variant={selectedNotes.has(note.id!) ? "filled" : "outline"}
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleNoteSelection(note.id!, e);
                              }}
                              size="lg"
                              radius="xl"
                            >
                              {selectedNotes.has(note.id!) && <IconCheck size={16} />}
                            </ActionIcon>
                          ) : (
                            <ActionIcon 
                              color="red" 
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note.id!);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </div>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          {sidebarCollapsed && (
            <Stack 
              gap="md"
              align="center" 
              style={{ 
                flex: 1,
                paddingTop: 'var(--mantine-spacing-lg)',
                paddingBottom: 'var(--mantine-spacing-lg)',
                justifyContent: 'space-between'
              }}
            >
              {/* Top Section */}
              <Stack gap="md" align="center">
                <Image src={logoPath} alt="Logo" w={32} h={32} />
                
                <Tooltip label="New Note" position="right">
                  <ActionIcon
                    size={40}
                    variant="filled"
                    onClick={clearForm}
                    className="collapsed-action-button"
                  >
                    <IconPlus size={20} />
                  </ActionIcon>
                </Tooltip>
                
                <Tooltip label="Sync Settings" position="right">
                  <ActionIcon
                    size={36}
                    variant="subtle"
                    onClick={() => setShowSyncSettings(true)}
                    className="collapsed-action-button"
                  >
                    <IconCloud size={18} />
                  </ActionIcon>
                </Tooltip>
                
                <Tooltip label="Toggle Theme" position="right">
                  <ActionIcon
                    size={36}
                    variant="subtle"
                    onClick={() => toggleColorScheme()}
                    className="collapsed-action-button"
                  >
                    {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                  </ActionIcon>
                </Tooltip>
              </Stack>

              {/* Bottom Section */}
              <Stack gap="sm" align="center">
                <Tooltip label="GitHub" position="right">
                  <Anchor href="https://github.com/toolworks-dev/trusty-notes" target="_blank" rel="noreferrer">
                    <ActionIcon
                      size={32}
                      variant="subtle"
                      className="collapsed-action-button"
                    >
                      <IconBrandGithub size={16} />
                    </ActionIcon>
                  </Anchor>
                </Tooltip>
                
                <Tooltip label="Expand sidebar" position="right">
                  <ActionIcon
                    variant="subtle"
                    onClick={toggleSidebar}
                    size={36}
                    className="collapsed-action-button expand-button"
                  >
                    <IconChevronRight size={18} />
                  </ActionIcon>
                </Tooltip>
              </Stack>
            </Stack>
          )}
          </Stack>
        </AppShell.Navbar>
      )}
  
      <AppShell.Main style={{ 
        padding: 0, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flex: '1 1 auto'
      }}>
        {isMobile ? (
          <Box className="mobile-content-container" style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {selectedNote ? (
              <NoteEditor 
                note={selectedNote}
                isMobile={true}
                onBack={() => setSelectedNote(null)}
                loadNotes={loadNotes}
              />
            ) : (
              <>
                {/* Mobile Notes List Area */}
                <Box style={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right))',
                  paddingTop: 'max(1rem, env(safe-area-inset-top))',
                }}>
                  {/* Mobile Search */}
                  <Box className="mobile-search" style={{ 
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    paddingTop: '1rem',
                    marginBottom: '1.5rem' 
                  }}>
                    <TextInput
                      placeholder="Search your notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.currentTarget.value)}
                      leftSection={<IconSearch size={18} />}
                      size="lg"
                      radius="xl"
                      styles={{
                        input: {
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-primary)',
                          fontSize: '16px',
                          padding: '1rem 1.25rem',
                          paddingLeft: '4rem'
                        },
                        section: {
                          marginLeft: '1.25rem'
                        }
                      }}
                    />
                  </Box>

                  {filteredNotes.length > 0 ? (
                    <Stack gap="md" style={{ 
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      paddingBottom: 'calc(1rem + 80px + env(safe-area-inset-bottom))'
                    }}>
                      {filteredNotes.map((note: Note) => (
                        <Paper
                          key={note.id}
                          className="modern-note-card"
                          onClick={() => selectNote(note)}
                          p="lg"
                          radius="xl"
                          withBorder
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: 'var(--bg-secondary)',
                            border: isNoteSelected(note) ? 
                              '2px solid var(--primary-500)' : 
                              '1px solid var(--border-primary)',
                            position: 'relative'
                          }}
                        >
                          {isSelectionMode && (
                            <Box
                              style={{
                                position: 'absolute',
                                top: '1rem',
                                left: '1rem',
                                zIndex: 10
                              }}
                            >
                              <ActionIcon
                                variant={selectedNotes.has(note.id!) ? "filled" : "outline"}
                                color="blue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleNoteSelection(note.id!, e);
                                }}
                                size="lg"
                                radius="xl"
                              >
                                {selectedNotes.has(note.id!) && <IconCheck size={16} />}
                              </ActionIcon>
                            </Box>
                          )}
                          
                          <Box pl={isSelectionMode ? '3rem' : 0}>
                            <Group justify="space-between" align="flex-start" mb="xs">
                              <Text 
                                fw={600} 
                                size="lg"
                                lineClamp={2}
                                className="modern-note-title"
                                style={{ flex: 1 }}
                              >
                                {note.title || 'Untitled'}
                              </Text>
                              {!isSelectionMode && (
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNote(note.id!);
                                  }}
                                  size="sm"
                                  radius="xl"
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              )}
                            </Group>
                            
                            <Text 
                              size="sm" 
                              c="dimmed" 
                              lineClamp={3} 
                              className="modern-note-content"
                              mb="sm"
                            >
                              {stripHtml(note.content).substring(0, 120)}
                              {stripHtml(note.content).length > 120 ? '...' : ''}
                            </Text>
                            
                            <Group justify="space-between" align="center">
                              <Text size="xs" c="dimmed" className="modern-note-date">
                                {formatNoteDatetime(note.updated_at)}
                              </Text>
                              {getEncryptionBadge(note)}
                            </Group>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Box className="empty-state mobile-empty-state" style={{
                      paddingBottom: 'calc(1rem + 80px + env(safe-area-inset-bottom))'
                    }}>
                      <IconNotes size={80} className="empty-state-icon" stroke={1} />
                      <Text className="empty-state-title" size="xl" fw={700} mb="sm">
                        {searchQuery ? 'No notes found' : 'Start Writing'}
                      </Text>
                      <Text className="empty-state-description" size="md" c="dimmed" mb="xl">
                        {searchQuery ? 
                          'Try adjusting your search terms' : 
                          'Capture your thoughts and ideas securely'
                        }
                      </Text>
                      {!searchQuery && (
                        <Button 
                          variant="gradient"
                          gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                          size="lg"
                          radius="xl"
                          leftSection={<IconPlus size={20} />}
                          onClick={clearForm}
                          style={{
                            minHeight: '48px',
                            fontSize: '16px'
                          }}
                        >
                          Create Your First Note
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Mobile FAB */}
                <ActionIcon 
                  size="xl" 
                  color="blue" 
                  radius="xl"
                  onClick={clearForm}
                  className="mobile-fab"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'purple', deg: 45 }}
                  style={{
                    position: 'fixed',
                    bottom: '24px', // Adjust if needed with safe area
                    right: 'max(24px, env(safe-area-inset-right))', // Adjust for safe area
                    width: '64px',
                    height: '64px',
                    zIndex: 1000, // Ensure it's above content but potentially below modal/drawer overlays
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    border: 'none'
                  }}
                >
                  <IconPlus size={24} />
                </ActionIcon>

                {/* Selection Mode Bottom Bar */}
                {isSelectionMode && selectedNotes.size > 0 && (
                  <Box
                    style={{
                      position: 'fixed',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'var(--bg-secondary)', // Or var(--editor-toolbar) for consistency
                      borderTop: '1px solid var(--border-primary)',
                      padding: '1rem',
                      paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', // Safe area for bottom
                      paddingLeft: 'max(1rem, env(safe-area-inset-left))', // Safe area for left
                      paddingRight: 'max(1rem, env(safe-area-inset-right))', // Safe area for right
                      zIndex: 1001, // Above FAB maybe, or same level if mutually exclusive
                      backdropFilter: 'blur(12px)'
                    }}
                  >
                    <Button
                      leftSection={<IconTrash size={18} />}
                      fullWidth
                      radius="xl"
                      color="red"
                      size="lg"
                      onClick={handleDeleteSelectedNotes}
                      style={{
                        minHeight: '48px',
                        fontSize: '16px'
                      }}
                    >
                      Delete Selected ({selectedNotes.size})
                    </Button>
                  </Box>
                )}
              </>
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
                onBack={() => setSelectedNote(null)}
                loadNotes={loadNotes}
              />
            ) : (
              <Box className="empty-state">
                <IconNotes size={120} className="empty-state-icon" stroke={1} />
                <Text className="empty-state-title">
                  Select a note or create a new one
                </Text>
                <Text className="empty-state-description">
                  Your thoughts are waiting to be captured
                </Text>
              </Box>
            )}
          </Box>
        )}
      </AppShell.Main>
  
      <Modal
        opened={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
        title={isMobile ? null : "Sync Settings"}
        size="lg"
        fullScreen={isMobile}
        withCloseButton={!isMobile}
        closeOnClickOutside={!isMobile}
        closeOnEscape={true}
        styles={isMobile ? {
          header: {
            display: 'none !important',
            height: '0 !important',
            padding: '0 !important',
            margin: '0 !important',
          },
          body: {
            padding: '0 !important',
            paddingTop: 'calc(60px + max(0px, env(safe-area-inset-top))) !important',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom)) !important',
            height: '100vh !important',
          },
          content: {
            background: 'var(--bg-primary) !important',
            height: '100vh !important',
          }
        } : {}}
      >
        <SyncSettings onSync={loadNotes} onClose={() => setShowSyncSettings(false)} />
      </Modal>
    </AppShell>
  );
}

export default App;