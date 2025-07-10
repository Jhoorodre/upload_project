import React, { createContext, useState, useCallback, ReactNode, useContext, useMemo, useEffect } from 'react';
import { UploadContextType, FilePreview, MangaData, ChapterData, UploadResult } from '../types';
import { ConfigContext } from './ConfigContext';
import { useUpload } from '../hooks/useUpload';
import { validateFiles, generateFileId, createFilePreview } from '../utils';
import { CompressionService, UploadService } from '../services';

export const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps) {
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const configContext = useContext(ConfigContext);
  const { upload, isLoading, progress } = useUpload();
  const compressionService = useMemo(() => new CompressionService(), []);
  
  // Cleanup previews on unmount and when files change
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  if (!configContext) {
    throw new Error('UploadProvider must be used within a ConfigProvider');
  }

  const { config } = configContext;

  const addFiles = useCallback(async (files: FileList) => {
    const validation = validateFiles(files);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const filePromises = Array.from(files).map(async (file) => {
      const preview = await createFilePreview(file);
      let compressed = false;
      let compressedSize = file.size;
      
      if (config.compression.enabled) {
        try {
          const compressedFile = await compressionService.compressImage(file, config.compression);
          if (compressedFile.size < file.size) {
            compressed = true;
            compressedSize = compressedFile.size;
          }
        } catch (error) {
          console.warn('Compression failed for file:', file.name);
        }
      }
      
      return {
        file,
        preview,
        id: generateFileId(),
        compressed,
        originalSize: file.size,
        compressedSize: compressed ? compressedSize : undefined
      };
    });

    const newFiles = await Promise.all(filePromises);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [config.compression, compressionService]);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    setUploadResult(null);
  }, []);

  const startUpload = useCallback(async (mangaData: MangaData, chapterData: ChapterData) => {
    if (selectedFiles.length === 0) {
      throw new Error('Nenhum arquivo selecionado');
    }

    try {
      const result = await upload(selectedFiles, mangaData, chapterData, config);
      setUploadResult(result);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [selectedFiles, upload, config]);

  const retryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = selectedFiles.find(f => f.id === fileId);
    if (!fileToRetry) {
      throw new Error('Arquivo não encontrado para retry');
    }

    try {
      const availableHosts = new UploadService().getAvailableHosts(config);
      if (availableHosts.length === 0) {
        throw new Error('Nenhum host disponível');
      }

      let fileToUpload = fileToRetry.file;
      if (config.compression.enabled) {
        fileToUpload = await compressionService.compressImage(fileToUpload, config.compression);
      }

      const hostName = config.strategies.preferred_host || availableHosts[0];
      const url = await new UploadService().uploadWithRetry(fileToUpload, hostName, config, 3);
      
      // Update progress state if needed
      return url;
    } catch (error) {
      // TODO: Replace with proper error logging
      // console.error('Retry failed:', error);
      throw error;
    }
  }, [selectedFiles, config, compressionService]);

  const contextValue: UploadContextType = {
    selectedFiles,
    uploadProgress: progress,
    isUploading: isLoading,
    uploadResult,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    retryUpload
  };

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}