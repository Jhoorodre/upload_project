import { Config } from '../types';
import { ProxyService } from './ProxyService';

export class UploadService {
  private async uploadToCatbox(file: File, userhash: string, signal?: AbortSignal): Promise<string> {
    const formData = new FormData();
    formData.append('fileToUpload', file);
    formData.append('userhash', userhash);
    formData.append('reqtype', 'fileupload');

    try {
      const response = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: formData,
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.text();
      if (result.startsWith('https://')) {
        return result.trim();
      }
      throw new Error(`Catbox upload failed: ${result}`);
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('⚠️ ERRO CORS: Catbox bloqueado! Use uma extensão CORS (CORS Unblock) ou configure ImgBB/Imgur como alternativa.');
      }
      throw error;
    }
  }

  private async uploadToImgBB(file: File, apiKey: string, signal?: AbortSignal): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      signal
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    }
    throw new Error(`ImgBB upload failed: ${result.error?.message || 'Unknown error'}`);
  }

  private async uploadToImgur(file: File, clientId: string, signal?: AbortSignal): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${clientId}`,
      },
      body: formData,
      mode: 'cors',
      signal
    });

    const result = await response.json();
    if (result.success) {
      return result.data.link;
    }
    throw new Error(`Imgur upload failed: ${result.data?.error || 'Unknown error'}`);
  }

  async uploadFile(file: File, hostName: string, config: Config, signal?: AbortSignal): Promise<string> {
    const { hosts } = config;
    
    switch (hostName) {
      case 'catbox':
        if (!hosts.catbox.enabled || !hosts.catbox.userhash) {
          throw new Error('Catbox is not properly configured');
        }
        return this.uploadToCatbox(file, hosts.catbox.userhash, signal);
      
      case 'imgbb':
        if (!hosts.imgbb) {
          throw new Error('ImgBB API key not configured');
        }
        return this.uploadToImgBB(file, hosts.imgbb, signal);
      
      case 'imgur':
        if (!hosts.imgur) {
          throw new Error('Imgur client ID not configured');
        }
        return this.uploadToImgur(file, hosts.imgur, signal);
      
      default:
        throw new Error(`Unsupported host: ${hostName}`);
    }
  }

  // Retry configuration
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly RETRY_MULTIPLIER = 2;

  async uploadWithRetry(
    file: File, 
    hostName: string, 
    config: Config, 
    maxRetries: number = 3,
    signal?: AbortSignal
  ): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadFile(file, hostName, config, signal);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = Math.pow(this.RETRY_MULTIPLIER, attempt) * this.INITIAL_RETRY_DELAY;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(lastError!.message);
  }

  getAvailableHosts(config: Config): string[] {
    const { hosts } = config;
    const available: string[] = [];
    
    // Catbox como prioridade (padrão do sistema)
    if (hosts.catbox.enabled && hosts.catbox.userhash) {
      available.push('catbox');
    }
    if (hosts.imgbb) {
      available.push('imgbb');
    }
    if (hosts.imgur) {
      available.push('imgur');
    }
    
    return available;
  }

  async testConnectivity(config: Config): Promise<Record<string, boolean | string>> {
    const results: Record<string, boolean | string> = {};
    const hosts = this.getAvailableHosts(config);
    
    for (const host of hosts) {
      try {
        switch (host) {
          case 'catbox':
            try {
              const catboxResponse = await fetch('https://catbox.moe', { method: 'HEAD' });
              results[host] = catboxResponse.ok;
            } catch (error) {
              if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                results[host] = '❌ CORS bloqueado - Use ImgBB/Imgur';
              } else {
                results[host] = false;
              }
            }
            break;
          case 'imgbb':
            const imgbbResponse = await fetch('https://api.imgbb.com', { method: 'HEAD' });
            results[host] = imgbbResponse.ok;
            break;
          case 'imgur':
            const imgurResponse = await fetch('https://api.imgur.com', { method: 'HEAD' });
            results[host] = imgurResponse.ok;
            break;
          default:
            results[host] = false;
        }
      } catch (error) {
        results[host] = false;
      }
    }
    
    return results;
  }
}