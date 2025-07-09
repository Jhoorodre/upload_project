import { Config } from '../types';

export class UploadService {
  private async uploadToCatbox(file: File, userhash: string): Promise<string> {
    const formData = new FormData();
    formData.append('fileToUpload', file);
    formData.append('userhash', userhash);
    formData.append('reqtype', 'fileupload');

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.text();
    if (result.startsWith('https://')) {
      return result.trim();
    }
    throw new Error(`Catbox upload failed: ${result}`);
  }

  private async uploadToImgBB(file: File, apiKey: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    }
    throw new Error(`ImgBB upload failed: ${result.error?.message || 'Unknown error'}`);
  }

  private async uploadToImgur(file: File, clientId: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        'Authorization': `Client-ID ${clientId}`,
      },
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.data.link;
    }
    throw new Error(`Imgur upload failed: ${result.data?.error || 'Unknown error'}`);
  }

  async uploadFile(file: File, hostName: string, config: Config): Promise<string> {
    const { hosts } = config;
    
    switch (hostName) {
      case 'catbox':
        if (!hosts.catbox.enabled || !hosts.catbox.userhash) {
          throw new Error('Catbox is not properly configured');
        }
        return this.uploadToCatbox(file, hosts.catbox.userhash);
      
      case 'imgbb':
        if (!hosts.imgbb) {
          throw new Error('ImgBB API key not configured');
        }
        return this.uploadToImgBB(file, hosts.imgbb);
      
      case 'imgur':
        if (!hosts.imgur) {
          throw new Error('Imgur client ID not configured');
        }
        return this.uploadToImgur(file, hosts.imgur);
      
      default:
        throw new Error(`Unsupported host: ${hostName}`);
    }
  }

  async uploadWithRetry(
    file: File, 
    hostName: string, 
    config: Config, 
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadFile(file, hostName, config);
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  getAvailableHosts(config: Config): string[] {
    const { hosts } = config;
    const available: string[] = [];
    
    // Catbox como prioridade
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

  async testConnectivity(config: Config): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    const hosts = this.getAvailableHosts(config);
    
    for (const host of hosts) {
      try {
        await this.uploadFile(testFile, host, config);
        results[host] = true;
      } catch (error) {
        results[host] = false;
      }
    }
    
    return results;
  }
}