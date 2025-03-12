import { CryptoService } from './services/cryptoService.js';

let cryptoService = null;
let webappTabCheckInterval = null;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 2000;

// Initialize the crypto service when the extension starts
async function initializeCrypto() {
  try {
    // Get seed phrase from storage
    const result = await chrome.storage.local.get('seedPhrase');
    if (result.seedPhrase) {
      cryptoService = await CryptoService.new(result.seedPhrase);
      console.log('Crypto service initialized with PQ support:', cryptoService.isPQAvailable());
    } else {
      console.log('No seed phrase found, crypto not initialized');
    }
  } catch (error) {
    console.error('Failed to initialize crypto:', error);
  }
}

async function encryptAndStoreNotes(notes) {
  try {
    if (!cryptoService) {
      const settings = await chrome.storage.local.get(['seed_phrase']);
      if (!settings.seed_phrase) {
        console.error('No sync code set');
        return;
      }
      cryptoService = await CryptoService.new(settings.seed_phrase);
    }

    const notesWithoutAttachments = notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted: note.deleted,
      pending_sync: note.pending_sync
    }));

    const encrypted = await cryptoService.encrypt(notesWithoutAttachments);
    await chrome.storage.local.set({ 
      encrypted_notes: encrypted,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error encrypting and storing notes:', error);
  }
}

async function checkForPendingSync() {
  try {
    const now = Date.now();
    if (now - lastSyncTime < SYNC_COOLDOWN) {
      return;
    }

    const result = await chrome.storage.local.get(['encrypted_notes', 'seed_phrase', 'lastUpdated']);
    if (!result.encrypted_notes) return;

    if (result.lastUpdated && now - result.lastUpdated < SYNC_COOLDOWN) {
      return;
    }

    if (!cryptoService && result.seed_phrase) {
      cryptoService = await CryptoService.new(result.seed_phrase);
    }
    if (!cryptoService) return;

    let notes = await cryptoService.decrypt(result.encrypted_notes);
    const pendingNotes = notes.filter(note => note.pending_sync);
    
    if (pendingNotes.length > 0 || now - lastSyncTime > 10000) {
      const tabs = await chrome.tabs.query({ url: 'https://trustynotes.app/*' });
      if (tabs.length > 0) {
        const tab = tabs[0];
        
        const success = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (extensionNotes, lastSync) => {
            return new Promise((resolve) => {
              const checkAndSync = () => {
                try {
                  const notesJson = localStorage.getItem('notes');
                  if (!notesJson) {
                    setTimeout(checkAndSync, 500);
                    return;
                  }
                  
                  let webappNotes = JSON.parse(notesJson);
                  
                  const lastWebappUpdate = Math.max(...webappNotes.map(n => n.updated_at));
                  if (lastWebappUpdate > lastSync && Date.now() - lastWebappUpdate < 2000) {
                    resolve({
                      success: true,
                      notes: extensionNotes,
                      hasChanges: false
                    });
                    return;
                  }

                  const webappNotesMap = new Map(
                    webappNotes.map(note => [note.id, note])
                  );
                  const extensionNotesMap = new Map(
                    extensionNotes.map(note => [note.id, note])
                  );
                  
                  let hasChanges = false;
                  const allNoteIds = new Set([
                    ...webappNotesMap.keys(),
                    ...extensionNotesMap.keys()
                  ]);
                  
                  const finalNotesMap = new Map();
                  
                  allNoteIds.forEach(id => {
                    const webappNote = webappNotesMap.get(id);
                    const extensionNote = extensionNotesMap.get(id);
                    
                    if (!webappNote) {
                      hasChanges = true;
                    } else if (!extensionNote) {
                      hasChanges = true;
                      finalNotesMap.set(id, webappNote);
                    } else if (extensionNote.pending_sync) {
                      hasChanges = true;
                      finalNotesMap.set(id, {
                        ...extensionNote,
                        pending_sync: false
                      });
                    } else if (webappNote.updated_at > extensionNote.updated_at) {
                      hasChanges = true;
                      finalNotesMap.set(id, webappNote);
                    } else {
                      finalNotesMap.set(id, extensionNote);
                    }
                  });
                  
                  if (!hasChanges) {
                    resolve({
                      success: true,
                      notes: extensionNotes,
                      hasChanges: false
                    });
                    return;
                  }
                  
                  const mergedNotes = Array.from(finalNotesMap.values());
                  
                  localStorage.setItem('notes', JSON.stringify(mergedNotes));
                  
                  window.dispatchEvent(new StorageEvent('storage', {
                    key: 'notes',
                    oldValue: notesJson,
                    newValue: JSON.stringify(mergedNotes)
                  }));
                  
                  resolve({
                    success: true,
                    notes: mergedNotes,
                    hasChanges: true
                  });
                } catch (error) {
                  console.error('Sync attempt failed:', error);
                  setTimeout(checkAndSync, 500);
                }
              };
              
              checkAndSync();
            });
          },
          args: [notes, lastSyncTime]
        });

        if (success && success[0]?.result?.success) {
          if (success[0].result.hasChanges) {
            notes = success[0].result.notes;
            await encryptAndStoreNotes(notes);
            await chrome.tabs.reload(tab.id);
          }
          lastSyncTime = Date.now();
        }
      }
    }
  } catch (error) {
    console.error('Error checking for pending sync:', error);
  }
}

function startPeriodicCheck() {
  if (webappTabCheckInterval) {
    clearInterval(webappTabCheckInterval);
  }
  webappTabCheckInterval = setInterval(checkForPendingSync, 2000);
}

startPeriodicCheck();

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'encrypt') {
    if (!cryptoService) {
      sendResponse({ error: 'Crypto service not initialized' });
      return;
    }
    
    // Encrypt data asynchronously
    (async () => {
      try {
        const encrypted = await cryptoService.encrypt(message.data);
        sendResponse({ success: true, encrypted });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    
    return true; // Indicate asynchronous response
  }
  
  if (message.action === 'decrypt') {
    if (!cryptoService) {
      sendResponse({ error: 'Crypto service not initialized' });
      return;
    }
    
    // Decrypt data asynchronously
    (async () => {
      try {
        const decrypted = await cryptoService.decrypt(message.encrypted);
        sendResponse({ success: true, decrypted });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    
    return true; // Indicate asynchronous response
  }
  
  if (message.action === 'setupCrypto') {
    // Initialize with new seed phrase
    (async () => {
      try {
        await chrome.storage.local.set({ seedPhrase: message.seedPhrase });
        cryptoService = await CryptoService.new(message.seedPhrase);
        sendResponse({ 
          success: true, 
          pqAvailable: cryptoService.isPQAvailable() 
        });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    
    return true; // Indicate asynchronous response
  }

  if (message.type === 'NOTES_UPDATED' && message.notes) {
    lastSyncTime = Date.now();
    encryptAndStoreNotes(message.notes);
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://trustynotes.app')) {
    checkForPendingSync();
  }
});

chrome.runtime.onConnect.addListener(function(port) {
  port.onDisconnect.addListener(function() {
    startPeriodicCheck();
  });
});

// Initialize when extension loads
initializeCrypto(); 