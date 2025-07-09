import { ValidationResult, FileValidationOptions } from '../types';

export const validateFiles = (
  files: FileList,
  options: FileValidationOptions = {}
): ValidationResult => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxFiles = 100
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

  if (!config.github?.filename) {
    errors.push('GitHub Filename é obrigatório');
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
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
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
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};