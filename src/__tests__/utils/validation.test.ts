import {
  validateFiles,
  formatFileSize,
  generateFileId,
  isImageFile,
  validateConfig
} from '../../utils/validation';

// Mock File constructor for tests
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['x'.repeat(size)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('Validation Utils', () => {
  describe('validateFiles', () => {
    it('should accept valid image files', () => {
      const mockFile = createMockFile('test.jpg', 1024, 'image/jpeg');
      const files = [mockFile] as any; // Simular FileList
      const options = { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png'] };
      
      const result = validateFiles(files, options);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const mockFile = createMockFile('large.jpg', 1024 * 1024, 'image/jpeg');
      const files = [mockFile] as any;
      const options = { maxSize: 500 * 1024, allowedTypes: ['image/jpeg'] };
      
      const result = validateFiles(files, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Arquivo 1: Tamanho máximo de 500.0 KB excedido');
    });

    it('should reject unsupported file types', () => {
      const mockFile = createMockFile('test.txt', 1024, 'text/plain');
      const files = [mockFile] as any;
      const options = { allowedTypes: ['image/jpeg', 'image/png'] };
      
      const result = validateFiles(files, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Arquivo 1: Tipo de arquivo não permitido (text/plain)');
    });

    it('should reject too many files', () => {
      const files = Array.from({ length: 5 }, (_, i) => 
        createMockFile(`test${i}.jpg`, 1024, 'image/jpeg')
      ) as any;
      const options = { maxFiles: 3 };
      
      const result = validateFiles(files, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Máximo de 3 arquivos permitidos');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle zero size', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
    });

    it('should handle large sizes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
    });
  });

  describe('generateFileId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate IDs without deprecated substr', () => {
      const id = generateFileId();
      // IDs devem ser válidos e não usar substring deprecated
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('isImageFile', () => {
    it('should identify image files correctly', () => {
      const jpegFile = createMockFile('test.jpg', 1024, 'image/jpeg');
      const pngFile = createMockFile('test.png', 1024, 'image/png');
      const textFile = createMockFile('test.txt', 1024, 'text/plain');
      
      expect(isImageFile(jpegFile)).toBe(true);
      expect(isImageFile(pngFile)).toBe(true);
      expect(isImageFile(textFile)).toBe(false);
    });

    it('should handle different image types', () => {
      const gifFile = createMockFile('test.gif', 1024, 'image/gif');
      const webpFile = createMockFile('test.webp', 1024, 'image/webp');
      const bmpFile = createMockFile('test.bmp', 1024, 'image/bmp');
      
      expect(isImageFile(gifFile)).toBe(true);
      expect(isImageFile(webpFile)).toBe(true);
      expect(isImageFile(bmpFile)).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const validConfig = {
        github: {
          pat: 'test-token',
          owner: 'test-owner',
          repo: 'test-repo'
        },
        hosts: {
          catbox: { enabled: true, userhash: 'test-hash' },
          imgbb: 'test-key',
          imgur: 'test-client'
        }
      };
      
      const result = validateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config with missing GitHub PAT', () => {
      const invalidConfig = {
        github: {
          owner: 'test-owner',
          repo: 'test-repo'
        }
      };
      
      const result = validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GitHub Personal Access Token é obrigatório');
    });

    it('should reject config with missing GitHub owner', () => {
      const invalidConfig = {
        github: {
          pat: 'test-token',
          repo: 'test-repo'
        }
      };
      
      const result = validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GitHub Owner é obrigatório');
    });

    it('should reject config with missing GitHub repo', () => {
      const invalidConfig = {
        github: {
          pat: 'test-token',
          owner: 'test-owner'
        }
      };
      
      const result = validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GitHub Repository é obrigatório');
    });
  });
});