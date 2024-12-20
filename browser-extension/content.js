function checkAndNotifyWebappReady() {
  console.log('Checking webapp status...');
  const notes = localStorage.getItem('notes');
  if (notes !== null) {
    console.log('Webapp ready, sending message to extension...');
    const sendReadyMessage = (attempts = 0) => {
      chrome.runtime.sendMessage({ 
        type: 'WEBAPP_READY',
        notes: JSON.parse(notes)
      }, response => {
        if (chrome.runtime.lastError) {
          console.log('Failed to send WEBAPP_READY message:', chrome.runtime.lastError);
          if (attempts < 3) {
            setTimeout(() => sendReadyMessage(attempts + 1), 500);
          }
        } else {
          console.log('WEBAPP_READY message sent successfully');
        }
      });
    };
    sendReadyMessage();
    return true;
  }
  console.log('Webapp not ready yet, notes:', !!notes);
  return false;
}

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
  } else if (message.type === 'UPDATE_NOTES') {
    console.log('Updating webapp notes:', message.notes);
    localStorage.setItem('notes', JSON.stringify(message.notes));
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'notes',
      newValue: JSON.stringify(message.notes)
    }));
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
      
      if (!event.oldValue) {
        console.log('Initial notes detected, checking webapp ready state...');
        checkAndNotifyWebappReady();
      }
    } catch (error) {
      console.error('Failed to process notes update:', error);
    }
  }
});

console.log('Content script loaded');
let checkAttempts = 0;
const maxAttempts = 40;

function attemptCheck() {
  if (checkAttempts >= maxAttempts) {
    console.log('Max check attempts reached');
    return;
  }
  
  if (!checkAndNotifyWebappReady()) {
    checkAttempts++;
    setTimeout(attemptCheck, 500);
  }
}

attemptCheck();

window.addEventListener('load', () => {
  console.log('Window loaded, starting webapp checks');
  checkAttempts = 0;
  attemptCheck();
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded, starting webapp checks');
  checkAttempts = 0;
  attemptCheck();
});

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if ((node.id === 'root' || node.id === 'app') && node.children.length > 0) {
          console.log('React root detected, checking webapp status');
          checkAttempts = 0;
          attemptCheck();
        }
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

const startTime = Date.now();
const interval = setInterval(() => {
  if (Date.now() - startTime > 60000) {
    clearInterval(interval);
    return;
  }
  console.log('Periodic check for webapp');
  checkAndNotifyWebappReady();
}, 5000);
  