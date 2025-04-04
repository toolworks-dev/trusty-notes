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
  
  //const DEFAULT_SERVER = 'https://sync.trustynotes.app';
  
  export class ApiService {
    private static getEndpoint(serverUrl: string, path: string): string {
      return `${serverUrl}/api${path}`;
    }
  
    static async healthCheck(serverUrl: string): Promise<boolean> {
      // Check if we're currently rate limited
      const rateLimitUntil = localStorage.getItem('rate_limit_until');
      if (rateLimitUntil && Date.now() < parseInt(rateLimitUntil, 10)) {
        console.log('Skipping health check due to active rate limit');
        throw new Error('Rate limited, please try again later');
      }
      
      try {
        const endpoint = this.getEndpoint(serverUrl, '/health');
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000;
          localStorage.setItem('rate_limit_until', (Date.now() + waitTime).toString());
          return false;
        }
        
        return response.ok;
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    }
    
    static async syncNotes(
      serverUrl: string, 
      publicKey: string, 
      encryptedNotes: EncryptedNote[],
      pqPublicKey: string | null = null
    ): Promise<SyncResponse> {
      const endpoint = this.getEndpoint(serverUrl, '/sync');
      
      console.log('Syncing notes:', {
        serverUrl,
        endpoint,
        notesCount: encryptedNotes.length,
        hasPublicKey: !!publicKey,
        hasPQKey: !!pqPublicKey
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
            client_version: '0.6.0',
            sync_type: encryptedNotes.length > 0 ? 'full' : 'check',
            pq_public_key: pqPublicKey
          }),
        });
    
        console.log('Server response:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
    
        // Handle rate limiting with retry-after header
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000;
          console.log(`Rate limited. Server requested wait of ${waitTime/1000} seconds`);
          
          // Store the rate limit info for future requests
          localStorage.setItem('rate_limit_until', (Date.now() + waitTime).toString());
          
          throw new Error(`Too many requests, please try again after ${waitTime/1000} seconds`);
        }
    
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