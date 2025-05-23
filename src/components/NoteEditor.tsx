import { useState, useEffect } from 'react';
import { 
  Text,
  Button, 
  Group,
  ActionIcon,
  Box,
  TextInput,
  Badge,
  Stack,
  Divider
} from '@mantine/core';
import { IconTrash, IconChevronLeft, IconShieldLock, IconLock, IconDeviceFloppy } from '@tabler/icons-react';
import { WebStorageService } from '../services/webStorage';
import { Note } from '../types/sync';
import { MarkdownEditor } from './MarkdownEditor';
import { format } from 'date-fns';

export interface NoteEditorProps {
  note: Note;
  isMobile?: boolean;
  onBack?: () => void;
  loadNotes: () => Promise<void>;
}

export function NoteEditor({ note, isMobile = false, onBack, loadNotes }: NoteEditorProps) {
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
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('editor-open');
      
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
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
        <Badge 
          color="green" 
          size="sm" 
          radius="lg" 
          variant="light"
          leftSection={<IconShieldLock size={12} />}
        >
          Post-Quantum
        </Badge>
      );
    } else if (note?.encryptionType === 1) {
      return (
        <Badge 
          color="blue" 
          size="sm" 
          radius="lg" 
          variant="light"
          leftSection={<IconLock size={12} />}
        >
          AES Encrypted
        </Badge>
      );
    }
    return null;
  };

  if (isMobile) {
    return (
      <Box 
        className="mobile-note-editor"
        style={{ 
          position: 'fixed',
          top: 'calc(60px + max(0px, env(safe-area-inset-top)))',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: 'calc(100vh - 60px - max(0px, env(safe-area-inset-top)))',
          display: 'flex', 
          flexDirection: 'column',
          background: 'var(--editor-bg)',
          zIndex: 1001,
          overflow: 'hidden'
        }}
      >
        {/* Mobile Header - Fixed Height */}
        <Box 
          style={{ 
            padding: '0.75rem',
            borderBottom: '1px solid var(--editor-border)',
            background: 'var(--editor-toolbar)',
            flexShrink: 0
          }}
        >
          <Group gap="sm" wrap="nowrap" align="center">
            {onBack && (
              <ActionIcon 
                onClick={onBack} 
                variant="subtle" 
                size="lg"
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
            )}
            <TextInput
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              variant="unstyled"
              size="md"
              onBlur={saveNote}
              style={{ 
                flex: 1
              }}
              styles={{
                input: {
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0'
                }
              }}
            />
            <ActionIcon
              onClick={saveNote}
              variant="light"
              size="lg"
              loading={saveStatus === 'saving'}
            >
              <IconDeviceFloppy size={18} />
            </ActionIcon>
          </Group>
          
          <Group mt="xs" gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {format(note.updated_at, 'MMM d, yyyy h:mm a')}
            </Text>
            {getEncryptionBadge()}
          </Group>
        </Box>
        
        {/* Mobile Editor Content - Natural Height */}
        <Box style={{ 
          flex: 1,
          overflow: 'hidden',
          display: 'flex', 
          flexDirection: 'column',
          minHeight: 0,
          height: 0
        }}>
          <MarkdownEditor
            content={content}
            onChange={setContent}
            isMobile={true}
            defaultView="edit"
            editorType="richtext"
          />
        </Box>
        
        {/* Mobile Bottom Bar - Fixed to Bottom */}
        <Box 
          style={{ 
            padding: '0.75rem',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            borderTop: '1px solid var(--editor-border)',
            background: 'var(--editor-toolbar)',
            flexShrink: 0
          }}
        >
          <Group justify="space-between" align="center">
            <Button 
              variant="light" 
              color="red" 
              onClick={handleDelete}
              leftSection={<IconTrash size={16} />}
              size="sm"
            >
              Delete
            </Button>
            <Text size="sm" c="dimmed">
              {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
            </Text>
          </Group>
        </Box>
      </Box>
    );
  }

  // Desktop Version
  return (
    <Box 
      className="modern-editor-container desktop-note-editor"
      style={{ 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        background: 'var(--editor-bg)',
        border: '1px solid var(--editor-border)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden'
      }}
    >
      {/* Desktop Header */}
      <Box className="modern-editor-header">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap">
            <TextInput
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              variant="unstyled"
              size="xl"
              onBlur={saveNote}
              className="modern-editor-title"
              style={{ 
                flex: 1,
                fontSize: '2rem',
                fontWeight: 700
              }}
            />
            <Group gap="sm">
              <Button 
                variant="light" 
                color="red" 
                onClick={handleDelete}
                leftSection={<IconTrash size={16} />}
                className="hover-lift"
              >
                Delete
              </Button>
              <Button 
                onClick={saveNote}
                variant="filled"
                color="blue"
                leftSection={<IconDeviceFloppy size={16} />}
                className="hover-lift"
                loading={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </Button>
            </Group>
          </Group>
          
          <Divider />
          
          {/* Desktop metadata */}
          <Group justify="space-between">
            <Group gap="md">
              <Text size="sm" c="dimmed" fw={500}>
                Last edited: {format(note.updated_at, 'MMM d, yyyy h:mm a')}
              </Text>
              {getEncryptionBadge()}
            </Group>
            <Text size="sm" c="dimmed">
              {saveStatus === 'saving' ? 'Saving...' : 'Auto-saved'}
            </Text>
          </Group>
        </Stack>
      </Box>
      
      {/* Desktop Editor */}
      <Box style={{ 
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        <MarkdownEditor
          content={content}
          onChange={setContent}
          isMobile={false}
          defaultView="edit"
          editorType="richtext"
        />
      </Box>
    </Box>
  );
} 