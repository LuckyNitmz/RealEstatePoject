import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
import { useNotificationStore } from "../lib/notificationStore";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { fetch: fetchNotifications, reset: resetNotifications } = useNotificationStore();

  useEffect(() => {
    const socketURL = process.env.NODE_ENV === 'production' 
      ? "https://real-estate-poject.vercel.app" 
      : "http://localhost:4000";
    
    console.log('Mode:', process.env.NODE_ENV);
    console.log('Socket URL:', socketURL);
    console.log('Attempting to connect to socket:', socketURL);
    
    const newSocket = io(socketURL, {
      transports: process.env.NODE_ENV === 'production' 
        ? ['polling', 'websocket'] // Use polling first in production
        : ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected successfully:', newSocket.id);
      console.log('Transport:', newSocket.io.engine.transport.name);
      setConnectionStatus('connected');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      console.error('Error details:', error);
      setConnectionStatus('error');
      
      // Set socket to null if connection fails
      setSocket(null);
      console.warn('Socket connection failed, will use polling for notifications');
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle notification fetching and polling
  useEffect(() => {
    let pollingInterval;
    
    if (currentUser) {
      // Fetch initial notifications
      fetchNotifications();
      
      if (socket) {
        // Real-time mode with Socket.IO
        console.log('Emitting newUser event for:', currentUser.id);
        socket.emit("newUser", currentUser.id);

        // Listen for online users updates
        socket.on("getOnlineUsers", (users) => {
          setOnlineUsers(users);
          console.log('Online users updated:', users);
        });

        // Listen for new notifications
        socket.on("getNotification", (notification) => {
          console.log('New notification received:', notification);
          // Don't update notifications if current user is the sender
          if (notification.senderId === currentUser.id) {
            console.log('Notification is from current user, ignoring');
            return;
          }
          // Trigger notification refetch
          fetchNotifications();
        });

        // Listen for chat marked as read events
        socket.on("chatMarkedAsRead", ({ chatId, userId }) => {
          console.log('Chat marked as read:', chatId, 'by user:', userId);
          // Refresh notifications when someone else reads a chat
          fetchNotifications();
        });
      } else {
        // Fallback polling mode when Socket.IO is not available
        console.log('Setting up notification polling (10 seconds interval)');
        pollingInterval = setInterval(() => {
          console.log('Polling for notifications...');
          fetchNotifications();
        }, 10000); // Poll every 10 seconds when no socket
      }
      
      // Cleanup function
      return () => {
        if (socket) {
          socket.off("getOnlineUsers");
          socket.off("getNotification");
          socket.off("chatMarkedAsRead");
        }
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      };
    } else {
      // Reset notifications when user logs out
      resetNotifications();
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    }
  }, [currentUser, socket, fetchNotifications, resetNotifications]);

  const markChatAsRead = (chatId) => {
    if (socket && currentUser) {
      socket.emit("markChatAsRead", { chatId, userId: currentUser.id });
    } else if (currentUser) {
      // Fallback: just refresh notifications when socket is not available
      console.log('Socket not available, refreshing notifications after chat read');
      setTimeout(() => {
        fetchNotifications();
      }, 1000); // Small delay to allow API to process the chat read
    }
  };

  const setActiveChat = (chatId) => {
    setActiveChatId(chatId);
    if (socket && currentUser) {
      socket.emit("setActiveChat", { userId: currentUser.id, chatId });
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers, 
      markChatAsRead,
      setActiveChat,
      activeChatId,
      connectionStatus 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
