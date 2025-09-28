import { Server } from "socket.io";

const io = new Server({
  cors: {
    origin: "http://localhost:5173",
  },
});

let onlineUser = [];

const addUser = (userId, socketId) => {
  const userExits = onlineUser.find((user) => user.userId === userId);
  if (!userExits) {
    onlineUser.push({ userId, socketId });
  }
  console.log(`User ${userId} connected with socket ${socketId}`);
  console.log('Online users:', onlineUser.length);
};

const removeUser = (socketId) => {
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
      
      // Also send notification update
      io.to(receiver.socketId).emit("getNotification", {
        senderId: data.userId,
        isRead: false,
        date: new Date().toISOString(),
      });
    } else {
      console.log(`Receiver ${receiverId} not found online`);
    }
  });

  // Handle marking chat as read
  socket.on("markChatAsRead", ({ chatId, userId }) => {
    // Broadcast to all users that this chat has been read
    socket.broadcast.emit("chatMarkedAsRead", { chatId, userId });
  });

  socket.on("disconnect", () => {
    console.log('Socket disconnecting:', socket.id);
    removeUser(socket.id);
    
    // Send updated online users list
    io.emit("getOnlineUsers", onlineUser.map(user => user.userId));
  });
});

io.listen("4000");
console.log('Socket.io server running on port 4000');
