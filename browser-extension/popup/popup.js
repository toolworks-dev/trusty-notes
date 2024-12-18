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

async function getWebAppSettings() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://notes.toolworks.dev/*' });
    if (tabs.length === 0) {
      console.debug('Web app tab not found');
      return null;
    }

    const tab = tabs[0];

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      console.debug('Content script already injected or injection failed:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SYNC_SETTINGS' });
      
      if (response?.error) {
        console.error('Error getting web app data:', response.error);
        return null;
      }

      if (response?.settings?.seed_phrase) {
        cryptoService = await CryptoService.new(response.settings.seed_phrase);
        
        await chrome.storage.local.set({
          seed_phrase: response.settings.seed_phrase
        });

        if (response.notes?.length > 0) {
          const encrypted = await cryptoService.encrypt(response.notes);
          await chrome.storage.local.set({ 
            encrypted_notes: encrypted,
            lastUpdated: Date.now()
          });
          
          notes = response.notes;
          renderNotes(notes);
        }

        return response.settings;
      }
    } catch (error) {
      console.error('Failed to communicate with content script:', error);
      return null;
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

    noteElement.addEventListener('click', async () => {
      const url = new URL('https://notes.toolworks.dev');
      url.searchParams.set('loadNote', JSON.stringify({
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at
      }));
      url.searchParams.set('autoload', 'true');
      
      chrome.tabs.create({ url: url.toString() });
      window.close();
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

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('searchInput');
  const notesList = document.getElementById('notesList');
  const newNoteButton = document.getElementById('newNote');
  const openWebappButton = document.getElementById('openWebapp');
  const setupButton = document.getElementById('setupButton');

  if (!searchInput || !notesList || !newNoteButton || !openWebappButton || !setupButton) {
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
        setupButton.style.display = 'none';
      } else {
        setupButton.style.display = 'block';
      }
    } else {
      setupButton.style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading notes:', error);
    notesList.innerHTML = `
      <div class="error-message">
        Please set up the extension in the web app first
      </div>
    `;
    setupButton.style.display = 'block';
  }

  setupButton.addEventListener('click', async () => {
    try {
      const tab = await chrome.tabs.create({
        url: 'https://notes.toolworks.dev/?openSync=true'
      });
      
      chrome.runtime.onMessage.addListener(async function settingsListener(message) {
        if (message.type === 'SYNC_SETTINGS_UPDATED' && message.settings?.seed_phrase) {
          try {
            cryptoService = await CryptoService.new(message.settings.seed_phrase);
            
            await chrome.storage.local.set({
              seed_phrase: message.settings.seed_phrase
            });

            chrome.runtime.onMessage.removeListener(settingsListener);
          } catch (error) {
            console.error('Failed to process settings update:', error);
          }
        }
      });

      window.close();
    } catch (error) {
      console.error('Failed to open settings:', error);
    }
  });

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) || 
      note.content.toLowerCase().includes(searchTerm)
    );
    renderNotes(filteredNotes);
  });

  newNoteButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://notes.toolworks.dev'
    });
    window.close();
  });

  openWebappButton.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://notes.toolworks.dev'
    });
    window.close();
  });
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'NOTES_UPDATED' && message.notes) {
    await handleNotesUpdate(message.notes);
  } else if (message.type === 'NOTES_UPDATED_IN_STORAGE' && message.notes) {
    notes = message.notes;
    renderNotes(notes);
  }
}); 