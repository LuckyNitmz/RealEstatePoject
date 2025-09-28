import prisma from "../lib/prisma.js";

export const getChats = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
    });

    // Filter out chats and add receiver information
    const validChats = [];
    
    for (const chat of chats) {
      // Find the other user in the chat
      const receiverId = chat.userIDs.find((id) => id !== tokenUserId);
      
      // Skip if no valid receiver ID found or chat has malformed data
      if (!receiverId || chat.userIDs.length !== 2) {
        console.log(`Skipping invalid chat: ${chat.id}, userIDs: ${chat.userIDs}`);
        continue;
      }

      try {
        const receiver = await prisma.user.findUnique({
          where: {
            id: receiverId,
          },
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        });
        
        // Skip if receiver user doesn't exist in database
        if (!receiver) {
          console.log(`Skipping chat with non-existent user: ${receiverId}`);
          continue;
        }
        
        chat.receiver = receiver;
        validChats.push(chat);
      } catch (userError) {
        console.log(`Error fetching user ${receiverId}:`, userError);
        // Skip this chat if user fetch fails
        continue;
      }
    }

    res.status(200).json(validChats);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chats!" });
  }
};

export const getChat = async (req, res) => {
  const tokenUserId = req.userId;

  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await prisma.chat.update({
      where: {
        id: req.params.id,
      },
      data: {
        seenBy: {
          push: [tokenUserId],
        },
      },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get chat!" });
  }
};

export const addChat = async (req, res) => {
  const tokenUserId = req.userId;
  const { receiverId } = req.body;
  
  try {
    // Validate receiverId
    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }
    
    // Prevent user from creating chat with themselves
    if (receiverId === tokenUserId) {
      return res.status(400).json({ message: "Cannot create chat with yourself" });
    }
    
    // Check if receiver user exists
    const receiverUser = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true }
    });
    
    if (!receiverUser) {
      return res.status(404).json({ message: "Receiver user not found" });
    }
    
    // Check if chat already exists between these users
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            userIDs: {
              hasEvery: [tokenUserId, receiverId]
            }
          },
          {
            userIDs: {
              has: tokenUserId
            }
          },
          {
            userIDs: {
              has: receiverId
            }
          }
        ]
      }
    });
    
    if (existingChat) {
      return res.status(200).json(existingChat);
    }
    
    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        userIDs: [tokenUserId, receiverId],
      },
    });
    
    res.status(200).json(newChat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to add chat!" });
  }
};

export const readChat = async (req, res) => {
  const tokenUserId = req.userId;

  
  try {
    const chat = await prisma.chat.update({
      where: {
        id: req.params.id,
        userIDs: {
          hasSome: [tokenUserId],
        },
      },
      data: {
        seenBy: {
          set: [tokenUserId],
        },
      },
    });
    res.status(200).json(chat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to read chat!" });
  }
};

// Utility function to clean up malformed chats (can be called manually if needed)
export const cleanupChats = async (req, res) => {
  try {
    // Find all chats
    const allChats = await prisma.chat.findMany();
    const chatsToDelete = [];
    
    for (const chat of allChats) {
      // Check for malformed chats (not exactly 2 users)
      if (!chat.userIDs || chat.userIDs.length !== 2) {
        chatsToDelete.push(chat.id);
        continue;
      }
      
      // Check if both users exist
      const [user1Id, user2Id] = chat.userIDs;
      
      const user1 = await prisma.user.findUnique({ where: { id: user1Id }, select: { id: true } });
      const user2 = await prisma.user.findUnique({ where: { id: user2Id }, select: { id: true } });
      
      if (!user1 || !user2) {
        chatsToDelete.push(chat.id);
      }
    }
    
    if (chatsToDelete.length > 0) {
      // Delete malformed chats and their messages
      await prisma.message.deleteMany({
        where: {
          chatId: {
            in: chatsToDelete
          }
        }
      });
      
      await prisma.chat.deleteMany({
        where: {
          id: {
            in: chatsToDelete
          }
        }
      });
      
      res.status(200).json({ 
        message: `Cleaned up ${chatsToDelete.length} malformed chats`,
        deletedChatIds: chatsToDelete 
      });
    } else {
      res.status(200).json({ message: "No malformed chats found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to cleanup chats!" });
  }
};
