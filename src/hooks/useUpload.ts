import { useState, useCallback, useRef } from 'react';
import { UseUploadResult, FilePreview, MangaData, ChapterData, Config, UploadResult, UploadProgress } from '../types';
import { UploadService, GitHubService, CompressionService } from '../services';

export function useUpload(): UseUploadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const cancelRef = useRef(false);
  
  const uploadService = new UploadService();
  const githubService = new GitHubService();
  const compressionService = new CompressionService();

  const cancel = useCallback(() => {
    cancelRef.current = true;
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
    cancelRef.current = false;
    
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
      if (cancelRef.current) break;
      
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
        
        const url = await uploadService.uploadWithRetry(fileToUpload, hostName, config, 3);
        
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
    
    if (urls.length > 0 && !cancelRef.current) {
      try {
        indexUrl = await githubService.updateIndex(config.github, mangaData, chapterData, urls);
      } catch (error) {
        console.error('Erro ao atualizar índice:', error);
      }
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
  }, [uploadService, githubService, compressionService, updateProgress]);

  return {
    upload,
    isLoading,
    progress,
    cancel
  };
}