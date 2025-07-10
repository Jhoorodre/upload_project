// ===== TIPOS PRINCIPAIS =====

export interface MangaData {
  title: string;
  description: string;
  artist: string;
  author: string;
  cover: string;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  categories?: string[];
}

export interface ChapterData {
  number: string;
  title: string;
  volume: string;
  group: string;
}

export interface HostConfig {
  catbox: {
    enabled: boolean;
    userhash: string;
  };
  imgbb: string;
  imgur: string;
}

export interface UploadStrategy {
  current: 'single_host' | 'round_robin' | 'redundant';
  preferred_host: 'catbox' | 'imgbb' | 'imgur';
  fallback_hosts: string[];
}

export interface Config {
  github: {
    pat: string;
    owner: string;
    repo: string;
  };
  hosts: HostConfig;
  strategies: UploadStrategy;
  compression: {
    enabled: boolean;
    quality: number;
    maxWidth: number;
    maxHeight: number;
  };
}

export interface UploadProgress {
  fileName: string;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'retrying';
  url: string;
  error: string;
  retryCount: number;
  progress: number;
}

export interface FilePreview {
  file: File;
  preview: string;
  id: string;
  compressed?: boolean;
  originalSize: number;
  compressedSize?: number;
}

export interface UploadResult {
  success: boolean;
  urls: string[];
  indexUrl?: string;
  error?: string;
  stats: {
    totalFiles: number;
    successCount: number;
    failCount: number;
    totalSize: number;
    duration: number;
  };
}

export interface HostStats {
  name: string;
  enabled: boolean;
  uploads: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  lastUsed: string | null;
  status: 'healthy' | 'warning' | 'error';
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// ===== TIPOS DE CONTEXTO =====

export interface ConfigContextType {
  config: Config;
  updateConfig: (path: string, value: any) => void;
  resetConfig: () => void;
  exportConfig: () => string;
  importConfig: (configJson: string) => boolean;
}

export interface UploadContextType {
  selectedFiles: FilePreview[];
  uploadProgress: UploadProgress[];
  isUploading: boolean;
  uploadResult: UploadResult | null;
  addFiles: (files: FileList) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  startUpload: (mangaData: MangaData, chapterData: ChapterData) => Promise<void>;
  retryUpload: (fileId: string) => Promise<string>;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ===== TIPOS DE COMPONENTES =====

export interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface InputProps {
  label?: string;
  error?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'email' | 'number';
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

// ===== TIPOS DE SERVIÇOS =====

export interface UploadService {
  uploadFile: (file: File, hostName: string, config: Config) => Promise<string>;
  uploadWithRetry: (file: File, hostName: string, config: Config, maxRetries?: number) => Promise<string>;
  getAvailableHosts: (config: Config) => string[];
  testConnectivity: (config: Config) => Promise<Record<string, boolean>>;
}

export interface GitHubService {
  testConnection: (config: Config['github']) => Promise<boolean>;
  getJsonFile: (owner: string, repo: string, path: string, pat: string) => Promise<{ content: any; sha: string | null }>;
  saveJsonFile: (owner: string, repo: string, path: string, content: any, pat: string, sha?: string) => Promise<string>;
  listRepositoryContents: (owner: string, repo: string, path: string, pat: string) => Promise<any[]>;
  deleteJsonFile: (owner: string, repo: string, path: string, pat: string, sha: string) => Promise<void>;
}

export interface CompressionService {
  compressImage: (file: File, config: Config['compression']) => Promise<File>;
  calculateCompressionRatio: (original: File, compressed: File) => number;
  getOptimalQuality: (fileSize: number) => number;
}

// ===== TIPOS DE HOOKS =====

export interface UseLocalStorageResult<T> {
  value: T;
  setValue: (value: T) => void;
  removeValue: () => void;
}

export interface UseUploadResult {
  upload: (files: FilePreview[], mangaData: MangaData, chapterData: ChapterData, config: Config) => Promise<UploadResult>;
  isLoading: boolean;
  progress: UploadProgress[];
  cancel: () => void;
}

export interface UseNotificationResult {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

// ===== TIPOS DE UTILITÁRIOS =====

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
}

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

// ===== CONSTANTES =====

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
  RETRYING: 'retrying'
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
} as const;

export const HOSTS = {
  CATBOX: 'catbox',
  IMGBB: 'imgbb',
  IMGUR: 'imgur'
} as const;

export const MANGA_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  HIATUS: 'hiatus',
  CANCELLED: 'cancelled'
} as const;