import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173", "https://real-estate-poject.vercel.app"],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  },
});

let onlineUser = [];
let activeChats = new Map(); // Map userId -> activeChatId

const addUser = (userId, socketId) => {
  const userExits = onlineUser.find((user) => user.userId === userId);
  if (!userExits) {
    onlineUser.push({ userId, socketId });
  }
  console.log(`User ${userId} connected with socket ${socketId}`);
  console.log('Online users:', onlineUser.length);
};

const removeUser = (socketId) => {
  const userToRemove = onlineUser.find((user) => user.socketId === socketId);
  if (userToRemove) {
    activeChats.delete(userToRemove.userId);
  }
  onlineUser = onlineUser.filter((user) => user.socketId !== socketId);
  console.log('User disconnected, remaining online users:', onlineUser.length);
};

const getUser = (userId) => {
  return onlineUser.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log('New socket connection:', socket.id);
  
  socket.on("newUser", (userId) => {
    addUser(userId, socket.id);
    
    // Send online status to all users
    io.emit("getOnlineUsers", onlineUser.map(user => user.userId));
  });

  socket.on("sendMessage", ({ receiverId, data }) => {
    const receiver = getUser(receiverId);
    if (receiver) {
      console.log(`Sending message from ${data.userId} to ${receiverId}`);
      io.to(receiver.socketId).emit("getMessage", data);
      
      // Only send notification if the receiver doesn't have this chat open
      const receiverActiveChatId = activeChats.get(receiverId);
      const isReceiverChatActive = receiverActiveChatId && receiverActiveChatId === data.chatId;
      
      if (!isReceiverChatActive) {
        console.log(`Sending notification to ${receiverId} (chat not active)`);
        io.to(receiver.socketId).emit("getNotification", {
          senderId: data.userId,
          isRead: false,
          date: new Date().toISOString(),
        });
      } else {
        console.log(`Not sending notification to ${receiverId} (chat is active)`);
      }
    } else {
      console.log(`Receiver ${receiverId} not found online`);
    }
  });

  // Handle marking chat as read
  socket.on("markChatAsRead", ({ chatId, userId }) => {
    // Broadcast to all users that this chat has been read
    socket.broadcast.emit("chatMarkedAsRead", { chatId, userId });
  });

  // Handle setting active chat
  socket.on("setActiveChat", ({ userId, chatId }) => {
    console.log(`User ${userId} set active chat to:`, chatId);
    if (chatId) {
      activeChats.set(userId, chatId);
    } else {
      activeChats.delete(userId);
    }
  });

  socket.on("disconnect", () => {
    console.log('Socket disconnecting:', socket.id);
    removeUser(socket.id);
    
    // Send updated online users list
    io.emit("getOnlineUsers", onlineUser.map(user => user.userId));
  });
});

const PORT = process.env.PORT || 4000;
io.listen(PORT);
console.log(`Socket.io server running on port ${PORT}`);
