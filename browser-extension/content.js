// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SYNC_SETTINGS') {
    // Create and inject the script element
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/getStorageData.js');
    script.type = 'text/javascript';
    
    // Listen for the response from the injected script
    const listener = (event) => {
      const data = event.detail;
      if (data.settings) {
        try {
          const parsedSettings = JSON.parse(data.settings);
          const parsedNotes = data.notes ? JSON.parse(data.notes) : [];
          
          sendResponse({ 
            settings: parsedSettings,
            notes: parsedNotes
          });
        } catch (error) {
          console.error('Failed to parse storage data:', error);
          sendResponse({ error: 'Failed to parse storage data' });
        }
      } else {
        sendResponse({ settings: null, notes: [] });
      }
      document.removeEventListener('get-storage-data', listener);
      script.remove();
    };

    document.addEventListener('get-storage-data', listener);
    document.documentElement.appendChild(script);
    return true;
  } else if (message.type === 'OPEN_SETTINGS') {
    const event = new CustomEvent('open-sync-settings');
    window.dispatchEvent(event);
    console.debug('Dispatched open-sync-settings event');
    return true;
  }
});

window.addEventListener('storage', (event) => {
  if (!chrome.runtime) return;

  if (event.key === 'notes' && event.newValue) {
    try {
      const notes = JSON.parse(event.newValue);
      chrome.runtime.sendMessage({
        type: 'NOTES_UPDATED',
        notes: notes
      });
    } catch (error) {
      console.error('Failed to process notes update:', error);
    }
  }
  
  if (event.key === 'sync_settings' && event.newValue) {
    try {
      const settings = JSON.parse(event.newValue);
      if (settings.seed_phrase) {
        chrome.runtime.sendMessage({
          type: 'SYNC_SETTINGS_UPDATED',
          settings: settings
        });
      }
    } catch (error) {
      console.error('Failed to process settings update:', error);
    }
  }
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      const notifications = document.querySelectorAll('.mantine-Notification-root');
      for (const notification of notifications) {
        if (notification.textContent.includes('saved') || 
            notification.textContent.includes('synced') ||
            notification.textContent.includes('updated')) {
          const notes = localStorage.getItem('notes');
          if (notes) {
            try {
              const parsedNotes = JSON.parse(notes);
              chrome.runtime.sendMessage({
                type: 'NOTES_UPDATED',
                notes: parsedNotes
              });
            } catch (error) {
              console.error('Failed to process notes update:', error);
            }
          }
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true }); 