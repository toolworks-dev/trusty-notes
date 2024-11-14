import { Buffer } from 'buffer/';
import { mnemonicToSeedSync, wordlists } from 'bip39';
const WORDLIST = wordlists.english;
interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

interface Note {
  id?: number;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
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
      // Generate 12 words
      const words = [];
      for (let i = 0; i < 12; i++) {
        // Generate 2 random bytes for each word (0-2047 range)
        const randomBytes = new Uint8Array(2);
        crypto.getRandomValues(randomBytes);
        
        // Convert bytes to index (ensuring it's within valid range)
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
    // Generate seed from mnemonic
    const seed = mnemonicToSeedSync(seedPhrase);
    const encryptionKey = new Uint8Array(seed.slice(0, 32));
    
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );
  
    return new CryptoService(
      encryptionKey,
      keyPair.privateKey,
      keyPair.publicKey
    );
  }

  async encryptNote(note: Note): Promise<EncryptedNote> {
    // Generate random nonce
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    
    // Convert note to JSON string
    const noteJson = JSON.stringify(note);
    
    // Import encryption key
    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonceBytes
      },
      key,
      new TextEncoder().encode(noteJson)
    );

    // Sign the encrypted data
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      this.signingKey!,
      new Uint8Array(encryptedData)
    );
  
    return {
      id: Buffer.from(BigInt(note.id || 0).toString(16).padStart(16, '0'), 'hex').toString('base64'),
      data: Buffer.from(encryptedData).toString('base64'),
      nonce: Buffer.from(nonceBytes).toString('base64'),
      timestamp: note.updated_at,
      signature: Buffer.from(signature).toString('base64')
    };
  }

  async decryptNote(encrypted: EncryptedNote): Promise<Note> {
    const encryptedData = Buffer.from(encrypted.data, 'base64');
    const nonceBytes = Buffer.from(encrypted.nonce, 'base64');

    // Import encryption key
    const key = await crypto.subtle.importKey(
      'raw',
      this.encryptionKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonceBytes
      },
      key,
      encryptedData
    );

    const note: Note = JSON.parse(new TextDecoder().decode(decryptedData));
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      this.verifyingKey!,
      Buffer.from(encrypted.signature, 'base64'),
      encryptedData
    );
  
    if (!isValid) {
      throw new Error('Invalid signature');
    }
  
    // Verify note ID matches
    const noteIdBytes = Buffer.from(encrypted.id, 'base64');
    const expectedId = Number(BigInt('0x' + noteIdBytes.toString('hex')));

    if (note.id !== expectedId) {
      throw new Error('Note ID mismatch');
    }

    return note;
  }

  async getPublicKeyBase64(): Promise<string> {
    const keyData = await crypto.subtle.exportKey('raw', this.verifyingKey!);
    return Buffer.from(keyData).toString('base64');
  }
}