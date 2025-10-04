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
  const { fetch: fetchNotifications, reset: resetNotifications } = useNotificationStore();

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Replace with your actual socket deployment URL
      // Check your Vercel dashboard for the correct URL
      const possibleSocketURLs = [
        process.env.REACT_APP_SOCKET_URL,
        "https://socket-gold-xi.vercel.app", // Common pattern
        "https://full-stack-estate-main-socket.vercel.app", // Based on your project name
        "https://socket-full-stack-estate-main.vercel.app", // Alternative pattern
      ].filter(Boolean);
      
      // For now, disable socket in production until you provide the correct URL
      console.warn('Socket.IO disabled in production - please update REACT_APP_SOCKET_URL environment variable');
      console.log('Possible socket URLs to try:', possibleSocketURLs);
      console.log('To fix: Set REACT_APP_SOCKET_URL in Vercel environment variables');
      return;
    }
    
    // Development socket connection
    const socketURL = "http://localhost:4000";
    console.log('Attempting to connect to socket:', socketURL);
    
    const newSocket = io(socketURL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });
    
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected successfully:', newSocket.id);
      console.log('Transport:', newSocket.io.engine.transport.name);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      console.error('Error details:', error);
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentUser && socket) {
      console.log('Emitting newUser event for:', currentUser.id);
      socket.emit("newUser", currentUser.id);
      
      // Fetch initial notifications
      fetchNotifications();

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

      // Cleanup listeners when user changes
      return () => {
        socket.off("getOnlineUsers");
        socket.off("getNotification");
        socket.off("chatMarkedAsRead");
      };
    } else if (!currentUser && socket) {
      // Reset notifications when user logs out
      resetNotifications();
    }
  }, [currentUser, socket, fetchNotifications, resetNotifications]);

  const markChatAsRead = (chatId) => {
    if (socket && currentUser) {
      socket.emit("markChatAsRead", { chatId, userId: currentUser.id });
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
      activeChatId 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
