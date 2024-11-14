  interface EncryptedNote {
    id: string;
    data: string;
    nonce: string;
    timestamp: number;
    signature: string;
  }
  
  interface SyncResponse {
    notes: EncryptedNote[];
  }
  
  const DEFAULT_SERVER = 'https://notes-sync.0xgingi.com';
  
  export class ApiService {
    private static getEndpoint(serverUrl: string, path: string): string {
      // Always use the proxy for the default server
      if (serverUrl === DEFAULT_SERVER) {
        return `/api${path}`;
      }
      // For custom servers, use the full URL
      return `${serverUrl}/api${path}`;
    }
  
    static async healthCheck(serverUrl: string): Promise<boolean> {
      try {
        const endpoint = this.getEndpoint(serverUrl, '/health');
        console.log('Health check endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Health check failed');
        }
        
        const data = await response.json();
        return data.status === 'healthy';
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    }
  
    static async syncNotes(
      serverUrl: string, 
      publicKey: string, 
      encryptedNotes: EncryptedNote[]
    ): Promise<SyncResponse> {
      const endpoint = this.getEndpoint(serverUrl, '/sync');
      console.log('Sync endpoint:', endpoint);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            public_key: publicKey,
            notes: encryptedNotes,
            client_version: '0.1.1'
          }),
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Sync failed: ${errorText}`);
        }
  
        return response.json();
      } catch (error) {
        console.error('Sync error:', error);
        throw error;
      }
    }
    
    static async validateServer(url: string): Promise<boolean> {
      try {
        const endpoint = this.getEndpoint(url, '/health');
        console.log('Validate server endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          return false;
        }
        
        const data = await response.json();
        return data.status === 'healthy' && data.database === 'connected';
      } catch (error) {
        console.error('Server validation failed:', error);
        return false;
      }
    }
  }