import React, { useState, useContext, useCallback, useEffect } from 'react';
import { ConfigContext, UploadContext, NotificationContext } from './contexts';
import { Button, Input, Select, Card, ProgressBar } from './components';
import { MangaData, ChapterData } from './types';
import { validateConfig, formatFileSize } from './utils';
import { useNotification } from './hooks';
import { GitHubService } from './services/GitHubService';

export function MangaUploader() {
  const configContext = useContext(ConfigContext);
  const uploadContext = useContext(UploadContext);
  const notificationContext = useContext(NotificationContext);
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('upload');
  const [uploadMode, setUploadMode] = useState<'files' | 'batch'>('files');
  
  // Estados simplificados para gerenciamento JSON
  const [selectedJsonFile, setSelectedJsonFile] = useState<string>('');
  const [currentJsonData, setCurrentJsonData] = useState<Record<string, any> | null>(null);
  const [isJsonLoaded, setIsJsonLoaded] = useState(false);
  const [jsonFileSha, setJsonFileSha] = useState<string | null>(null);
  const [isRenamingJson, setIsRenamingJson] = useState(false);
  const [newJsonName, setNewJsonName] = useState('');
  
  // Estados para navegação do repositório
  const [repositoryContents, setRepositoryContents] = useState<Array<{ name: string; path: string; type: string }>>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRepoBrowser, setShowRepoBrowser] = useState(false);
  
  // Estados para upload em lote
  interface BatchStructure {
    mangaName: string;
    chapters: Array<{
      name: string;
      files: Array<{ name: string; file: File }>;
    }>;
  }
  const [batchStructure, setBatchStructure] = useState<BatchStructure | null>(null);

  const githubService = new GitHubService();
  const [mangaData, setMangaData] = useState<MangaData>({
    title: '',
    description: '',
    artist: '',
    author: '',
    cover: '',
    status: 'ongoing',
    categories: []
  });
  const [chapterData, setChapterData] = useState<ChapterData>({
    number: '',
    title: '',
    volume: '',
    group: ''
  });

  const { notifications, removeNotification } = notificationContext || { notifications: [], removeNotification: () => {} };

  // Função para preencher metadados a partir do JSON
  const fillMetadataFromJson = useCallback((jsonData: any) => {
    if (!jsonData || typeof jsonData !== 'object') return;

    // Verificar se é estrutura flat ou nested
    const hasDirectProperties = jsonData.title || jsonData.author || jsonData.artist;
    
    if (hasDirectProperties) {
      // Estrutura flat
      setMangaData({
        title: jsonData.title || '',
        author: jsonData.author || '',
        artist: jsonData.artist || '',
        description: jsonData.description || '',
        cover: jsonData.cover || '',
        status: jsonData.status || 'ongoing',
        categories: jsonData.categories || []
      });
    } else {
      // Estrutura nested - usar primeira chave
      const keys = Object.keys(jsonData);
      if (keys.length > 0) {
        const firstManga = jsonData[keys[0]];
        if (firstManga && typeof firstManga === 'object') {
          setMangaData({
            title: firstManga.title || keys[0] || '',
            author: firstManga.author || '',
            artist: firstManga.artist || '',
            description: firstManga.description || '',
            cover: firstManga.cover || '',
            status: firstManga.status || 'ongoing',
            categories: firstManga.categories || []
          });
        }
      }
    }
  }, []);

  // Função simplificada para carregar JSON
  const loadJsonFile = useCallback(async (filePath: string) => {
    if (!configContext) {
      showError('Configuração não disponível');
      return;
    }

    const { config } = configContext;
    if (!config.github.pat || !config.github.owner || !config.github.repo) {
      showError('Configure o GitHub primeiro');
      return;
    }

    setIsLoading(true);
    try {
      const result = await githubService.getJsonFile(
        config.github.owner,
        config.github.repo,
        filePath,
        config.github.pat
      );
      
      setCurrentJsonData(result.content);
      setJsonFileSha(result.sha || null); // Handle null SHA for new files
      setSelectedJsonFile(filePath);
      setIsJsonLoaded(true);
      
      // Auto-preencher metadados
      fillMetadataFromJson(result.content);
      
      showSuccess(`✅ JSON carregado: ${filePath.split('/').pop()}`);
    } catch (error) {
      showError('Erro ao carregar JSON: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
    }
  }, [configContext, githubService, showSuccess, showError, fillMetadataFromJson]);

  // Função para salvar JSON
  const saveJsonFile = useCallback(async () => {
    if (!configContext || !isJsonLoaded || !selectedJsonFile) {
      showError('Nenhum JSON carregado para salvar');
      return;
    }

    if (!mangaData.title) {
      showError('Título do manga é obrigatório');
      return;
    }

    const { config } = configContext;
    try {
      // Criar estrutura flat para novo JSON
      const updatedJsonData = {
        title: mangaData.title,
        description: mangaData.description || '',
        author: mangaData.author || '',
        artist: mangaData.artist || '',
        cover: mangaData.cover || '',
        status: mangaData.status || 'ongoing',
        chapters: currentJsonData?.chapters || {}
      };

      // Sempre usar o SHA atual se disponível
      const currentSha = jsonFileSha;
      
      await githubService.saveJsonFile(
        config.github.owner,
        config.github.repo,
        selectedJsonFile,
        updatedJsonData,
        config.github.pat,
        currentSha || undefined
      );

      setCurrentJsonData(updatedJsonData);
      showSuccess('✅ JSON salvo com sucesso!');
      
      // Aguardar reload para garantir consistência
      try {
        await loadJsonFile(selectedJsonFile);
      } catch (error) {
        console.warn('Erro ao recarregar SHA:', error);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('422')) {
        showError('Erro: Conflito de versão. Recarregue o JSON e tente novamente.');
      } else {
        showError('Erro ao salvar JSON: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  }, [configContext, isJsonLoaded, selectedJsonFile, mangaData, currentJsonData, jsonFileSha, githubService, showSuccess, showError, loadJsonFile]);

  // Função para carregar conteúdo do repositório
  const loadRepositoryContents = useCallback(async (path: string = '') => {
    if (!configContext) {
      showError('Configuração não disponível');
      return;
    }

    const { config } = configContext;
    if (!config.github.pat || !config.github.owner || !config.github.repo) {
      showError('Configuração do GitHub incompleta');
      return;
    }

    setIsLoading(true);
    try {
      const contents = await githubService.listRepositoryContents(
        config.github.owner,
        config.github.repo,
        path,
        config.github.pat
      );
      
      setRepositoryContents(contents);
      setCurrentPath(path);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao carregar repositório');
    } finally {
      setIsLoading(false);
    }
  }, [configContext, githubService, showError]);

  // Função para criar novo JSON
  const createNewJson = useCallback(async () => {
    if (!configContext) {
      showError('Configuração não disponível');
      return;
    }

    const { config } = configContext;
    if (!config.github.pat || !config.github.owner || !config.github.repo) {
      showError('Configure o GitHub primeiro (PAT, owner, repo)');
      return;
    }

    if (!mangaData.title || !mangaData.title.trim()) {
      showError('Preencha o título do manga primeiro');
      return;
    }

    const sanitizedTitle = mangaData.title.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    
    const newFileName = `${sanitizedTitle}.json`;
    const newFilePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;

    const newJsonData = {
      title: mangaData.title.trim(),
      description: mangaData.description || '',
      author: mangaData.author || '',
      artist: mangaData.artist || '',
      cover: mangaData.cover || '',
      status: mangaData.status || 'ongoing',
      chapters: {}
    };

    try {
      // Criar diretamente o arquivo JSON - se existir, o GitHub retornará erro 422
      await githubService.saveJsonFile(
        config.github.owner,
        config.github.repo,
        newFilePath,
        newJsonData,
        config.github.pat
      );

      // Atualizar estado imediatamente para feedback instantâneo
      setSelectedJsonFile(newFilePath);
      setCurrentJsonData(newJsonData);
      setIsJsonLoaded(true);
      setJsonFileSha(null);
      
      // Atualizar lista do repositório imediatamente
      const newItem = {
        name: newFileName,
        path: newFilePath,
        type: 'file'
      };
      setRepositoryContents(prev => [...prev, newItem]);
      
      showSuccess(`✅ Novo JSON criado: ${newFileName}`);
      
      // Recarregar SHA em background
      loadJsonFile(newFilePath).catch(error => {
        console.warn('Erro ao recarregar JSON criado:', error);
      });
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('422')) {
          showError(`Já existe um arquivo chamado "${newFileName}". Use um título diferente.`);
        } else {
          showError('Erro ao criar JSON: ' + error.message);
        }
      } else {
        showError('Erro desconhecido ao criar JSON');
      }
    }
  }, [mangaData, currentPath, configContext, githubService, showSuccess, showError, loadRepositoryContents, loadJsonFile]);

  // Função para renomear JSON
  const renameJsonFile = useCallback(async () => {
    if (!configContext || !isJsonLoaded || !selectedJsonFile || !newJsonName.trim()) {
      showError('Dados insuficientes para renomear arquivo');
      return;
    }

    const { config } = configContext;
    const pathParts = selectedJsonFile.split('/');
    pathParts[pathParts.length - 1] = `${newJsonName.trim()}.json`;
    const newFilePath = pathParts.join('/');

    if (newFilePath === selectedJsonFile) {
      setIsRenamingJson(false);
      return;
    }

    try {
      // Criar arquivo com novo nome
      await githubService.saveJsonFile(
        config.github.owner,
        config.github.repo,
        newFilePath,
        currentJsonData,
        config.github.pat
      );

      // Deletar arquivo antigo (se conseguir criar o novo)
      try {
        await githubService.deleteJsonFile(
          config.github.owner,
          config.github.repo,
          selectedJsonFile,
          config.github.pat,
          jsonFileSha!
        );
      } catch (deleteError) {
        console.warn('Não foi possível deletar arquivo antigo:', deleteError);
      }

      // Atualizar estados imediatamente
      setSelectedJsonFile(newFilePath);
      setJsonFileSha(null);
      setIsRenamingJson(false);
      
      // Atualizar lista do repositório imediatamente
      setRepositoryContents(prev => 
        prev.map(item => 
          item.path === selectedJsonFile 
            ? { ...item, name: `${newJsonName.trim()}.json`, path: newFilePath }
            : item
        )
      );
      
      showSuccess(`✅ Arquivo renomeado para: ${newJsonName.trim()}.json`);
      
      // Recarregar SHA em background
      loadJsonFile(newFilePath).catch(error => {
        console.warn('Erro ao recarregar JSON renomeado:', error);
      });
    } catch (error) {
      showError('Erro ao renomear arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      setIsRenamingJson(false);
    }
  }, [configContext, isJsonLoaded, selectedJsonFile, newJsonName, currentJsonData, jsonFileSha, githubService, currentPath, loadJsonFile, loadRepositoryContents, showSuccess, showError]);

  // Função para excluir JSON
  const deleteJsonFile = useCallback(async () => {
    if (!configContext || !isJsonLoaded || !selectedJsonFile || !jsonFileSha) {
      showError('Nenhum JSON carregado para excluir');
      return;
    }

    const fileName = selectedJsonFile.split('/').pop();
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir "${fileName}"?\n\nEsta ação não pode ser desfeita.`);
    
    if (!confirmDelete) {
      return;
    }

    const { config } = configContext;
    try {
      await githubService.deleteJsonFile(
        config.github.owner,
        config.github.repo,
        selectedJsonFile,
        config.github.pat,
        jsonFileSha
      );

      // Atualizar estados imediatamente
      setIsJsonLoaded(false);
      setSelectedJsonFile('');
      setCurrentJsonData(null);
      setJsonFileSha(null);
      
      // Remover da lista do repositório imediatamente
      setRepositoryContents(prev => 
        prev.filter(item => item.path !== selectedJsonFile)
      );
      
      // Limpar formulário
      setMangaData({
        title: '',
        description: '',
        artist: '',
        author: '',
        cover: '',
        status: 'ongoing',
        categories: []
      });
      
      showSuccess(`✅ Arquivo "${fileName}" excluído com sucesso!`);
      
    } catch (error) {
      showError('Erro ao excluir arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  }, [configContext, isJsonLoaded, selectedJsonFile, jsonFileSha, githubService, showSuccess, showError]);

  // Função para navegação no repositório
  const handleNavigateToItem = useCallback(async (item: { type: string; path: string; name: string }) => {
    if (item.type === 'dir') {
      await loadRepositoryContents(item.path);
    } else if (item.type === 'file' && item.name.endsWith('.json')) {
      await loadJsonFile(item.path);
      setShowRepoBrowser(false);
    }
  }, [loadRepositoryContents, loadJsonFile]);

  // Função para voltar no repositório
  const handleGoBack = useCallback(async () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    await loadRepositoryContents(parentPath);
  }, [currentPath, loadRepositoryContents]);

  // Carregar repositório automaticamente
  useEffect(() => {
    const loadInitialRepo = async () => {
      if (!configContext) return;
      
      const { config } = configContext;
      if (!config.github.pat || !config.github.owner || !config.github.repo) {
        return;
      }

      setIsLoading(true);
      try {
        const contents = await githubService.listRepositoryContents(
          config.github.owner,
          config.github.repo,
          '',
          config.github.pat
        );
        
        setRepositoryContents(contents);
        setCurrentPath('');
      } catch (error) {
        console.error('Erro ao carregar repositório inicial:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialRepo();
  }, [configContext?.config.github.pat, configContext?.config.github.owner, configContext?.config.github.repo]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadContext) return;
    const files = event.target.files;
    if (files) {
      try {
        await uploadContext.addFiles(files);
        showSuccess(`${files.length} arquivo(s) adicionado(s) com sucesso`);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Erro ao adicionar arquivos');
      }
    }
  }, [uploadContext, showSuccess, showError]);

  const handleBatchSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadContext) return;
    const files = event.target.files;
    if (files) {
      try {
        // Processar estrutura de pastas
        const structure = processBatchStructure(files);
        setBatchStructure(structure);
        
        // Auto-preenchimento do nome do manga
        if (structure.mangaName) {
          setMangaData(prev => ({ ...prev, title: structure.mangaName }));
        }
        
        await uploadContext.addFiles(files);
        showSuccess(`Estrutura de pasta detectada: ${structure.mangaName} com ${structure.chapters.length} capítulos`);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Erro ao processar estrutura de pastas');
      }
    }
  }, [uploadContext, showSuccess, showError]);

  const processBatchStructure = (files: FileList): BatchStructure => {
    const structure: BatchStructure = {
      mangaName: '',
      chapters: []
    };
    
    const pathMap = new Map();
    
    // Processar cada arquivo para extrair a estrutura
    Array.from(files).forEach(file => {
      const pathParts = file.webkitRelativePath.split('/');
      if (pathParts.length >= 3) {
        const mangaName = pathParts[0];
        const chapterName = pathParts[1];
        const fileName = pathParts[2];
        
        if (!structure.mangaName) {
          structure.mangaName = mangaName;
        }
        
        if (!pathMap.has(chapterName)) {
          pathMap.set(chapterName, {
            name: chapterName,
            files: []
          });
        }
        
        pathMap.get(chapterName).files.push({
          name: fileName,
          file: file
        });
      }
    });
    
    structure.chapters = Array.from(pathMap.values());
    return structure;
  };

  const handleUpload = useCallback(async () => {
    if (!configContext || !uploadContext) return;
    const validation = validateConfig(configContext.config);
    if (!validation.isValid) {
      showError(`Configuração inválida: ${validation.errors.join(', ')}`);
      return;
    }

    if (!mangaData.title || !chapterData.number || !chapterData.group) {
      showError('Título do mangá, número do capítulo e grupo de tradução são obrigatórios');
      return;
    }

    try {
      await uploadContext.startUpload(mangaData, chapterData);
      showSuccess('Upload concluído com sucesso!');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro durante o upload');
    }
  }, [configContext, uploadContext, mangaData, chapterData, showSuccess, showError]);

  if (!configContext || !uploadContext || !notificationContext) {
    return <div>Erro ao carregar contextos</div>;
  }

  const { config, updateConfig } = configContext;
  const { selectedFiles, uploadProgress, isUploading, removeFile, clearFiles } = uploadContext;

  const renderJsonManager = () => (
    <Card title="📁 Gerenciador de JSON">
      <div className="space-y-4">
        {/* Status atual */}
        <div className="p-3 bg-gray-50 rounded-lg">
          {isJsonLoaded ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✅</span>
                  {isRenamingJson ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={newJsonName}
                        onChange={setNewJsonName}
                        placeholder="Nome do arquivo (sem .json)"
                        className="text-sm w-48"
                      />
                      <Button onClick={renameJsonFile} variant="success" size="sm">
                        ✓
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsRenamingJson(false);
                          setNewJsonName('');
                        }} 
                        variant="secondary" 
                        size="sm"
                      >
                        ✗
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{selectedJsonFile.split('/').pop()}</span>
                      <span className="text-sm text-gray-500">({selectedJsonFile})</span>
                    </>
                  )}
                </div>
                <div className="flex space-x-2">
                  {!isRenamingJson && (
                    <Button 
                      onClick={() => {
                        setIsRenamingJson(true);
                        setNewJsonName(selectedJsonFile.split('/').pop()?.replace('.json', '') || '');
                      }} 
                      variant="secondary" 
                      size="sm"
                    >
                      ✏️ Renomear
                    </Button>
                  )}
                  <Button onClick={saveJsonFile} variant="success" size="sm" disabled={isRenamingJson}>
                    💾 Salvar
                  </Button>
                  <Button onClick={deleteJsonFile} variant="error" size="sm" disabled={isRenamingJson}>
                    🗑️ Excluir
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsJsonLoaded(false);
                      setSelectedJsonFile('');
                      setCurrentJsonData(null);
                      setIsRenamingJson(false);
                      setNewJsonName('');
                      showSuccess('JSON descarregado');
                    }} 
                    variant="secondary" 
                    size="sm"
                    disabled={isRenamingJson}
                  >
                    ✗ Fechar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              Nenhum JSON carregado
            </div>
          )}
        </div>

        {/* Navegador de repositório */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">📂 Repositório:</span>
              <span className="text-sm text-gray-600">
                {currentPath || 'raiz'}
              </span>
            </div>
            <div className="flex space-x-2">
              {currentPath && (
                <Button onClick={handleGoBack} variant="secondary" size="sm">
                  ⬅️ Voltar
                </Button>
              )}
              <Button 
                onClick={createNewJson} 
                variant="primary" 
                size="sm"
                disabled={!mangaData.title || (typeof mangaData.title === 'string' && !mangaData.title.trim())}
              >
                ➕ Novo JSON
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <span className="text-sm text-gray-500 mt-2">Carregando...</span>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              {repositoryContents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Pasta vazia
                </div>
              ) : (
                <div className="divide-y">
                  {repositoryContents.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleNavigateToItem(item)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{item.type === 'dir' ? '📁' : '📄'}</span>
                        <span className="text-sm">{item.name}</span>
                        {item.type === 'file' && item.name.endsWith('.json') && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">JSON</span>
                        )}
                      </div>
                      {item.type === 'dir' && (
                        <span className="text-gray-400">➡️</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderUploadTab = () => (
    <div className="space-y-6">
      {/* Gerenciador de JSON */}
      {renderJsonManager()}

      <Card title="📝 Informações do Mangá">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Título"
            value={mangaData.title}
            onChange={(value) => setMangaData(prev => ({ ...prev, title: value }))}
            required
            placeholder="Nome do mangá"
          />
          <Input
            label="Capa (URL)"
            value={mangaData.cover}
            onChange={(value) => setMangaData(prev => ({ ...prev, cover: value }))}
            placeholder="URL da capa do mangá"
          />
          <Input
            label="Autor"
            value={mangaData.author}
            onChange={(value) => setMangaData(prev => ({ ...prev, author: value }))}
            placeholder="Nome do autor"
          />
          <Input
            label="Artista"
            value={mangaData.artist}
            onChange={(value) => setMangaData(prev => ({ ...prev, artist: value }))}
            placeholder="Nome do artista"
          />
          <Input
            label="Grupo de Tradução"
            value={chapterData.group}
            onChange={(value) => setChapterData(prev => ({ ...prev, group: value }))}
            placeholder="Nome do grupo de tradução"
            required
          />
          <Select
            label="Status"
            value={mangaData.status}
            onChange={(value) => setMangaData(prev => ({ ...prev, status: value as any }))}
            options={[
              { value: 'ongoing', label: 'Em andamento' },
              { value: 'completed', label: 'Completo' },
              { value: 'hiatus', label: 'Hiato' },
              { value: 'cancelled', label: 'Cancelado' }
            ]}
          />
        </div>
        <div className="mt-4">
          <Input
            label="Descrição"
            value={mangaData.description}
            onChange={(value) => setMangaData(prev => ({ ...prev, description: value }))}
            placeholder="Descrição do mangá"
          />
        </div>
      </Card>

      <Card title="📖 Informações do Capítulo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número do Capítulo"
            value={chapterData.number}
            onChange={(value) => setChapterData(prev => ({ ...prev, number: value }))}
            required
            placeholder="1"
          />
          <Input
            label="Título do Capítulo"
            value={chapterData.title}
            onChange={(value) => setChapterData(prev => ({ ...prev, title: value }))}
            placeholder="Título do capítulo (opcional)"
          />
          <Input
            label="Volume"
            value={chapterData.volume}
            onChange={(value) => setChapterData(prev => ({ ...prev, volume: value }))}
            placeholder="1"
          />
        </div>
      </Card>

      <Card title="📤 Upload de Arquivos">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={uploadMode === 'files'}
                onChange={() => setUploadMode('files')}
                className="form-radio"
              />
              <span>Arquivos individuais</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                checked={uploadMode === 'batch'}
                onChange={() => setUploadMode('batch')}
                className="form-radio"
              />
              <span>Upload em lote (pastas)</span>
            </label>
          </div>

          {uploadMode === 'files' ? (
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          ) : (
            <div>
              <input
                type="file"
                multiple
                {...({ webkitdirectory: "" } as any)}
                onChange={handleBatchSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              <p className="text-sm text-gray-600 mt-2">
                Selecione uma pasta que contenha subpastas para cada capítulo
              </p>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Arquivos selecionados: {selectedFiles.length}
                </span>
                <Button onClick={clearFiles} variant="secondary" size="sm">
                  Limpar todos
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {selectedFiles.map((filePreview) => (
                  <div key={filePreview.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{filePreview.file.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">{formatFileSize(filePreview.file.size)}</span>
                      <Button
                        onClick={() => removeFile(filePreview.id)}
                        variant="secondary"
                        size="sm"
                      >
                        ✗
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadProgress.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Progresso do Upload:</h4>
              <div className="space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={`${progress.fileName}-${index}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{progress.fileName}</span>
                      <span className={`font-medium ${
                        progress.status === 'success' ? 'text-green-600' :
                        progress.status === 'error' ? 'text-red-600' :
                        progress.status === 'uploading' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {progress.status === 'success' ? '✅' :
                         progress.status === 'error' ? '❌' :
                         progress.status === 'uploading' ? '⏳' : '⏸️'}
                      </span>
                    </div>
                    <ProgressBar 
                      value={progress.progress} 
                      variant={
                        progress.status === 'success' ? 'success' :
                        progress.status === 'error' ? 'error' :
                        'primary'
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading || !mangaData.title || !chapterData.number || !chapterData.group}
              loading={isUploading}
              variant="primary"
            >
              {isUploading ? 'Fazendo Upload...' : 'Iniciar Upload'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      <Card title="GitHub Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Personal Access Token"
            type="password"
            value={config.github.pat}
            onChange={(value) => updateConfig('github.pat', value)}
            placeholder="ghp_..."
            required
          />
          <Input
            label="Repository Owner"
            value={config.github.owner}
            onChange={(value) => updateConfig('github.owner', value)}
            placeholder="username"
            required
          />
          <Input
            label="Repository Name"
            value={config.github.repo}
            onChange={(value) => updateConfig('github.repo', value)}
            placeholder="manga-index"
            required
          />
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>📝 Como funciona:</strong> O sistema agora gerencia arquivos JSON individuais para cada manga. 
            Você pode navegar, criar, editar e renomear JSONs diretamente pelo navegador de repositório acima.
          </p>
        </div>
      </Card>

      <Card title="Image Hosts">
        <div className="space-y-4">
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              <strong>✅ Catbox:</strong> Funciona automaticamente com proxy integrado.<br/>
              <strong>Alternativas:</strong> ImgBB e Imgur também funcionam perfeitamente.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.hosts.catbox.enabled}
              onChange={(e) => updateConfig('hosts.catbox.enabled', e.target.checked)}
              className="form-checkbox"
            />
            <span className="font-medium">Catbox.moe</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Proxy automático</span>
          </div>
          {config.hosts.catbox.enabled && (
            <Input
              label="Catbox User Hash"
              value={config.hosts.catbox.userhash}
              onChange={(value) => updateConfig('hosts.catbox.userhash', value)}
              placeholder="abc123..."
            />
          )}
          
          <Input
            label="ImgBB API Key"
            value={config.hosts.imgbb}
            onChange={(value) => updateConfig('hosts.imgbb', value)}
            placeholder="abc123..."
          />
          
          <Input
            label="Imgur Client ID"
            value={config.hosts.imgur}
            onChange={(value) => updateConfig('hosts.imgur', value)}
            placeholder="abc123..."
          />
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Manga Distributed Host</h1>
        
        {/* Notificações */}
        {notifications.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg shadow-lg max-w-sm ${
                  notification.type === 'success' ? 'bg-green-100 border-green-400 text-green-800' :
                  notification.type === 'error' ? 'bg-red-100 border-red-400 text-red-800' :
                  notification.type === 'warning' ? 'bg-yellow-100 border-yellow-400 text-yellow-800' :
                  'bg-blue-100 border-blue-400 text-blue-800'
                } border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Configuração
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && renderUploadTab()}
        {activeTab === 'config' && renderConfigTab()}
      </div>
    </div>
  );
}