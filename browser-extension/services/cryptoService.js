export class CryptoService {
  constructor(key) {
    this.key = key;
    this.mlkem = null;
    this.mlkemPublicKey = null;
    this.mlkemPrivateKey = null;
  }

  static async new(seedPhrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(seedPhrase);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const key = new Uint8Array(hash);
    
    const cryptoService = new CryptoService(key);
    
    // Attempt to initialize MLKEM
    try {
      const mlkemModule = await import('mlkem');
      if (mlkemModule && mlkemModule.MlKem768) {
        cryptoService.mlkem = new mlkemModule.MlKem768();
        
        // Generate a deterministic MLKEM key pair from the seed
        // Use a different part of the seed than what's used for AES
        const seedBytes = encoder.encode(seedPhrase + "MLKEM");
        const mlkemSeed = new Uint8Array(await crypto.subtle.digest('SHA-256', seedBytes));
        
        // Derive key pair deterministically
        const [publicKey, privateKey] = await cryptoService.mlkem.deriveKeyPair(mlkemSeed);
        cryptoService.mlkemPublicKey = publicKey;
        cryptoService.mlkemPrivateKey = privateKey;
        
        console.log('MLKEM initialized successfully');
      }
    } catch (error) {
      console.warn('Failed to initialize MLKEM:', error);
    }
    
    return cryptoService;
  }

  async encrypt(data) {
    if (this.mlkem && this.mlkemPublicKey) {
      try {
        return await this.encryptPQ(data);
      } catch (err) {
        console.warn('PQ encryption failed, falling back to AES:', err);
        return this.encryptAES(data);
      }
    } else {
      return this.encryptAES(data);
    }
  }

  async encryptAES(data) {
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
      data: Array.from(new Uint8Array(encrypted)),
      version: 1
    };
  }

  async encryptPQ(data) {
    try {
      if (!this.mlkem || !this.mlkemPublicKey) {
        throw new Error('MLKEM not initialized');
      }
      
      // Encapsulate to generate a shared secret with MLKEM
      const [ciphertext, sharedSecret] = await this.mlkem.encap(this.mlkemPublicKey);
      
      // Use the shared secret with AES-GCM for the actual encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
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
      
      // Format the data with ciphertext length prefix
      // Format: ctLength(4 bytes) + ciphertext + encrypted_data
      const encryptedArray = new Uint8Array(encrypted);
      const dataBuffer = new Uint8Array(4 + ciphertext.length + encryptedArray.length);
      
      // Store ciphertext length as 4 bytes (little-endian)
      const ctLength = ciphertext.length;
      dataBuffer[0] = ctLength & 0xFF;
      dataBuffer[1] = (ctLength >> 8) & 0xFF;
      dataBuffer[2] = (ctLength >> 16) & 0xFF;
      dataBuffer[3] = (ctLength >> 24) & 0xFF;
      
      // Copy ciphertext and encrypted data into the buffer
      dataBuffer.set(ciphertext, 4);
      dataBuffer.set(encryptedArray, 4 + ciphertext.length);
      
      return {
        iv: Array.from(iv),
        data: Array.from(dataBuffer),
        version: 2
      };
    } catch (error) {
      console.error('PQ encryption failed:', error);
      throw error; // Let the caller handle the fallback
    }
  }

  async decrypt(encrypted) {
    // Handle version 2 (PQ) if present
    if (encrypted.version === 2) {
      try {
        return await this.decryptPQ(encrypted);
      } catch (err) {
        console.error('PQ decryption failed, trying AES fallback:', err);
        return this.decryptAES(encrypted);
      }
    }
    // Default to AES
    return this.decryptAES(encrypted);
  }

  async decryptAES(encrypted) {
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

  async decryptPQ(encrypted) {
    try {
      if (!this.mlkem || !this.mlkemPrivateKey) {
        throw new Error('MLKEM not initialized');
      }
      
      const dataBuffer = new Uint8Array(encrypted.data);
      const iv = new Uint8Array(encrypted.iv);
      
      // Extract ciphertext length from the first 4 bytes (little-endian)
      const ctLength = dataBuffer[0] | 
                      (dataBuffer[1] << 8) | 
                      (dataBuffer[2] << 16) | 
                      (dataBuffer[3] << 24);
      
      // Extract MLKEM ciphertext and encrypted data
      const ciphertext = dataBuffer.slice(4, 4 + ctLength);
      const encryptedData = dataBuffer.slice(4 + ctLength);
      
      // Decapsulate the shared secret
      const sharedSecret = await this.mlkem.decap(ciphertext, this.mlkemPrivateKey);
      
      // Use the shared secret to decrypt with AES-GCM
      const key = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );
      
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (error) {
      console.error('PQ decryption failed:', error);
      throw error; // Let the caller handle the fallback
    }
  }
  
  // Utility method to check if PQ encryption is available
  isPQAvailable() {
    return !!this.mlkem && !!this.mlkemPublicKey && !!this.mlkemPrivateKey;
  }
  
  // Get the MLKEM public key as Base64 for sync
  async getMlkemPublicKeyBase64() {
    if (!this.mlkemPublicKey) {
      throw new Error('MLKEM public key not available');
    }
    
    // Convert to base64
    return btoa(String.fromCharCode.apply(null, this.mlkemPublicKey));
  }
  
  // Create an encrypted message with signature (similar to main app)
  async createEncryptedMessage(data) {
    // Use the appropriate encryption method based on availability
    const encrypted = await this.encrypt(data);
    
    // Add a timestamp and message type
    return {
      ...encrypted,
      timestamp: Date.now(),
      type: encrypted.version === 2 ? 'pq-encrypted' : 'aes-encrypted'
    };
  }
} 