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
    const tabs = await chrome.tabs.query({ url: 'https://notes.toolworks.dev/*' });
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
        throw new Error('No seed phrase set');
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

function renderNotes(notesToRender) {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = '';

  notesToRender.forEach(note => {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.innerHTML = `
      <div class="note-title">${note.title || 'Untitled'}</div>
      <div class="note-preview">${note.content.substring(0, 100)}...</div>
    `;

    noteElement.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showEditor(note);
    });

    notesList.appendChild(noteElement);
  });

  if (notesToRender.length === 0) {
    notesList.innerHTML = '<div class="no-notes">No notes found</div>';
  }
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
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  
  const titleInput = document.getElementById('titleInput');
  const contentInput = document.getElementById('contentInput');
  
  if (note) {
    currentEditingNote = note;
    titleInput.value = note.title || '';
  } else {
    currentEditingNote = null;
    titleInput.value = '';
  }

  const initializeEditor = () => {
    if (typeof window.tiptap === 'undefined') {
      console.log('Editor not loaded yet, waiting...');
      window.addEventListener('tiptap-ready', initializeEditor, { once: true });
      return;
    }
    
    try {
      if (editor) {
        editor.destroy();
        editor = null;
      }
      
      contentInput.innerHTML = '';
      
      editor = new window.tiptap.Editor({
        element: contentInput,
        extensions: [window.tiptap.StarterKit],
        content: note ? note.content : '',
        editable: true,
        autofocus: 'end',
        editorProps: {
          attributes: {
            class: 'ProseMirror',
          }
        }
      });

      setTimeout(() => {
        if (editor) {
          editor.setEditable(true);
          editor.commands.focus('end');
        }
      }, 50);

    } catch (error) {
      console.error('Failed to initialize editor:', error);
      contentInput.contentEditable = true;
      contentInput.innerHTML = note ? note.content : '';
    }
  };

  initializeEditor();
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
    const tabs = await chrome.tabs.query({ url: 'https://notes.toolworks.dev/*' });
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
  
  let content = '';
  if (editor && editor.isEditable) {
    content = editor.getHTML();
  } else {
    content = contentInput.innerHTML;
  }
  
  const now = Date.now();
  const noteData = {
    id: currentEditingNote?.id || now,
    title: titleInput.value,
    content: content || '',
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
  const searchInput = document.getElementById('searchInput');
  const notesList = document.getElementById('notesList');
  const newNoteButton = document.getElementById('newNote');
  const openWebappButton = document.getElementById('openWebapp');
  const saveNoteButton = document.getElementById('saveNote');
  const cancelEditButton = document.getElementById('cancelEdit');

  if (!searchInput || !notesList || !newNoteButton || !openWebappButton || !saveNoteButton || !cancelEditButton) {
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
        
        if (webappTabCheckInterval) {
          clearInterval(webappTabCheckInterval);
        }
        webappTabCheckInterval = setInterval(checkForWebappTab, 2000);
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

  newNoteButton.addEventListener('click', () => {
    showEditor();
  });

  openWebappButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://notes.toolworks.dev'
    });
    window.close();
  });

  const boldButton = document.getElementById('boldButton');
  const italicButton = document.getElementById('italicButton');
  const bulletListButton = document.getElementById('bulletListButton');

  boldButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  });

  italicButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  });

  bulletListButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  });

  cancelEditButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    requestAnimationFrame(() => {
      hideEditor();
    });
  });

  saveNoteButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveNote();
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
      tab.url.startsWith('https://notes.toolworks.dev')) {
    
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
  const tabs = await chrome.tabs.query({ url: 'https://notes.toolworks.dev/*' });
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