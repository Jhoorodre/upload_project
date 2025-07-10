import { useState, useCallback, useRef, useMemo } from 'react';
import { UseUploadResult, FilePreview, MangaData, ChapterData, Config, UploadResult, UploadProgress } from '../types';
import { UploadService, CompressionService } from '../services';

export function useUpload(): UseUploadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const uploadService = useMemo(() => new UploadService(), []);
  const compressionService = useMemo(() => new CompressionService(), []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const updateProgress = useCallback((fileName: string, updates: Partial<UploadProgress>) => {
    setProgress(prev => prev.map(p => 
      p.fileName === fileName ? { ...p, ...updates } : p
    ));
  }, []);

  const upload = useCallback(async (
    files: FilePreview[],
    mangaData: MangaData,
    chapterData: ChapterData,
    config: Config
  ): Promise<UploadResult> => {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    
    const startTime = Date.now();
    const initialProgress: UploadProgress[] = files.map(file => ({
      fileName: file.file.name,
      status: 'pending',
      url: '',
      error: '',
      retryCount: 0,
      progress: 0
    }));
    
    setProgress(initialProgress);
    
    const urls: string[] = [];
    const availableHosts = uploadService.getAvailableHosts(config);
    
    if (availableHosts.length === 0) {
      throw new Error('Nenhum host disponível para upload');
    }
    
    let successCount = 0;
    let failCount = 0;
    let totalSize = 0;
    
    for (let i = 0; i < files.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      const filePreview = files[i];
      const fileName = filePreview.file.name;
      
      updateProgress(fileName, { status: 'uploading', progress: 0 });
      
      try {
        let fileToUpload = filePreview.file;
        
        if (config.compression.enabled) {
          fileToUpload = await compressionService.compressImage(fileToUpload, config.compression);
        }
        
        totalSize += fileToUpload.size;
        
        const hostName = config.strategies.current === 'single_host' 
          ? config.strategies.preferred_host 
          : availableHosts[i % availableHosts.length];
        
        updateProgress(fileName, { progress: 25 });
        
        const url = await uploadService.uploadWithRetry(fileToUpload, hostName, config, 3, abortControllerRef.current?.signal);
        
        updateProgress(fileName, { 
          status: 'success', 
          url, 
          progress: 100 
        });
        
        urls.push(url);
        successCount++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        updateProgress(fileName, { 
          status: 'error', 
          error: errorMessage,
          progress: 0
        });
        failCount++;
      }
    }
    
    let indexUrl: string | undefined;
    
    // Nota: Sistema agora gerencia JSONs individuais através da interface principal
    // A atualização do JSON é feita diretamente no MangaUploader.tsx
    if (urls.length > 0 && !abortControllerRef.current?.signal.aborted) {
      // TODO: Implementar atualização do JSON individual se necessário
      indexUrl = undefined; // Por enquanto não retorna URL de índice
    }
    
    const duration = Date.now() - startTime;
    const result: UploadResult = {
      success: successCount > 0,
      urls,
      indexUrl,
      error: failCount > 0 ? `${failCount} arquivos falharam no upload` : undefined,
      stats: {
        totalFiles: files.length,
        successCount,
        failCount,
        totalSize,
        duration
      }
    };
    
    setIsLoading(false);
    return result;
  }, [uploadService, compressionService, updateProgress]);

  return {
    upload,
    isLoading,
    progress,
    cancel
  };
}