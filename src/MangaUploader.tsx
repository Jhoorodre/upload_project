import React, { useState, useContext, useCallback } from 'react';
import { ConfigContext, UploadContext, NotificationContext } from './contexts';
import { Button, Input, Select, Card, ProgressBar } from './components';
import { MangaData, ChapterData } from './types';
import { validateConfig, formatFileSize } from './utils';
import { useNotification } from './hooks';

export function MangaUploader() {
  const configContext = useContext(ConfigContext);
  const uploadContext = useContext(UploadContext);
  const notificationContext = useContext(NotificationContext);
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('upload');
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

  if (!configContext || !uploadContext || !notificationContext) {
    return <div>Erro ao carregar contextos</div>;
  }

  const { config, updateConfig } = configContext;
  const { selectedFiles, uploadProgress, isUploading, addFiles, removeFile, clearFiles, startUpload } = uploadContext;
  const { notifications, removeNotification } = notificationContext;

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      try {
        await addFiles(files);
        showSuccess(`${files.length} arquivo(s) adicionado(s) com sucesso`);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Erro ao adicionar arquivos');
      }
    }
  }, [addFiles, showSuccess, showError]);

  const handleUpload = useCallback(async () => {
    const validation = validateConfig(config);
    if (!validation.isValid) {
      showError(`Configuração inválida: ${validation.errors.join(', ')}`);
      return;
    }

    if (!mangaData.title || !chapterData.number) {
      showError('Título do mangá e número do capítulo são obrigatórios');
      return;
    }

    try {
      await startUpload(mangaData, chapterData);
      showSuccess('Upload concluído com sucesso!');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro durante o upload');
    }
  }, [config, mangaData, chapterData, startUpload, showSuccess, showError]);

  const renderUploadTab = () => (
    <div className="space-y-6">
      <Card title="Informações do Mangá">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Título"
            value={mangaData.title}
            onChange={(value) => setMangaData(prev => ({ ...prev, title: value }))}
            required
            placeholder="Nome do mangá"
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

      <Card title="Informações do Capítulo">
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
          <Input
            label="Grupo"
            value={chapterData.group}
            onChange={(value) => setChapterData(prev => ({ ...prev, group: value }))}
            placeholder="Nome do grupo de tradução"
          />
        </div>
      </Card>

      <Card title="Seleção de Arquivos">
        <div className="space-y-4">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedFiles.map((file) => (
                <div key={file.id} className="relative">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {file.file.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatFileSize(file.file.size)}
                    {file.compressed && file.compressedSize && (
                      <span className="text-green-600 ml-1">
                        → {formatFileSize(file.compressedSize)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {uploadProgress.length > 0 && (
        <Card title="Progresso do Upload">
          <div className="space-y-3">
            {uploadProgress.map((progress) => (
              <div key={progress.fileName} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{progress.fileName}</span>
                  <span className={`font-medium ${
                    progress.status === 'success' ? 'text-green-600' :
                    progress.status === 'error' ? 'text-red-600' :
                    progress.status === 'uploading' ? 'text-blue-600' :
                    'text-gray-500'
                  }`}>
                    {progress.status === 'success' ? 'Concluído' :
                     progress.status === 'error' ? 'Erro' :
                     progress.status === 'uploading' ? 'Enviando...' :
                     'Aguardando'}
                  </span>
                </div>
                <ProgressBar
                  value={progress.progress}
                  variant={progress.status === 'error' ? 'error' : 'primary'}
                  showPercentage={false}
                />
                {progress.error && (
                  <p className="text-sm text-red-600">{progress.error}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          onClick={clearFiles}
          variant="secondary"
          disabled={selectedFiles.length === 0 || isUploading}
        >
          Limpar Arquivos
        </Button>
        <Button
          onClick={handleUpload}
          loading={isUploading}
          disabled={selectedFiles.length === 0}
        >
          Iniciar Upload
        </Button>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      <Card title="Configuração do GitHub">
        <div className="space-y-4">
          <Input
            label="Personal Access Token"
            type="password"
            value={config.github.pat}
            onChange={(value) => updateConfig('github.pat', value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Owner"
              value={config.github.owner}
              onChange={(value) => updateConfig('github.owner', value)}
              placeholder="username"
              required
            />
            <Input
              label="Repository"
              value={config.github.repo}
              onChange={(value) => updateConfig('github.repo', value)}
              placeholder="manga-index"
              required
            />
          </div>
          <Input
            label="Nome do Arquivo"
            value={config.github.filename}
            onChange={(value) => updateConfig('github.filename', value)}
            placeholder="manga-index.json"
            required
          />
        </div>
      </Card>

      <Card title="Configuração dos Hosts">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="catbox-enabled"
              checked={config.hosts.catbox.enabled}
              onChange={(e) => updateConfig('hosts.catbox.enabled', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="catbox-enabled" className="text-sm font-medium text-gray-700">
              Habilitar Catbox
            </label>
          </div>
          {config.hosts.catbox.enabled && (
            <Input
              label="Catbox Userhash"
              value={config.hosts.catbox.userhash}
              onChange={(value) => updateConfig('hosts.catbox.userhash', value)}
              placeholder="xxxxxxxxxxxxxxxx"
            />
          )}
          <Input
            label="ImgBB API Key"
            value={config.hosts.imgbb}
            onChange={(value) => updateConfig('hosts.imgbb', value)}
            placeholder="xxxxxxxxxxxxxxxx"
          />
          <Input
            label="Imgur Client ID"
            value={config.hosts.imgur}
            onChange={(value) => updateConfig('hosts.imgur', value)}
            placeholder="xxxxxxxxxxxxxxxx"
          />
        </div>
      </Card>
    </div>
  );

  return (
    <div className="manga-uploader">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Manga Upload Manager</h1>
      
      {/* Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configuração
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && renderUploadTab()}
      {activeTab === 'config' && renderConfigTab()}

      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg max-w-sm ${
              notification.type === 'success' ? 'bg-green-100 border-green-400' :
              notification.type === 'error' ? 'bg-red-100 border-red-400' :
              notification.type === 'warning' ? 'bg-yellow-100 border-yellow-400' :
              'bg-blue-100 border-blue-400'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}