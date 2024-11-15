import { Buffer } from 'buffer/';
import { mnemonicToSeedSync, wordlists } from 'bip39';
const WORDLIST = wordlists.english;

interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
  deleted?: boolean;
}

  interface Note {
    id?: number;
    title: string;
    content: string;
    created_at: number;
    updated_at: number;
    deleted?: boolean;
  }

export class CryptoService {
  private encryptionKey: Uint8Array;
  private signingKey: CryptoKey | null = null;
  private verifyingKey: CryptoKey | null = null;

  private constructor(encryptionKey: Uint8Array, signingKey: CryptoKey, verifyingKey: CryptoKey) {
    this.encryptionKey = encryptionKey;
    this.signingKey = signingKey;
    this.verifyingKey = verifyingKey;
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
      throw new Error('Failed to generate seed phrase');
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
  
    return new CryptoService(
      encryptionKey,
      keyPair.privateKey,
      keyPair.publicKey
    );
  }
          
  async encryptNote(note: Note): Promise<EncryptedNote> {
    if (!note.id) {
      throw new Error('Note must have an ID before encryption');
    }

    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));

    console.log('Encrypting note with data:', {
      id: note.id,
      deleted: note.deleted,
      timestamp: note.updated_at
    });  
    
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
      id: note.id.toString(16).padStart(16, '0'),
      data: Buffer.from(encryptedData).toString('base64'),
      nonce: Buffer.from(nonceBytes).toString('base64'),
      timestamp: note.updated_at,
      signature: Buffer.from(signature).toString('base64'),
      deleted: note.deleted || false
    };
  }

  async decryptNote(encryptedNote: EncryptedNote): Promise<Note> {
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
}