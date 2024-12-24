import { useState, useEffect } from 'react';
import { Button, Paper, Group, Text, Stack } from '@mantine/core';
import { IconDeviceMobile } from '@tabler/icons-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (!deferredPrompt && !showIOSPrompt) return null;

  return (
    <Paper p="md" withBorder>
      <Stack gap="xs">
        <Group>
          <IconDeviceMobile size={24} />
          <Text fw={500}>Install TrustyNotes</Text>
        </Group>
        
        {showIOSPrompt ? (
          <>
            <Text size="sm">
              Install TrustyNotes on your iOS device: tap the share button 
              and select "Add to Home Screen"
            </Text>
            <Button 
              variant="light" 
              onClick={() => setShowIOSPrompt(false)}
            >
              Got it
            </Button>
          </>
        ) : (
          <>
            <Text size="sm">
              Install TrustyNotes for quick access and offline use
            </Text>
            <Button 
              onClick={handleInstall}
              leftSection={<IconDeviceMobile size={16} />}
            >
              Install App
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
} 