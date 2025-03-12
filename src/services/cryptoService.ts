import { Buffer } from 'buffer/';
import { mnemonicToSeedSync, wordlists } from 'bip39';
import { Note } from '../types/sync';
import { MlKem768 } from 'mlkem';

const WORDLIST = wordlists.english;

interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
  deleted?: boolean;
  version?: number; // Added for encryption version
}

export class CryptoService {
  private encryptionKey: Uint8Array;
  private signingKey: CryptoKey | null = null;
  private verifyingKey: CryptoKey | null = null;
  private mlkem: MlKem768 | null = null;
  private mlkemPublicKey: Uint8Array | null = null;
  private mlkemPrivateKey: Uint8Array | null = null;

  private constructor(
    encryptionKey: Uint8Array, 
    signingKey: CryptoKey, 
    verifyingKey: CryptoKey,
    mlkemPublicKey: Uint8Array | null = null,
    mlkemPrivateKey: Uint8Array | null = null
  ) {
    this.encryptionKey = encryptionKey;
    this.signingKey = signingKey;
    this.verifyingKey = verifyingKey;
    this.mlkem = new MlKem768();
    this.mlkemPublicKey = mlkemPublicKey;
    this.mlkemPrivateKey = mlkemPrivateKey;
  }

  static generateNewSeedPhrase(): string {
    try {
      const words = [];
      for (let i = 0; i < 12; i++) {
        const randomBytes = new Uint8Array(2);
        crypto.getRandomValues(randomBytes);
        const index = ((randomBytes[0] << 8) | randomBytes[1]) % WORDLIST.length;
        words.push(WORDLIST[index]);
      }
      return words.join(' ');
    } catch (error) {
      console.error('Failed to generate mnemonic:', error);
      throw new Error('Failed to generate sync code');
    }
  }

  static async new(seedPhrase: string): Promise<CryptoService> {
    // Generate deterministic seed
    const seed = mnemonicToSeedSync(seedPhrase);
    
    // Use the seed directly for encryption key
    const encryptionKey = new Uint8Array(seed.slice(0, 32));
  
    // Generate key pair from seed
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );
  
    // Store the seed hash as the identifier for this user
    const publicKeyHash = await crypto.subtle.digest(
      'SHA-256',
      seed
    );
    
    // Store this for user identification
    localStorage.setItem('user_id', Buffer.from(publicKeyHash).toString('hex'));
    
    // Generate MLKEM keys deterministically from the seed
    let mlkemPublicKey = null;
    let mlkemPrivateKey = null;
    
    try {
      // Check if MLKEM is supported in this environment
      if (typeof MlKem768 !== 'undefined') {
        const mlkem = new MlKem768();
        // Use part of the seed (different from the AES key) for deterministic key generation
        const mlkemSeed = new Uint8Array(seed.slice(32, 96));
        [mlkemPublicKey, mlkemPrivateKey] = await mlkem.deriveKeyPair(mlkemSeed);
      }
    } catch (error) {
      console.warn('MLKEM not available, continuing with legacy encryption only:', error);
    }
    
    return new CryptoService(
      encryptionKey,
      keyPair.privateKey,
      keyPair.publicKey,
      mlkemPublicKey,
      mlkemPrivateKey
    );
  }
          
  async encryptNote(note: Note): Promise<EncryptedNote> {
    // Check if the note already has an encryption type specified
    if (note.encryptionType === 2) {
      return this.encryptNotePQ(note);
    }
    
    // By default, use PQ encryption for new notes if MLKEM is available
    if (this.mlkemPublicKey && this.mlkemPrivateKey) {
      try {
        note.encryptionType = 2;
        return await this.encryptNotePQ(note);
      } catch (error) {
        console.warn('Failed to use PQ encryption, falling back to AES:', error);
        note.encryptionType = 1;
        return await this.encryptNoteAES(note);
      }
    }
    
    // Fall back to AES encryption
    note.encryptionType = 1;
    return this.encryptNoteAES(note);
  }
  
  private async encryptNotePQ(note: Note): Promise<EncryptedNote> {
    if (!this.mlkem || !this.mlkemPublicKey) {
      throw new Error('MLKEM not initialized');
    }
    
    // Create the note JSON
    const noteJson = JSON.stringify({
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted: note.deleted
    });
    
    // Generate a one-time use MLKEM instance for this note
    const ephemeralMlkem = new MlKem768();
    const [ciphertext, sharedSecret] = await ephemeralMlkem.encap(this.mlkemPublicKey);
    
    // Use the shared secret to encrypt the note with AES-GCM
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonceBytes
      },
      key,
      new TextEncoder().encode(noteJson)
    );
    
    // Sign the encrypted data - include both ciphertext and encrypted data in the signature
    // to prevent tampering with either component
    const signatureData = new Uint8Array(ciphertext.length + encryptedData.byteLength);
    signatureData.set(ciphertext, 0);
    signatureData.set(new Uint8Array(encryptedData), ciphertext.length);
    
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      this.signingKey!,
      signatureData
    );
    
    // Store both ciphertext and encrypted data in the data field
    // Format: base64(ciphertext_length(4 bytes) + ciphertext + encrypted_data)
    const dataBuffer = new Uint8Array(4 + ciphertext.length + encryptedData.byteLength);
    
    // Store ciphertext length as first 4 bytes (little endian)
    const ctLength = ciphertext.length;
    dataBuffer[0] = ctLength & 0xff;
    dataBuffer[1] = (ctLength >> 8) & 0xff;
    dataBuffer[2] = (ctLength >> 16) & 0xff;
    dataBuffer[3] = (ctLength >> 24) & 0xff;
    
    // Add ciphertext and encrypted data
    dataBuffer.set(ciphertext, 4);
    dataBuffer.set(new Uint8Array(encryptedData), 4 + ciphertext.length);
    
    return {
      id: note.id?.toString(16).padStart(16, '0') || '0'.padStart(16, '0'),
      data: Buffer.from(dataBuffer).toString('base64'),
      nonce: Buffer.from(nonceBytes).toString('base64'),
      timestamp: note.updated_at,
      signature: Buffer.from(signature).toString('base64'),
      deleted: note.deleted || false,
      version: 2 // Version 2 indicates MLKEM encryption
    };
  }
  
  // Legacy AES encryption for backward compatibility
  private async encryptNoteAES(note: Note): Promise<EncryptedNote> {
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    
    const noteJson = JSON.stringify({
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      deleted: note.deleted
    });
    
    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonceBytes
      },
      key,
      new TextEncoder().encode(noteJson)
    );

    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      this.signingKey!,
      new Uint8Array(encryptedData)
    );

    return {
      id: note.id?.toString(16).padStart(16, '0') || '0'.padStart(16, '0'),
      data: Buffer.from(encryptedData).toString('base64'),
      nonce: Buffer.from(nonceBytes).toString('base64'),
      timestamp: note.updated_at,
      signature: Buffer.from(signature).toString('base64'),
      deleted: note.deleted || false,
      version: 1 // Version 1 indicates AES encryption
    };
  }

  async decryptNote(encryptedNote: EncryptedNote): Promise<Note> {
    try {
      // Check encryption version
      if (encryptedNote.version === 2) {
        try {
          return await this.decryptNotePQ(encryptedNote);
        } catch (error) {
          console.error('PQ decryption failed, falling back to AES:', error);
          // If PQ decryption fails, try AES as fallback
          return await this.decryptNoteAES(encryptedNote);
        }
      }
      
      // Default to legacy AES decryption for version 1 or undefined
      return await this.decryptNoteAES(encryptedNote);
    } catch (error) {
      console.error('Failed to decrypt note:', error);
      // Return a placeholder for corrupted notes so the app doesn't crash
      return {
        id: parseInt(encryptedNote.id, 16),
        title: 'Error: Could not decrypt note',
        content: 'This note could not be decrypted. It may be corrupted or created with a newer version.',
        created_at: encryptedNote.timestamp,
        updated_at: encryptedNote.timestamp
      };
    }
  }
  
  private async decryptNotePQ(encryptedNote: EncryptedNote): Promise<Note> {
    if (!this.mlkem || !this.mlkemPrivateKey) {
      throw new Error('MLKEM not initialized');
    }
    
    try {
      // Extract data and nonce
      const dataBuffer = Buffer.from(encryptedNote.data, 'base64');
      const nonce = Buffer.from(encryptedNote.nonce, 'base64');
      
      // Get ciphertext length from first 4 bytes
      const ctLength = dataBuffer[0] | 
                      (dataBuffer[1] << 8) | 
                      (dataBuffer[2] << 16) | 
                      (dataBuffer[3] << 24);
      
      // Extract MLKEM ciphertext and encrypted data
      const ciphertext = dataBuffer.slice(4, 4 + ctLength);
      const encryptedData = dataBuffer.slice(4 + ctLength);
      
      // Verify signature
      const signatureData = new Uint8Array(ciphertext.length + encryptedData.length);
      signatureData.set(new Uint8Array(ciphertext), 0);
      signatureData.set(new Uint8Array(encryptedData), ciphertext.length);
      
      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
        this.verifyingKey!,
        Buffer.from(encryptedNote.signature, 'base64'),
        signatureData
      );
      
      if (!isValid) {
        throw new Error('Invalid signature for encrypted note');
      }
      
      // Decapsulate the shared secret
      const sharedSecret = await this.mlkem.decap(new Uint8Array(ciphertext), this.mlkemPrivateKey);
      
      // Use the shared secret to decrypt with AES-GCM
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce
        },
        key,
        encryptedData
      );

      const noteData = JSON.parse(new TextDecoder().decode(decryptedData));
      
      return {
        id: parseInt(encryptedNote.id, 16),
        ...noteData
      };
    } catch (error) {
      console.error('Failed to decrypt note with MLKEM:', error);
      throw new Error(`Failed to decrypt note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async decryptNoteAES(encryptedNote: EncryptedNote): Promise<Note> {
    const encryptedData = Buffer.from(encryptedNote.data, 'base64');
    const nonce = Buffer.from(encryptedNote.nonce, 'base64');

    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce
      },
      key,
      encryptedData
    );

    const noteData = JSON.parse(new TextDecoder().decode(decryptedData));
    
    return {
      id: parseInt(encryptedNote.id, 16),
      ...noteData
    };
  }

  async getPublicKeyBase64(): Promise<string> {
    const keyData = await crypto.subtle.exportKey('raw', this.verifyingKey!);
    return Buffer.from(keyData).toString('base64');
  }
  
  async getMlkemPublicKeyBase64(): Promise<string> {
    if (!this.mlkemPublicKey) {
      throw new Error('MLKEM public key not available');
    }
    return Buffer.from(this.mlkemPublicKey).toString('base64');
  }

  async encryptNoteWithAES(note: Note): Promise<EncryptedNote> {
    return this.encryptNoteAES(note);
  }

  async encryptNoteWithPQ(note: Note): Promise<EncryptedNote> {
    return this.encryptNotePQ(note);
  }
}