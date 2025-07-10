import { UploadService } from '../../services/UploadService';
import { Config } from '../../types';

// Mock global fetch
global.fetch = jest.fn();

describe('UploadService', () => {
  let uploadService: UploadService;
  let mockConfig: Config;

  beforeEach(() => {
    uploadService = new UploadService();
    mockConfig = {
      github: {
        pat: 'test-token',
        owner: 'test-owner',
        repo: 'test-repo'
      },
      hosts: {
        catbox: {
          enabled: true,
          userhash: 'test-hash'
        },
        imgbb: 'test-api-key',
        imgur: 'test-client-id'
      },
      strategies: {
        current: 'single_host',
        preferred_host: 'catbox',
        fallback_hosts: ['imgbb', 'imgur']
      },
      compression: {
        enabled: false,
        quality: 80,
        maxWidth: 1920,
        maxHeight: 1080
      }
    };
    
    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('getAvailableHosts', () => {
    it('should return all configured hosts', () => {
      const hosts = uploadService.getAvailableHosts(mockConfig);
      
      expect(hosts).toContain('catbox');
      expect(hosts).toContain('imgbb');
      expect(hosts).toContain('imgur');
    });

    it('should exclude disabled catbox', () => {
      mockConfig.hosts.catbox.enabled = false;
      const hosts = uploadService.getAvailableHosts(mockConfig);
      
      expect(hosts).not.toContain('catbox');
      expect(hosts).toContain('imgbb');
      expect(hosts).toContain('imgur');
    });

    it('should exclude hosts without API keys', () => {
      mockConfig.hosts.imgbb = '';
      mockConfig.hosts.imgur = '';
      const hosts = uploadService.getAvailableHosts(mockConfig);
      
      expect(hosts).toContain('catbox');
      expect(hosts).not.toContain('imgbb');
      expect(hosts).not.toContain('imgur');
    });
  });

  describe('testConnectivity', () => {
    it('should test all available hosts', async () => {
      // Mock successful responses
      (fetch as jest.Mock).mockResolvedValue({
        ok: true
      });

      const results = await uploadService.testConnectivity(mockConfig);
      
      expect(results).toHaveProperty('catbox');
      expect(results).toHaveProperty('imgbb');
      expect(results).toHaveProperty('imgur');
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle CORS errors for catbox', async () => {
      (fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

      const results = await uploadService.testConnectivity(mockConfig);
      
      expect(results.catbox).toBe('❌ CORS bloqueado - Use ImgBB/Imgur');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const results = await uploadService.testConnectivity(mockConfig);
      
      expect(results.catbox).toBe(false);
      expect(results.imgbb).toBe(false);
      expect(results.imgur).toBe(false);
    });
  });

  describe('uploadFile', () => {
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

    it('should throw error for unsupported host', async () => {
      await expect(
        uploadService.uploadFile(mockFile, 'unsupported', mockConfig)
      ).rejects.toThrow('Unsupported host: unsupported');
    });

    it('should throw error for unconfigured catbox', async () => {
      mockConfig.hosts.catbox.enabled = false;
      
      await expect(
        uploadService.uploadFile(mockFile, 'catbox', mockConfig)
      ).rejects.toThrow('Catbox is not properly configured');
    });

    it('should throw error for missing ImgBB API key', async () => {
      mockConfig.hosts.imgbb = '';
      
      await expect(
        uploadService.uploadFile(mockFile, 'imgbb', mockConfig)
      ).rejects.toThrow('ImgBB API key not configured');
    });

    it('should throw error for missing Imgur client ID', async () => {
      mockConfig.hosts.imgur = '';
      
      await expect(
        uploadService.uploadFile(mockFile, 'imgur', mockConfig)
      ).rejects.toThrow('Imgur client ID not configured');
    });
  });

  describe('uploadWithRetry', () => {
    const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

    it('should retry on failure', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('https://catbox.moe/test.jpg')
        });

      const result = await uploadService.uploadWithRetry(mockFile, 'catbox', mockConfig, 3);
      
      expect(result).toBe('https://catbox.moe/test.jpg');
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw final error after max retries', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Persistent error'));

      await expect(
        uploadService.uploadWithRetry(mockFile, 'catbox', mockConfig, 2)
      ).rejects.toThrow('Persistent error');
      
      expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});