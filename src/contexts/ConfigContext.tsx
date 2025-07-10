import React, { createContext, ReactNode } from 'react';
import { Config, ConfigContextType } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

const defaultConfig: Config = {
  github: {
    pat: '',
    owner: '',
    repo: '',
  },
  hosts: {
    catbox: {
      enabled: false,
      userhash: ''
    },
    imgbb: '',
    imgur: ''
  },
  strategies: {
    current: 'single_host',
    preferred_host: 'catbox',
    fallback_hosts: ['imgbb', 'imgur']
  },
  compression: {
    enabled: true,
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080
  }
};

export const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const { value: config, setValue: setConfig } = useLocalStorage('manga-uploader-config', defaultConfig);

  const updateConfig = (path: string, value: any) => {
    const pathArray = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    // Validate path exists
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current || typeof current !== 'object' || !(pathArray[i] in current)) {
        console.error(`Invalid config path: ${path}`);
        return;
      }
      current = current[pathArray[i]];
    }
    
    // Validate final key exists
    const finalKey = pathArray[pathArray.length - 1];
    if (!current || typeof current !== 'object') {
      console.error(`Invalid config path: ${path}`);
      return;
    }
    
    current[finalKey] = value;
    setConfig(newConfig);
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  const exportConfig = (): string => {
    return JSON.stringify(config, null, 2);
  };

  const importConfig = (configJson: string): boolean => {
    try {
      const importedConfig = JSON.parse(configJson);
      setConfig({ ...defaultConfig, ...importedConfig });
      return true;
    } catch (error) {
      console.error('Erro ao importar configuração:', error);
      return false;
    }
  };

  const contextValue: ConfigContextType = {
    config,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig
  };

  return (
    <ConfigContext.Provider value={contextValue}>
      {children}
    </ConfigContext.Provider>
  );
}