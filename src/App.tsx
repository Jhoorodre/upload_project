import React from 'react';
import { ConfigProvider, NotificationProvider, UploadProvider } from './contexts';
import { MangaUploader } from './MangaUploader';
import './App.css';

function App() {
  return (
    <ConfigProvider>
      <NotificationProvider>
        <UploadProvider>
          <div className="min-h-screen bg-gray-50">
            <MangaUploader />
          </div>
        </UploadProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}

export default App;