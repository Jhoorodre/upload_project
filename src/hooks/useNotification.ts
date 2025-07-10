import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { UseNotificationResult } from '../types';

// Notification durations
const NOTIFICATION_DURATION_SUCCESS = 5000;
const NOTIFICATION_DURATION_ERROR = 8000;
const NOTIFICATION_DURATION_WARNING = 6000;
const NOTIFICATION_DURATION_INFO = 4000;

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
      duration: NOTIFICATION_DURATION_SUCCESS
    });
  };
  
  const showError = (message: string, title: string = 'Erro') => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: NOTIFICATION_DURATION_ERROR
    });
  };
  
  const showWarning = (message: string, title: string = 'Aviso') => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: NOTIFICATION_DURATION_WARNING
    });
  };
  
  const showInfo = (message: string, title: string = 'Informação') => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: NOTIFICATION_DURATION_INFO
    });
  };
  
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}