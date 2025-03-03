import { useState, useEffect } from 'react';
import { 
  Stack, 
  Text,
  Button, 
  Group,
  Paper,
  ActionIcon,
  Box,
  TextInput
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconChevronLeft, IconPaperclip, IconDownload } from '@tabler/icons-react';
import { WebStorageService } from '../services/webStorage';
import { Note } from '../types/sync';
import { MarkdownEditor } from './MarkdownEditor';

interface AttachmentsListProps {
  note: Note;
  onRemove: (attachmentId: string) => void;
  onDownload: (attachmentId: string) => void;
  isSyncing: boolean;
}

function AttachmentsList({ note, onRemove, onDownload, isSyncing }: AttachmentsListProps) {
  if (!note.attachments?.length) return null;

  return (
    <Stack gap="xs" mt="md">
      <Text fw={500} size="sm">Attachments</Text>
      {note.attachments.map(attachment => (
        <Group key={attachment.id} justify="space-between">
          <Text size="sm">{attachment.name}</Text>
          <Group gap="xs">
            <ActionIcon 
              variant="subtle"
              size="sm"
              onClick={() => onDownload(attachment.id)}
              disabled={isSyncing}
            >
              <IconDownload size={16} />
            </ActionIcon>
            <ActionIcon 
              color="red" 
              variant="subtle"
              size="sm"
              onClick={() => onRemove(attachment.id)}
              disabled={isSyncing}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

interface NoteEditorProps {
  note: Note;
  isMobile?: boolean;
  isKeyboardVisible?: boolean;
  onBack?: () => void;
  loadNotes: () => void;
}

export function NoteEditor({ note, isMobile = false, isKeyboardVisible = false, onBack, loadNotes }: NoteEditorProps) {
  const [currentNote, setCurrentNote] = useState(note);
  const [title, setTitle] = useState(note.title || 'Untitled');
  const [content, setContent] = useState(note.content || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>('saved');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setCurrentNote(note);
    setTitle(note.title || 'Untitled');
    setContent(note.content || '');
  }, [note]);

  // Initialize crypto if needed
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

  // Update the useEffect that handles body overflow
  useEffect(() => {
    if (isMobile) {
      // Prevent body scrolling when editor is open on mobile
      document.body.style.overflow = 'hidden';
      
      // Add a class to help with mobile styling
      document.body.classList.add('editor-open');
      
      return () => {
        document.body.style.overflow = '';
        document.body.classList.remove('editor-open');
      };
    }
  }, [isMobile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentNote?.id) return;

    try {
      setIsSyncing(true);
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      const updatedNote = await WebStorageService.addAttachment(currentNote.id, file);
      setCurrentNote(updatedNote);
      await loadNotes();
      
      notifications.show({
        title: 'Success',
        message: 'File attached successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to attach file:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to attach file',
        color: 'red',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async (attachmentId: string) => {
    try {
      setIsSyncing(true);
      await WebStorageService.downloadAttachment(note.id!, attachmentId);
    } catch (error) {
      console.error('Failed to download file:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to download file',
        color: 'red',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to remove this attachment?')) return;
    
    try {
      setIsSyncing(true);
      await WebStorageService.removeAttachment(note.id!, attachmentId);
      
      // Get the updated note after attachment removal
      const notes = await WebStorageService.getNotes();
      const updated = notes.find(n => n.id === note.id);
      if (updated) {
        setCurrentNote(updated);
      }
      
      await loadNotes();
    } catch (error) {
      console.error('Failed to remove attachment:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to remove attachment',
        color: 'red',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const saveNote = async () => {
    setSaveStatus('saving');
    const updatedNote = {
      ...note,
      title,
      content,
      updated_at: Date.now()
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
              <label htmlFor="file-upload">
                <ActionIcon component="span" variant="subtle" radius="xl">
                  <IconPaperclip size={20} />
                </ActionIcon>
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isSyncing}
              />
            </Group>
          </Paper>
          
          <Box className="editor-container" style={{ 
            flex: 1,
            border: '1px solid var(--mantine-color-gray-3)', 
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--mantine-color-body)',
            position: 'relative'
          }}>
            <MarkdownEditor
              content={content}
              onChange={setContent}
              isMobile={true}
              defaultView="edit"
              editorType="richtext"
            />
          </Box>
          
          {currentNote.attachments && currentNote.attachments.length > 0 && (
            <Paper p="md" mb="md" withBorder>
              <AttachmentsList
                note={currentNote}
                onRemove={handleRemoveAttachment}
                onDownload={handleDownload}
                isSyncing={isSyncing}
              />
            </Paper>
          )}
          
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
    </Box>
  );
} 