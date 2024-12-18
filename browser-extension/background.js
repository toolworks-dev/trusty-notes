// CryptoService implementation
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

let cryptoService = null;

async function encryptAndStoreNotes(notes) {
  try {
    if (!cryptoService) {
      const settings = await chrome.storage.local.get(['seed_phrase']);
      if (!settings.seed_phrase) {
        console.error('No seed phrase set');
        return;
      }
      cryptoService = await CryptoService.new(settings.seed_phrase);
    }

    const encrypted = await cryptoService.encrypt(notes);
    await chrome.storage.local.set({ 
      encrypted_notes: encrypted,
      lastUpdated: Date.now()
    });

    chrome.runtime.sendMessage({
      type: 'NOTES_UPDATED_IN_STORAGE',
      notes: notes
    });
  } catch (error) {
    console.error('Error encrypting and storing notes:', error);
  }
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'NOTES_UPDATED') {
    await encryptAndStoreNotes(message.notes);
  } else if (message.type === 'SYNC_SETTINGS_UPDATED') {
    try {
      await chrome.storage.local.set({
        seed_phrase: message.settings.seed_phrase
      });
      cryptoService = await CryptoService.new(message.settings.seed_phrase);

      if (message.notes?.length > 0) {
        await encryptAndStoreNotes(message.notes);
      }
    } catch (error) {
      console.error('Error storing sync settings:', error);
    }
  }
  return true;
});

chrome.runtime.onMessageExternal.addListener(
  async (message, sender, sendResponse) => {
    if (sender.origin === "https://notes.toolworks.dev") {
      if (message.type === 'SYNC_SETTINGS_UPDATED') {
        try {
          await chrome.storage.local.set({
            seed_phrase: message.settings.seed_phrase
          });
          cryptoService = await CryptoService.new(message.settings.seed_phrase);
          
          if (message.notes?.length > 0) {
            await encryptAndStoreNotes(message.notes);
          }
          
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error storing sync settings:', error);
          sendResponse({ success: false, error: error.message });
        }
      }
    }
    return true;
  }
);

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({ 
      encrypted_notes: null,
      lastUpdated: null,
      seed_phrase: null
    });
  }
}); 