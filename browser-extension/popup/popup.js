class CryptoService {
  constructor(key) {
    this.key = key;
  }

  static async new(seedPhrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(seedPhrase);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new CryptoService(new Uint8Array(hash));
  }

  async encrypt(data) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  async decrypt(encrypted) {
    const key = await crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encrypted.iv) },
      key,
      new Uint8Array(encrypted.data)
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }
}

let notes = [];
let cryptoService = null;
let currentEditingNote = null;
let editor = null;
let syncAttemptTimeout = null;
let webappTabCheckInterval = null;

async function getWebAppSettings() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://trustynotes.app/*' });
    if (tabs.length === 0) {
      const result = await chrome.storage.local.get(['encrypted_notes']);
      if (result.encrypted_notes && cryptoService) {
        const decryptedNotes = await cryptoService.decrypt(result.encrypted_notes);
        return { notes: decryptedNotes };
      }
      return null;
    }

    const tab = tabs[0];

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const settings = localStorage.getItem('sync_settings');
        const notes = localStorage.getItem('notes');
        return {
          settings: settings ? JSON.parse(settings) : null,
          notes: notes ? JSON.parse(notes) : []
        };
      }
    });

    if (!result || !result[0]?.result) {
      console.error('Failed to get data from webapp');
      return null;
    }

    const { settings, notes: webappNotes } = result[0].result;

    if (settings?.seed_phrase) {
      cryptoService = await CryptoService.new(settings.seed_phrase);
      
      await chrome.storage.local.set({
        seed_phrase: settings.seed_phrase
      });

      if (webappNotes?.length > 0) {
        const encrypted = await cryptoService.encrypt(webappNotes);
        await chrome.storage.local.set({ 
          encrypted_notes: encrypted,
          lastUpdated: Date.now()
        });
        
        notes = webappNotes;
        renderNotes(notes);
      }

      return settings;
    }

    return null;
  } catch (error) {
    console.error('Failed to get web app settings:', error);
    return null;
  }
}

async function initializeCrypto() {
  try {
    let settings = await chrome.storage.local.get(['seed_phrase']);
    
    if (!settings.seed_phrase) {
      const webAppSettings = await getWebAppSettings();
      if (!webAppSettings?.seed_phrase) {
        throw new Error('No sync code set');
      }
      settings = { seed_phrase: webAppSettings.seed_phrase };
    }
    
    cryptoService = await CryptoService.new(settings.seed_phrase);
    return true;
  } catch (error) {
    console.error('Failed to initialize crypto:', error);
    return false;
  }
}

function renderNotes(notes) {
  console.log('Rendering notes:', notes);
  
  const notesList = document.getElementById('notesList');
  if (!notes || notes.length === 0) {
    notesList.innerHTML = '<div class="no-notes">No notes found</div>';
    return;
  }

  notesList.innerHTML = notes
    .sort((a, b) => b.updated_at - a.updated_at)
    .map(note => `
      <div class="note-item" data-id="${note.id}">
        <div class="note-title">
          ${note.title || 'Untitled'}
        </div>
        <div class="note-preview">${note.content ? note.content.substring(0, 100) : ''}</div>
      </div>
    `)
    .join('');

  document.querySelectorAll('.note-item').forEach(noteElement => {
    noteElement.addEventListener('click', () => {
      const noteId = parseInt(noteElement.dataset.id);
      const note = notes.find(n => n.id === noteId);
      console.log('Note clicked:', note);
      if (note) {
        showEditor(note);
      }
    });
  });
}

async function handleNotesUpdate(notes) {
  if (!cryptoService) {
    await initializeCrypto();
  }
  
  if (cryptoService) {
    const encrypted = await cryptoService.encrypt(notes);
    await chrome.storage.local.set({ 
      encrypted_notes: encrypted,
      lastUpdated: Date.now()
    });
    
    renderNotes(notes);
  }
}

function showEditor(note = null) {
  console.log('Opening editor with note:', note);

  document.getElementById('mainView').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  
  if (note) {
    currentEditingNote = {
      id: note.id,
      title: note.title || '',
      content: note.content || '',
      created_at: note.created_at,
      updated_at: note.updated_at,
      attachments: note.attachments || []
    };

    console.log('Current editing note:', currentEditingNote);
    
    titleInput.value = currentEditingNote.title;
    contentInput.innerHTML = currentEditingNote.content || '';
    contentInput.contentEditable = 'true';

    Object.assign(contentInput.style, {
      backgroundColor: '#ffffff',
      color: '#000000',
      minHeight: '200px',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      overflow: 'auto',
      display: 'block',
      width: '100%',
      boxSizing: 'border-box'
    });

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      Object.assign(contentInput.style, {
        backgroundColor: '#3f3f3f',
        color: '#f6f6f6',
        borderColor: '#444'
      });
    }

    console.log('Content input styles:', contentInput.style.cssText);
  } else {
    currentEditingNote = null;
    titleInput.value = '';
    contentInput.innerHTML = '';
    contentInput.contentEditable = 'true';
    
    Object.assign(contentInput.style, {
      backgroundColor: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#3f3f3f' : '#ffffff',
      color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f6f6f6' : '#000000',
      minHeight: '200px',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      overflow: 'auto',
      display: 'block',
      width: '100%',
      boxSizing: 'border-box'
    });
  }

  contentInput.style.display = 'none';
  contentInput.offsetHeight;
  contentInput.style.display = 'block';
}

function hideEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
  currentEditingNote = null;
  
  requestAnimationFrame(() => {
    document.getElementById('mainView').style.display = 'block';
    document.getElementById('editor').style.display = 'none';
  });
}

async function syncPendingNotes() {
  try {
    console.log('Checking for pending notes to sync...');
    const pendingNotes = notes.filter(note => note.pending_sync);
    if (pendingNotes.length === 0) {
      console.log('No pending notes to sync');
      return true;
    }
    
    console.log(`Found ${pendingNotes.length} notes to sync`);
    const tabs = await chrome.tabs.query({ url: 'https://trustynotes.app/*' });
    if (tabs.length > 0) {
      const tab = tabs[0];
      console.log('Found webapp tab, attempting to sync...');
      
      const success = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (notesToSync) => {
          return new Promise((resolve) => {
            console.log('Starting sync in webapp...');
            const checkAndSync = () => {
              try {
                const notesJson = localStorage.getItem('notes');
                if (!notesJson) {
                  console.log('Webapp not ready yet, waiting...');
                  setTimeout(checkAndSync, 500);
                  return;
                }
                
                let existingNotes = JSON.parse(notesJson);
                console.log('Merging notes with webapp...');
                
                const existingNotesMap = new Map(
                  existingNotes.map(note => [note.id, note])
                );
                
                notesToSync.forEach(newNote => {
                  existingNotesMap.set(newNote.id, {
                    ...newNote,
                    pending_sync: false
                  });
                });
                
                const mergedNotes = Array.from(existingNotesMap.values());
                
                localStorage.setItem('notes', JSON.stringify(mergedNotes));
                console.log('Notes saved to webapp storage');
                
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'notes',
                  oldValue: notesJson,
                  newValue: JSON.stringify(mergedNotes)
                }));
                
                resolve(true);
              } catch (error) {
                console.error('Sync attempt failed:', error);
                setTimeout(checkAndSync, 500);
              }
            };
            
            checkAndSync();
          });
        },
        args: [pendingNotes]
      });

      if (success && success[0]?.result) {
        console.log('Sync successful, updating local notes...');
        notes = notes.map(note => ({
          ...note,
          pending_sync: note.pending_sync && !pendingNotes.some(p => p.id === note.id)
        }));
        await handleNotesUpdate(notes);

        console.log('Refreshing webapp tab...');
        await chrome.tabs.reload(tab.id);
        
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to sync pending notes:', error);
    return false;
  }
}

async function saveNote() {
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  
  const now = Date.now();
  const noteData = {
    id: currentEditingNote?.id || now,
    title: titleInput.value,
    content: contentInput.innerHTML || '',
    created_at: currentEditingNote?.created_at || now,
    updated_at: now,
    pending_sync: true
  };

  try {
    notes = [...notes.filter(n => n.id !== noteData.id), noteData];
    
    if (cryptoService) {
      await handleNotesUpdate(notes);
    }

    const synced = await checkForWebappTab();
    
    requestAnimationFrame(() => {
      hideEditor();
    });
    
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = `
      <div class="success-message">
        Note saved${synced ? ' and synced!' : ' locally. Will sync when webapp is opened.'}
      </div>
    `;
    
    setTimeout(() => {
      renderNotes(notes);
    }, 1500);

  } catch (error) {
    console.error('Failed to save note:', error);
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = `
      <div class="error-message">
        Failed to save note. Please try again.
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.documentElement.style.setProperty('--surface', '#ffffff');
  document.documentElement.style.setProperty('--text', '#000000');
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.style.setProperty('--surface', '#3f3f3f');
    document.documentElement.style.setProperty('--text', '#f6f6f6');
  }

  const searchInput = document.getElementById('searchInput');
  const notesList = document.getElementById('notesList');
  const newNoteBtn = document.getElementById('newNoteBtn');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  if (!searchInput || !notesList || !newNoteBtn || !saveNoteBtn || !cancelEditBtn) {
    console.error('Required elements not found');
    return;
  }

  try {
    const initialized = await initializeCrypto();
    if (initialized) {
      const result = await chrome.storage.local.get(['encrypted_notes']);
      if (result.encrypted_notes) {
        notes = await cryptoService.decrypt(result.encrypted_notes);
        renderNotes(notes);
      }
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) || 
      note.content.toLowerCase().includes(searchTerm)
    );
    renderNotes(filteredNotes);
  });

  newNoteBtn.addEventListener('click', () => {
    showEditor();
  });

  saveNoteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveNote();
  });

  cancelEditBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideEditor();
  });
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'NOTES_UPDATED' && message.notes) {
    await handleNotesUpdate(message.notes);
  } else if (message.type === 'NOTES_UPDATED_IN_STORAGE' && message.notes) {
    notes = message.notes;
    renderNotes(notes);
  } else if (message.type === 'PERFORM_SYNC') {
    console.log('Received sync request from background script');
    syncPendingNotes();
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.startsWith('https://trustynotes.app')) {
    
    console.log('Webapp tab detected, preparing to sync...');
    if (syncAttemptTimeout) {
      clearTimeout(syncAttemptTimeout);
    }
    
    let attempts = 0;
    const maxAttempts = 5;
    
    const trySync = async () => {
      try {
        console.log(`Sync attempt ${attempts + 1} of ${maxAttempts}`);
        const success = await syncPendingNotes();
        if (success) {
          console.log('Successfully synced notes with webapp');
        } else if (attempts < maxAttempts) {
          attempts++;
          syncAttemptTimeout = setTimeout(trySync, 2000);
        }
      } catch (error) {
        console.error('Sync attempt failed:', error);
        if (attempts < maxAttempts) {
          attempts++;
          syncAttemptTimeout = setTimeout(trySync, 2000);
        }
      }
    };
    
    syncAttemptTimeout = setTimeout(trySync, 2000);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WEBAPP_READY') {
    console.log('Received WEBAPP_READY message with notes:', message.notes);
    if (syncAttemptTimeout) {
      clearTimeout(syncAttemptTimeout);
    }

    const pendingNotes = notes.filter(note => note.pending_sync);
    if (pendingNotes.length > 0) {
      console.log('Found pending notes to sync:', pendingNotes);
      
      const webappNotes = message.notes || [];
      const mergedNotes = [...webappNotes];
      
      pendingNotes.forEach(newNote => {
        const index = mergedNotes.findIndex(n => n.id === newNote.id);
        if (index !== -1) {
          if (newNote.updated_at > mergedNotes[index].updated_at) {
            mergedNotes[index] = { ...newNote, pending_sync: false };
          }
        } else {
          mergedNotes.push({ ...newNote, pending_sync: false });
        }
      });

      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'UPDATE_NOTES',
        notes: mergedNotes
      });

      notes = mergedNotes;
      handleNotesUpdate(notes);
    }
  }
  return true;
});

async function checkForWebappTab() {
  const tabs = await chrome.tabs.query({ url: 'https://trustynotes.app/*' });
  if (tabs.length > 0) {
    console.log('Found webapp tab, attempting sync...');
    await syncPendingNotes();
  }
}

window.addEventListener('unload', () => {
  if (webappTabCheckInterval) {
    clearInterval(webappTabCheckInterval);
  }
});

window.addEventListener('storage', async (event) => {
  if (!chrome.runtime) return;

  if (event.key === 'notes' && event.newValue) {
    try {
      const newNotes = JSON.parse(event.newValue);
      const oldNotes = event.oldValue ? JSON.parse(event.oldValue) : [];
      
      const wasExtensionUpdate = newNotes.some(note => note.pending_sync === false);
      if (!wasExtensionUpdate) {
        await chrome.runtime.sendMessage({
          type: 'NOTES_UPDATED',
          notes: newNotes
        });
      }
    } catch (error) {
      console.error('Failed to process notes update:', error);
    }
  }
}); 