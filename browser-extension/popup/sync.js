// Sync notes with the server
async function syncNotes() {
  try {
    const statusElement = document.getElementById('sync-status');
    statusElement.textContent = 'Syncing...';
    
    // Get crypto information
    const cryptoResponse = await chrome.runtime.sendMessage({ action: 'getCryptoStatus' });
    if (cryptoResponse.error) {
      throw new Error(cryptoResponse.error);
    }
    
    // Get notes from storage
    const storedNotes = await chrome.storage.local.get('notes');
    const notes = storedNotes.notes || [];
    
    // Encrypt notes for sync
    const encryptedNotes = [];
    for (const note of notes) {
      if (note.pending_sync) {
        const encrypted = await chrome.runtime.sendMessage({ 
          action: 'encrypt', 
          data: {
            title: note.title,
            content: note.content,
            created_at: note.created_at,
            updated_at: note.updated_at
          }
        });
        
        if (encrypted.error) throw new Error(encrypted.error);
        
        encryptedNotes.push({
          id: note.id.toString(16).padStart(16, '0'),
          data: encrypted.encrypted.data,
          nonce: encrypted.encrypted.iv,
          timestamp: note.updated_at,
          version: encrypted.encrypted.version
        });
        
        // Mark as synced
        note.pending_sync = false;
      }
    }
    
    // Get MLKEM public key if available
    let pqPublicKey = null;
    if (cryptoResponse.isPQAvailable) {
      const keyResponse = await chrome.runtime.sendMessage({ action: 'getMlkemPublicKey' });
      if (!keyResponse.error) {
        pqPublicKey = keyResponse.publicKey;
      }
    }
    
    // Send to server
    const serverUrl = 'https://sync.trustynotes.app'; // Get from settings
    const publicKey = cryptoResponse.publicKey;
    
    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_key: publicKey,
        notes: encryptedNotes,
        client_version: '0.3.0',
        sync_type: encryptedNotes.length > 0 ? 'full' : 'check',
        pq_public_key: pqPublicKey
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const syncResult = await response.json();
    
    // Process server notes (decrypt and store)
    if (syncResult.notes && syncResult.notes.length > 0) {
      for (const serverNote of syncResult.notes) {
        const decrypted = await chrome.runtime.sendMessage({
          action: 'decrypt',
          encrypted: {
            data: serverNote.data,
            iv: serverNote.nonce,
            version: serverNote.version || 1
          }
        });
        
        if (decrypted.error) {
          console.error('Failed to decrypt note:', decrypted.error);
          continue;
        }
        
        // Update or add note
        const noteId = parseInt(serverNote.id, 16);
        const existingIndex = notes.findIndex(n => n.id === noteId);
        
        const decryptedNote = {
          id: noteId,
          ...decrypted.decrypted,
          pending_sync: false,
          encryptionType: serverNote.version || 1
        };
        
        if (existingIndex >= 0) {
          notes[existingIndex] = decryptedNote;
        } else {
          notes.push(decryptedNote);
        }
      }
      
      // Save updated notes
      await chrome.storage.local.set({ notes });
    }
    
    statusElement.textContent = 'Sync complete!';
    setTimeout(() => {
      statusElement.textContent = '';
    }, 3000);
    
  } catch (error) {
    console.error('Sync failed:', error);
    const statusElement = document.getElementById('sync-status');
    statusElement.textContent = `Sync failed: ${error.message}`;
  }
} 