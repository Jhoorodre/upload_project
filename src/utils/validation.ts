import { ValidationResult, FileValidationOptions } from '../types';

// Constants
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_FILES = 100;
const DEFAULT_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const validateFiles = (
  files: FileList,
  options: FileValidationOptions = {}
): ValidationResult => {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedTypes = DEFAULT_ALLOWED_IMAGE_TYPES,
    maxFiles = DEFAULT_MAX_FILES
  } = options;

  const errors: string[] = [];
  const fileArray = Array.from(files);

  if (fileArray.length > maxFiles) {
    errors.push(`Máximo de ${maxFiles} arquivos permitidos`);
  }

  fileArray.forEach((file, index) => {
    if (file.size > maxSize) {
      errors.push(`Arquivo ${index + 1}: Tamanho máximo de ${formatFileSize(maxSize)} excedido`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push(`Arquivo ${index + 1}: Tipo de arquivo não permitido (${file.type})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateConfig = (config: any): ValidationResult => {
  const errors: string[] = [];

  if (!config.github?.pat) {
    errors.push('GitHub Personal Access Token é obrigatório');
  }

  if (!config.github?.owner) {
    errors.push('GitHub Owner é obrigatório');
  }

  if (!config.github?.repo) {
    errors.push('GitHub Repository é obrigatório');
  }


  const hasAnyHost = config.hosts?.catbox?.enabled || config.hosts?.imgbb || config.hosts?.imgur;
  if (!hasAnyHost) {
    errors.push('Pelo menos um host de imagem deve estar configurado');
  }

  if (config.hosts?.catbox?.enabled && !config.hosts?.catbox?.userhash) {
    errors.push('Catbox userhash é obrigatório quando Catbox está habilitado');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatFileSize = (bytes: number): string => {
  const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];
const BYTES_PER_UNIT = 1024;
  let size = bytes;
  let unitIndex = 0;

  while (size >= BYTES_PER_UNIT && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

export const generateFileId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    const cleanup = () => {
      reader.abort();
    };
    
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    
    reader.onerror = (error) => {
      cleanup();
      reject(error);
    };
    
    reader.onabort = () => {
      reject(new Error('File reading was aborted'));
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};