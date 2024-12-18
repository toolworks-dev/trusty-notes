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
      await Promise.all([
        chrome.runtime.sendMessage({
          type: 'NOTES_UPDATED',
          notes: notes
        }),
        chrome.runtime.sendMessage({
          type: 'NOTES_UPDATED_IN_STORAGE',
          notes: notes
        })
      ]).catch(error => {
        console.debug('Extension communication failed:', error);
      });
    } catch (error) {
      console.error('Failed to process notes update:', error);
    }
  }
  
  if (event.key === 'sync_settings' && event.newValue) {
    try {
      const settings = JSON.parse(event.newValue);
      if (settings.seed_phrase) {
        await Promise.all([
          chrome.runtime.sendMessage({
            type: 'SYNC_SETTINGS_UPDATED',
            settings: settings
          }),
          chrome.runtime.sendMessage({
            type: 'NOTES_UPDATED_IN_STORAGE',
            notes: JSON.parse(localStorage.getItem('notes') || '[]')
          })
        ]).catch(error => {
          console.debug('Extension communication failed:', error);
        });
      }
    } catch (error) {
      console.error('Failed to process settings update:', error);
    }
  }
});

const observer = new MutationObserver(async (mutations) => {
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
              await Promise.all([
                chrome.runtime.sendMessage({
                  type: 'NOTES_UPDATED',
                  notes: parsedNotes
                }),
                chrome.runtime.sendMessage({
                  type: 'NOTES_UPDATED_IN_STORAGE',
                  notes: parsedNotes
                })
              ]).catch(error => {
                console.debug('Extension communication failed:', error);
              });
            } catch (error) {
              console.error('Failed to process notes update:', error);
            }
          }
          break;
        }
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

setInterval(async () => {
  if (!chrome.runtime) return;
  
  const notes = localStorage.getItem('notes');
  if (notes) {
    try {
      const parsedNotes = JSON.parse(notes);
      await Promise.all([
        chrome.runtime.sendMessage({
          type: 'NOTES_UPDATED',
          notes: parsedNotes
        }),
        chrome.runtime.sendMessage({
          type: 'NOTES_UPDATED_IN_STORAGE',
          notes: parsedNotes
        })
      ]).catch(error => {
        console.debug('Periodic update failed:', error);
      });
    } catch (error) {
      console.error('Failed to process periodic update:', error);
    }
  }
}, 1000);
  