import { useState, useEffect } from 'react';
import { 
  Text,
  Button, 
  Group,
  Paper,
  ActionIcon,
  Box,
  TextInput,
  Badge,
  Stack
} from '@mantine/core';
import { IconTrash, IconChevronLeft, IconShieldLock, IconLock } from '@tabler/icons-react';
import { WebStorageService } from '../services/webStorage';
import { Note } from '../types/sync';
import { MarkdownEditor } from './MarkdownEditor';
import { format } from 'date-fns';

export interface NoteEditorProps {
  note: Note;
  isMobile?: boolean;
  isKeyboardVisible?: boolean;
  onBack?: () => void;
  loadNotes: () => Promise<void>;
}

export function NoteEditor({ note, isMobile = false, isKeyboardVisible = false, onBack, loadNotes }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title || 'Untitled');
  const [content, setContent] = useState(note.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>('saved');

  useEffect(() => {
    setTitle(note.title || 'Untitled');
    setContent(note.content || '');
  }, [note]);

  useEffect(() => {
    const initCrypto = async () => {
      try {
        const settings = await WebStorageService.getSyncSettings();
        if (settings.seed_phrase) {
          await WebStorageService.initializeCrypto(settings.seed_phrase);
        }
      } catch (error) {
        console.error('Failed to initialize crypto:', error);
      }
    };
    
    initCrypto();
  }, []);

  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('editor-open');
      
      return () => {
        document.body.style.overflow = '';
        document.body.classList.remove('editor-open');
      };
    }
  }, [isMobile]);

  const saveNote = async () => {
    setSaveStatus('saving');
    const updatedNote = {
      ...note,
      title,
      content,
      updated_at: Date.now(),
      pending_sync: true
    };
    
    await WebStorageService.saveNote(updatedNote);
    await loadNotes();
    setSaveStatus('saved');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await WebStorageService.deleteNote(note.id!);
      await loadNotes();
      if (onBack) onBack();
    }
  };

  const getEncryptionBadge = () => {
    if (note?.encryptionType === 2) {
      return (
        <Badge color="green" size="sm" radius="sm" mb="xs">
          <Group gap={6}>
            <IconShieldLock size={14} />
            <Text size="xs">Post-Quantum Encrypted</Text>
          </Group>
        </Badge>
      );
    } else if (note?.encryptionType === 1) {
      return (
        <Badge color="blue" size="sm" radius="sm" mb="xs">
          <Group gap={6}>
            <IconLock size={14} />
            <Text size="xs">AES Encrypted</Text>
          </Group>
        </Badge>
      );
    }
    return null;
  };

  return (
    <Box 
      className={`${isMobile ? 'mobile-note-editor' : 'desktop-note-editor'} ${isKeyboardVisible ? 'keyboard-visible' : ''}`}
      style={{ 
        height: isMobile ? '100vh' : 'calc(100vh - 32px)', 
        display: 'flex', 
        flexDirection: 'column',
        flex: '1 1 auto',
        width: isMobile ? '100vw' : '100%',
        maxWidth: isMobile ? '100vw' : '100%',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        right: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 1000 : 'auto'
      }}
    >
      {isMobile ? (
        <>
          <Paper shadow="sm" p="md" style={{ 
            marginBottom: '8px',
            borderRadius: '8px',
            position: 'relative',
            zIndex: 10,
            backgroundColor: 'var(--mantine-color-body)'
          }}>
            <Group>
              {onBack && (
                <ActionIcon onClick={onBack} variant="subtle" radius="xl">
                  <IconChevronLeft size={20} />
                </ActionIcon>
              )}
              <TextInput
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                style={{ flex: 1 }}
                variant="filled"
                radius="md"
                size="md"
                onBlur={saveNote}
              />
            </Group>
          </Paper>
          
          <Box className="editor-container" style={{ 
            flex: 1,
            overflow: 'hidden',
            backgroundColor: 'var(--mantine-color-body)',
            position: 'relative',
            display: 'flex', 
            flexDirection: 'column',
            paddingBottom: '70px'
          }}>
            <MarkdownEditor
              content={content}
              onChange={setContent}
              isMobile={true}
              defaultView="edit"
              editorType="richtext"
            />
          </Box>
          
          <Paper className="mobile-fixed-bottom" style={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            zIndex: 100 
          }}>
            <Group justify="space-between" wrap="nowrap">
              <Button 
                variant="light" 
                color="red" 
                onClick={handleDelete}
                leftSection={<IconTrash size={16} />}
                radius="md"
                size="sm"
              >
                Delete
              </Button>
              <Text size="sm" color="dimmed">
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </Text>
              <Button
                onClick={saveNote}
                radius="md"
                size="sm"
              >
                Save
              </Button>
            </Group>
          </Paper>
        </>
      ) : (
        <>
          <Paper 
            shadow="sm" 
            p="md" 
            style={{ 
              borderRadius: 'var(--mantine-radius-md)',
              marginBottom: '8px'
            }}
          >
            <Group justify="space-between">
              <TextInput
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                style={{ flex: 1 }}
                size="lg"
                onBlur={saveNote}
              />
              <Group>
                <Button variant="light" color="red" onClick={handleDelete}>
                  Delete
                </Button>
                <Button onClick={saveNote}>
                  {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                </Button>
              </Group>
            </Group>
          </Paper>
          
          <Box style={{ 
            flex: '1 1 auto',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: 'calc(100vh - 100px)',
            minHeight: '500px'
          }}>
            <MarkdownEditor
              content={content}
              onChange={setContent}
              isMobile={false}
              defaultView="edit"
              editorType="richtext"
            />
          </Box>
        </>
      )}
      {!isMobile && (
        <Paper withBorder radius="md" p="md" mb="md">
          <Group justify="space-between">
            <Stack gap={4}>
              <Text size="sm" fw={500}>Last edited: {format(note.updated_at, 'MMM d, yyyy h:mm a')}</Text>
              {getEncryptionBadge()}
            </Stack>
            <ActionIcon color="red" onClick={handleDelete}>
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      )}
    </Box>
  );
} 