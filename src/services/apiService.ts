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
  
  //const DEFAULT_SERVER = 'https://notes-sync.toolworks.dev';
  
  export class ApiService {
    private static getEndpoint(serverUrl: string, path: string): string {
      return `${serverUrl}/api${path}`;
    }
  
    static async healthCheck(serverUrl: string): Promise<boolean> {
      try {
        const endpoint = this.getEndpoint(serverUrl, '/health');
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Health check failed');
        }
        
        const data = await response.json();
        return data.status === 'healthy' && data.database === 'connected';
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
      
      console.log('Syncing notes:', {
        serverUrl,
        endpoint,
        notesCount: encryptedNotes.length,
        hasPublicKey: !!publicKey
      });
      
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
    
        console.log('Server response:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Sync failed with status ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Sync response data:', data);
    
        // Handle the server's response format
        if (!data || !Array.isArray(data.notes)) {
          console.error('Invalid response format:', data);
          throw new Error('Invalid server response format');
        }
    
        return {
          notes: data.notes
        };
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