import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";
import { useNotificationStore } from "../lib/notificationStore";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { fetch: fetchNotifications, reset: resetNotifications } = useNotificationStore();

  useEffect(() => {
    const newSocket = io("http://localhost:4000");
    setSocket(newSocket);

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

  return (
    <SocketContext.Provider value={{ 
      socket, 
      onlineUsers, 
      markChatAsRead 
    }}>
      {children}
    </SocketContext.Provider>
  );
};
