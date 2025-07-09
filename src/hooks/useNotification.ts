import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { UseNotificationResult } from '../types';

export function useNotification(): UseNotificationResult {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  const { addNotification } = context;
  
  const showSuccess = (message: string, title: string = 'Sucesso') => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 5000
    });
  };
  
  const showError = (message: string, title: string = 'Erro') => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 8000
    });
  };
  
  const showWarning = (message: string, title: string = 'Aviso') => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000
    });
  };
  
  const showInfo = (message: string, title: string = 'Informação') => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000
    });
  };
  
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}