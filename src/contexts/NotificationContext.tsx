import React, { createContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { AppNotification, NotificationContextType } from '../types';
import { generateFileId } from '../utils/validation';

// Generate unique ID for notifications
const generateNotificationId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Clear timeout if exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id'>) => {
    const id = generateNotificationId();
    const newNotification: AppNotification = {
      ...notification,
      id
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    if (notification.duration) {
      const timeout = setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
      timeoutRefs.current.set(id, timeout);
    }
  }, [removeNotification]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}