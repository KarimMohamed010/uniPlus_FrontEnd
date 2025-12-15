import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import client from '../api/client';

interface UnreadMessage {
  msgId: number;
  senderId: number;
  senderName: string;
  senderImgUrl?: string;
  content: string;
  sentAt: string;
}

interface NotificationContextType {
  unreadCount: number;
  unreadMessages: UnreadMessage[];
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  incrementUnread: () => void;
  resetUnread: () => void;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const socket = useSocket();
  const { user } = useAuth();

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await client.get('/messages/unread');
      // Backend returns notifications array with sender info
      const notifications = res.data.notifications || [];
      setUnreadCount(notifications.length);
      
      // Transform to UnreadMessage format
      const messages: UnreadMessage[] = notifications.map((notif: any) => ({
        msgId: notif.msgId,
        senderId: notif.senderId,
        senderName: `${notif.fname} ${notif.lname}`,
        senderImgUrl: notif.imgUrl,
        content: notif.content,
        sentAt: notif.sentAt,
      }));
      setUnreadMessages(messages);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [user]);

  const incrementUnread = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
    setUnreadMessages([]);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      refreshUnreadCount();
    }
  }, [user, refreshUnreadCount]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (data: any) => {
      // Only increment for messages from others
      if (data.senderId !== user.id) {
        incrementUnread();
        // Refresh to get the full message list
        refreshUnreadCount();
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    
    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, user, incrementUnread, refreshUnreadCount]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      unreadMessages,
      setUnreadCount, 
      incrementUnread, 
      resetUnread, 
      refreshUnreadCount 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
