import { Buffer } from 'buffer/';
import { mnemonicToSeedSync, wordlists } from 'bip39';
import { Note } from '../types/sync';
import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { hkdf } from '@noble/hashes/hkdf';
import { bytesToHex } from '@noble/hashes/utils';

import { p256 } from '@noble/curves/p256';

const WORDLIST = wordlists.english;

interface EncryptedNote {
  id: string;
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
  deleted?: boolean;
  version?: number;
  signatureVersion?: number;
}

export class CryptoService {
  private encryptionKey: Uint8Array;
  private ecdsaPrivateKeyBytes: Uint8Array;
  private ecdsaPublicKeyBytes: Uint8Array;
  private mlKemPrivateKeyBytes: Uint8Array | null = null;
  private mlKemPublicKeyBytes: Uint8Array | null = null;
  private mlDsaPrivateKeyBytes: Uint8Array | null = null;
  private mlDsaPublicKeyBytes: Uint8Array | null = null;
  private constructor(
    encryptionKey: Uint8Array,
    ecdsaPrivateKeyBytes: Uint8Array,
    ecdsaPublicKeyBytes: Uint8Array,
    mlKemPrivateKeyBytes: Uint8Array | null,
    mlKemPublicKeyBytes: Uint8Array | null,
    mlDsaPrivateKeyBytes: Uint8Array | null,
    mlDsaPublicKeyBytes: Uint8Array | null
  ) {
    this.encryptionKey = encryptionKey;
    this.ecdsaPrivateKeyBytes = ecdsaPrivateKeyBytes;
    this.ecdsaPublicKeyBytes = ecdsaPublicKeyBytes;
    this.mlKemPrivateKeyBytes = mlKemPrivateKeyBytes;
    this.mlKemPublicKeyBytes = mlKemPublicKeyBytes;
    this.mlDsaPrivateKeyBytes = mlDsaPrivateKeyBytes;
    this.mlDsaPublicKeyBytes = mlDsaPublicKeyBytes;
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
    const seed = mnemonicToSeedSync(seedPhrase);
    const ikm = seed;
    const hash = sha512;

    const encryptionKey = hkdf(hash, ikm, undefined, new TextEncoder().encode('TrustyNotes-AES-KEY-V1'), 32);
  
    const ecdsaPrivateKeyBytes = hkdf(hash, ikm, undefined, new TextEncoder().encode('TrustyNotes-ECDSA-KEY-V1'), 32);
    const ecdsaPublicKeyBytes = p256.getPublicKey(ecdsaPrivateKeyBytes, true);

    const userIdHash = sha256(seed);
    localStorage.setItem('user_id', bytesToHex(userIdHash));
    
    let mlKemPrivateKeyBytes: Uint8Array | null = null;
    let mlKemPublicKeyBytes: Uint8Array | null = null;
    try {
      const mlKemSeed = hkdf(hash, ikm, undefined, new TextEncoder().encode('TrustyNotes-MLKEM-SEED-V1'), 64);
      const mlKemKeys = ml_kem768.keygen(mlKemSeed);
      mlKemPrivateKeyBytes = mlKemKeys.secretKey;
      mlKemPublicKeyBytes = mlKemKeys.publicKey;
      console.log('ML-KEM keys generated successfully using HKDF.');
    } catch (error) {
      console.warn('ML-KEM key generation failed:', error);
    }
    
    let mlDsaPrivateKeyBytes: Uint8Array | null = null;
    let mlDsaPublicKeyBytes: Uint8Array | null = null;
    try {
      const mlDsaSeed = hkdf(hash, ikm, undefined, new TextEncoder().encode('TrustyNotes-MLDSA-SEED-V1'), 32);
      const mlDsaKeys = ml_dsa65.keygen(mlDsaSeed);
      mlDsaPrivateKeyBytes = mlDsaKeys.secretKey;
      mlDsaPublicKeyBytes = mlDsaKeys.publicKey;
      console.log('ML-DSA keys generated successfully using HKDF.');
    } catch (error) {
      console.warn('ML-DSA key generation failed:', error);
    }

    return new CryptoService(
      encryptionKey,
      ecdsaPrivateKeyBytes,
      ecdsaPublicKeyBytes,
      mlKemPrivateKeyBytes,
      mlKemPublicKeyBytes,
      mlDsaPrivateKeyBytes,
      mlDsaPublicKeyBytes
    );
  }
          
  async encryptNote(note: Note): Promise<EncryptedNote> {
    if (this.mlKemPublicKeyBytes && this.mlDsaPrivateKeyBytes) {
      if (note.encryptionType !== 1) { 
        try {
          note.encryptionType = 2;
          return await this.encryptNotePQ(note);
        } catch (error) {
          console.warn('Failed to use PQ encryption, falling back to AES:', error);
          note.encryptionType = 1;
        }
      } 
    }
    note.encryptionType = 1;
    return this.encryptNoteAES(note);
  }
  
  private async encryptNotePQ(note: Note): Promise<EncryptedNote> {
    if (!this.mlKemPublicKeyBytes || !this.mlDsaPrivateKeyBytes) {
      throw new Error('ML-KEM public key or ML-DSA private key not available for PQ encryption.');
    }
    
    const noteJson = JSON.stringify({
      title: note.title, content: note.content, created_at: note.created_at, updated_at: note.updated_at, deleted: note.deleted
    });
    
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(this.mlKemPublicKeyBytes);
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'AES-GCM' }, false, ['encrypt']);
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBytes }, aesKey, new TextEncoder().encode(noteJson));
    
    const dataBuffer = new Uint8Array(4 + cipherText.length + encryptedData.byteLength);
    const ctLength = cipherText.length;
    dataBuffer[0] = ctLength & 0xff;
    dataBuffer[1] = (ctLength >> 8) & 0xff;
    dataBuffer[2] = (ctLength >> 16) & 0xff;
    dataBuffer[3] = (ctLength >> 24) & 0xff;
    dataBuffer.set(cipherText, 4);
    dataBuffer.set(new Uint8Array(encryptedData), 4 + cipherText.length);
        
    const dataBase64 = Buffer.from(dataBuffer).toString('base64');
    const nonceBase64 = Buffer.from(nonceBytes).toString('base64');
    const noteIdString = note.id?.toString(16).padStart(16, '0') || '0'.padStart(16, '0');
    const noteTimestamp = note.updated_at;
    const currentVersion = 2;
    const currentSignatureVersion = 2;

    const objectToSign = {
        id: noteIdString,
        version: currentVersion,
        signatureVersion: currentSignatureVersion,
        timestamp: noteTimestamp,
        nonce: nonceBase64,
        data: dataBase64,
        ...(note.deleted && { deleted: true }),
    };
    const canonicalString = JSON.stringify(objectToSign);
    const signedDataBytes = new TextEncoder().encode(canonicalString);
    const signature = ml_dsa65.sign(this.mlDsaPrivateKeyBytes, signedDataBytes);
        
    return {
      id: noteIdString,
      data: dataBase64, 
      nonce: nonceBase64,
      timestamp: noteTimestamp,
      signature: Buffer.from(signature).toString('base64'),
      deleted: note.deleted || false,
      version: currentVersion,
      signatureVersion: currentSignatureVersion
    };
  }
  
  private async encryptNoteAES(note: Note): Promise<EncryptedNote> {
    const nonceBytes = crypto.getRandomValues(new Uint8Array(12));
    const noteJson = JSON.stringify({
      title: note.title, content: note.content, created_at: note.created_at, updated_at: note.updated_at, deleted: note.deleted
    });
    
    const key = await crypto.subtle.importKey('raw', this.encryptionKey, { name: 'AES-GCM' }, false, ['encrypt']);
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBytes }, key, new TextEncoder().encode(noteJson));

    const encryptedDataBytes = new Uint8Array(encryptedData);
    const dataBase64 = Buffer.from(encryptedDataBytes).toString('base64');
    const nonceBase64 = Buffer.from(nonceBytes).toString('base64');
    const noteIdString = note.id?.toString(16).padStart(16, '0') || '0'.padStart(16, '0');
    const noteTimestamp = note.updated_at;
    const currentVersion = 1;
    const currentSignatureVersion = 1;

    const objectToSign = {
        id: noteIdString,
        version: currentVersion,
        signatureVersion: currentSignatureVersion,
        timestamp: noteTimestamp,
        nonce: nonceBase64,
        data: dataBase64,
        ...(note.deleted && { deleted: true }),
    };
    const canonicalString = JSON.stringify(objectToSign);
    const signedDataBytes = new TextEncoder().encode(canonicalString);
    const dataHash = sha256(signedDataBytes); 
    const signatureObj = p256.sign(dataHash, this.ecdsaPrivateKeyBytes);
    const signatureBytes = signatureObj.toCompactRawBytes(); 

    return {
      id: noteIdString,
      data: dataBase64,
      nonce: nonceBase64,
      timestamp: noteTimestamp,
      signature: Buffer.from(signatureBytes).toString('base64'), 
      deleted: note.deleted || false,
      version: currentVersion,
      signatureVersion: currentSignatureVersion 
    };
  }

  async decryptNote(encryptedNote: EncryptedNote): Promise<Note> {
    try {
      if (encryptedNote.version === 2) {
        try {
          return await this.decryptNotePQ(encryptedNote);
        } catch (error) {
          console.error('PQ decryption failed:', error);
          if ((error as any)?.isSignatureError) {
             throw error; 
          } else {
              console.warn('Attempting AES fallback decryption after non-signature PQ error...');
              try {
                  console.error('AES fallback is unsafe for PQ errors, re-throwing original PQ error.');
                  throw error;
              } catch (aesError) {
                  console.error('AES fallback decryption also failed:', aesError);
                  throw error; 
              }
          }
        }
      }
      return await this.decryptNoteAES(encryptedNote);
    } catch (error) {
      console.error('Failed to decrypt note:', error);
      return {
        id: parseInt(encryptedNote.id, 16), title: 'Error: Could not decrypt note', content: `Decryption failed: ${error instanceof Error ? error.message : String(error)}`, created_at: encryptedNote.timestamp, updated_at: encryptedNote.timestamp, deleted: false
      };
    }
  }
  
  private async decryptNotePQ(encryptedNote: EncryptedNote): Promise<Note> {
    if (!this.mlKemPrivateKeyBytes || !this.mlDsaPublicKeyBytes) {
      throw new Error('ML-KEM private key or ML-DSA public key not available for PQ decryption.');
    }
    
    let decryptedData: ArrayBuffer;
    let signatureDataToVerify: Uint8Array;
    let signatureBytes: Uint8Array;

    try {
        const dataBuffer = Buffer.from(encryptedNote.data, 'base64');
        const nonce = Buffer.from(encryptedNote.nonce, 'base64');
        signatureBytes = Buffer.from(encryptedNote.signature, 'base64');

        const ctLength = dataBuffer[0] | (dataBuffer[1] << 8) | (dataBuffer[2] << 16) | (dataBuffer[3] << 24);
        if (ctLength < 0 || ctLength > dataBuffer.length - 4) {
            throw new Error(`Invalid ciphertext length extracted: ${ctLength}`);
        }
        const ciphertext = dataBuffer.slice(4, 4 + ctLength);
        const encryptedAesData = dataBuffer.slice(4 + ctLength);

        signatureDataToVerify = new Uint8Array(ciphertext.length + encryptedAesData.length);
        signatureDataToVerify.set(ciphertext, 0);
        signatureDataToVerify.set(encryptedAesData, ciphertext.length);

        const sharedSecret = ml_kem768.decapsulate(ciphertext, this.mlKemPrivateKeyBytes);

        const aesKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'AES-GCM' }, false, ['decrypt']);
        decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, encryptedAesData);

    } catch (decryptError) {
        console.error('Error during PQ decryption (KEM/AES phase):', decryptError);
        const errorMsg = decryptError instanceof Error ? decryptError.message : String(decryptError);
        throw new Error(`PQ Decryption failed (KEM/AES phase): ${errorMsg}`);
    }
      
    if (encryptedNote.signatureVersion !== 2) {
        console.error(`Invalid signature version for PQ note: Expected 2, got ${encryptedNote.signatureVersion}`);
        const sigVerError = new Error(`Invalid signature version for PQ note: Expected 2, got ${encryptedNote.signatureVersion}`);
        (sigVerError as any).isSignatureError = true; 
        throw sigVerError;
    }
    
    const signedObject = {
        id: encryptedNote.id,
        version: encryptedNote.version,
        signatureVersion: encryptedNote.signatureVersion,
        timestamp: encryptedNote.timestamp,
        nonce: encryptedNote.nonce,
        data: encryptedNote.data,
        ...(encryptedNote.deleted && { deleted: true }),
    };
    const canonicalString = JSON.stringify(signedObject);
    const signedDataBytes = new TextEncoder().encode(canonicalString);
    
    try {
        if (!this.mlDsaPublicKeyBytes) {
             throw new Error('ML-DSA public key not available for verification.');
        }
        const isValid = ml_dsa65.verify(this.mlDsaPublicKeyBytes, signedDataBytes, signatureBytes);
        
        if (!isValid) {
            console.error('ML-DSA signature verification failed.');
            const sigError = new Error('ML-DSA signature verification failed.');
            (sigError as any).isSignatureError = true;
            throw sigError;
        }
    } catch (verifyError) {
        console.error('ML-DSA signature verification process error:', verifyError);
        const procError = new Error(`ML-DSA signature verification process failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
        (procError as any).isSignatureError = true;
        throw procError;
    }

    const noteData = JSON.parse(new TextDecoder().decode(decryptedData));
    return { id: parseInt(encryptedNote.id, 16), ...noteData };
  }
  
  private async decryptNoteAES(encryptedNote: EncryptedNote): Promise<Note> {
    let encryptedDataBytes: Uint8Array;
    let nonce: Uint8Array;
    let signatureBytes: Uint8Array | undefined;
    
    try {
        encryptedDataBytes = Buffer.from(encryptedNote.data, 'base64');
        nonce = Buffer.from(encryptedNote.nonce, 'base64');
        if (encryptedNote.signature) {
            signatureBytes = Buffer.from(encryptedNote.signature, 'base64');
        }
    } catch(e) {
        throw new Error(`Failed to decode base64 data/nonce/signature for AES note: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    let decryptedData: ArrayBuffer;
    try {
        const key = await crypto.subtle.importKey('raw', this.encryptionKey, { name: 'AES-GCM' }, false, ['decrypt']);
        decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, encryptedDataBytes);
    } catch (decryptError) {
        console.error('AES decryption failed:', decryptError);
        throw new Error(`AES decryption failed: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
    }
    if ((encryptedNote.version === 1 || typeof encryptedNote.version === 'undefined') && signatureBytes) {
        if (!this.ecdsaPublicKeyBytes) {
            throw new Error('ECDSA public key not available for verification.');
        }

        const signedObject = {
            id: encryptedNote.id,
            version: encryptedNote.version || 1,
            signatureVersion: encryptedNote.signatureVersion || 1,
            timestamp: encryptedNote.timestamp,
            nonce: encryptedNote.nonce,
            data: encryptedNote.data,
            ...(encryptedNote.deleted && { deleted: true }),
        };
        const canonicalString = JSON.stringify(signedObject);
        const signedDataBytes = new TextEncoder().encode(canonicalString);

        const dataHash = sha256(signedDataBytes); 

        try {
            const isValid = p256.verify(signatureBytes, dataHash, this.ecdsaPublicKeyBytes);
            if (!isValid) {
                console.error('AES note ECDSA signature verification failed.');
                const sigError = new Error('AES note ECDSA signature verification failed.');
                (sigError as any).isSignatureError = true;
                throw sigError;
            }
        } catch (verifyError) {
            console.error('AES note ECDSA signature verification process error:', verifyError);
            const procError = new Error(`AES note ECDSA signature verification process failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
            (procError as any).isSignatureError = true;
            throw procError;
        }
    } else if (signatureBytes) {
        console.warn(`Signature found on note with version ${encryptedNote.version}, but AES decryption path expects version 1. Skipping verification.`);
    }

    const noteData = JSON.parse(new TextDecoder().decode(decryptedData));
    return { id: parseInt(encryptedNote.id, 16), ...noteData };
  }

  getEcdsaPublicKeyHex(): string {
      if (!this.ecdsaPublicKeyBytes) {
         throw new Error('ECDSA public key not available');
      }
      return bytesToHex(this.ecdsaPublicKeyBytes);
  }
  
  getMlkemPublicKeyBase64(): string {
    if (!this.mlKemPublicKeyBytes) {
      throw new Error('ML-KEM public key not available');
    }
    return Buffer.from(this.mlKemPublicKeyBytes).toString('base64');
  }

  getMlDsaPublicKeyBase64(): string {
    if (!this.mlDsaPublicKeyBytes) {
      throw new Error('ML-DSA public key not available');
    }
    return Buffer.from(this.mlDsaPublicKeyBytes).toString('base64');
  }

  async encryptNoteWithAES(note: Note): Promise<EncryptedNote> {
    return this.encryptNoteAES(note);
  }
  async encryptNoteWithPQ(note: Note): Promise<EncryptedNote> {
    return this.encryptNotePQ(note);
  }

  isPQCryptoAvailable(): boolean {
      return !!(this.mlKemPublicKeyBytes && this.mlKemPrivateKeyBytes && 
              this.mlDsaPublicKeyBytes && this.mlDsaPrivateKeyBytes);
  }
}