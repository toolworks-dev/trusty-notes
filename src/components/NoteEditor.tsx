import { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  Button, 
  Group,
  Paper,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { WebStorageService } from '../services/webStorage';
import { Note } from '../types/sync';

interface AttachmentsListProps {
  note: Note;
  onRemove: (attachmentId: string) => void;
  onDownload: (attachmentId: string) => void;
  isSyncing: boolean;
}

function AttachmentsList({ note, onRemove, onDownload, isSyncing }: AttachmentsListProps) {
  if (!note.attachments?.length) return null;

  return (
    <Stack gap="xs">
      {note.attachments.map(attachment => (
        <Group key={attachment.id} justify="space-between">
          <Text>{attachment.name}</Text>
          <Group gap="xs">
            <Button 
              variant="subtle" 
              size="xs"
              onClick={() => onDownload(attachment.id)}
              loading={isSyncing}
            >
              Download
            </Button>
            <ActionIcon 
              color="red" 
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
  loadNotes: () => Promise<void>;
}

export function NoteEditor({ note, loadNotes }: NoteEditorProps) {
  const [cryptoInitialized, setCryptoInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);

  useEffect(() => {
    setCurrentNote(note);
  }, [note]);

  // Check if crypto is initialized and sync if needed
  useEffect(() => {
    const checkCryptoAndSync = async () => {
      const settings = await WebStorageService.getSyncSettings();
      const hasCrypto = !!settings.seed_phrase;
      setCryptoInitialized(hasCrypto);
      
      if (hasCrypto && settings.seed_phrase) {
        try {
          await WebStorageService.initializeCrypto(settings.seed_phrase);
          if (settings.server_url) {
            await WebStorageService.syncWithServer(settings.server_url);
          }
        } catch (error) {
          console.error('Failed to initialize crypto:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to initialize encryption',
            color: 'red',
          });
        }
      }
    };
    checkCryptoAndSync();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentNote?.id) return;

    try {
      setIsSyncing(true);
      
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }

      const settings = await WebStorageService.getSyncSettings();
      if (settings.server_url) {
        await WebStorageService.syncWithServer(settings.server_url);
      }
      
      const updatedNote = await WebStorageService.addAttachment(currentNote.id, file);
      setCurrentNote(updatedNote);
      
      if (settings.server_url) {
        await WebStorageService.syncWithServer(settings.server_url);
      }
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
      // Ensure we're synced before download
      const settings = await WebStorageService.getSyncSettings();
      if (settings.server_url) {
        await WebStorageService.syncWithServer(settings.server_url);
      }
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

  return (
    <Paper p="md" withBorder>
      <Stack>
        {!cryptoInitialized ? (
          <Alert 
            icon={<IconAlertCircle size={16} />}
            title="Sync Setup Required"
            color="yellow"
          >
            To attach files, you need to set up sync first. Click the cloud icon in the sidebar to get started.
          </Alert>
        ) : (
          <>
            <Group justify="space-between">
              <Text fw={500}>Attachments</Text>
              <Button 
                component="label" 
                size="xs"
                loading={isSyncing}
              >
                <Group gap={8} justify="center">
                  <IconPlus size={16} />
                  <span>Add File</span>
                </Group>
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  disabled={isSyncing}
                />
              </Button>
            </Group>
            <AttachmentsList
              note={currentNote}
              onRemove={async (attachmentId) => {
                setIsSyncing(true);
                try {
                  const settings = await WebStorageService.getSyncSettings();
                  if (settings.server_url) {
                    await WebStorageService.syncWithServer(settings.server_url);
                  }
                  await WebStorageService.removeAttachment(currentNote.id!, attachmentId);
                  const updatedNotes = await WebStorageService.getNotes();
                  const updatedNote = updatedNotes.find(n => n.id === currentNote.id);
                  if (updatedNote) {
                    setCurrentNote(updatedNote);
                  }
                  if (settings.server_url) {
                    await WebStorageService.syncWithServer(settings.server_url);
                  }
                  await loadNotes();
                } finally {
                  setIsSyncing(false);
                }
              }}
              onDownload={handleDownload}
              isSyncing={isSyncing}
            />
          </>
        )}
      </Stack>
    </Paper>
  );
} 