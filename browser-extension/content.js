chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SYNC_SETTINGS') {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('scripts/getStorageData.js');
    script.type = 'text/javascript';
    
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

window.addEventListener('storage', async (event) => {
  if (!chrome.runtime) return;

  if (event.key === 'notes' && event.newValue) {
    try {
      const notes = JSON.parse(event.newValue);
      await chrome.runtime.sendMessage({
        type: 'NOTES_UPDATED',
        notes: notes
      });
    } catch (error) {
      console.error('Failed to process notes update:', error);
    }
  }
});
  