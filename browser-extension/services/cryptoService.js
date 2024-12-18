export class CryptoService {
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