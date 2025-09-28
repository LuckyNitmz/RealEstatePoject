import { useContext, useEffect, useRef, useState } from "react";
import "./chat.scss";
import { AuthContext } from "../../context/AuthContext";
import apiRequest from "../../lib/apiRequest";
import { format } from "timeago.js";
import { SocketContext } from "../../context/SocketContext";
import { useNotificationStore } from "../../lib/notificationStore";

function Chat({ chats: initialChats }) {
  const [chat, setChat] = useState(null);
  const [chats, setChats] = useState(initialChats || []);
  const { currentUser } = useContext(AuthContext);
  const { socket, setActiveChat } = useContext(SocketContext);

  const messageEndRef = useRef();

  const decrease = useNotificationStore((state) => state.decrease);
  
  // Initialize chats from props
  useEffect(() => {
    if (initialChats && initialChats.length > 0) {
      setChats(initialChats);
    }
  }, [initialChats]);
  
  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket && currentUser) {
      // Listen for new messages to update chat list appearance
      const handleNewMessage = (data) => {
        console.log('New message received in chat list:', data);
        
        // Don't update UI if current user is the sender of the message
        if (data.userId === currentUser.id) {
          console.log('Message is from current user, skipping UI update');
          return;
        }
        
        // Update the specific chat's seenBy status
        setChats(prevChats => 
          prevChats.map(chatItem => {
            if (chatItem.id === data.chatId) {
              // Only mark as unread if this chat is not currently open
              const isCurrentlyOpen = chat && chat.id === data.chatId;
              const seenBy = isCurrentlyOpen 
                ? chatItem.seenBy // Keep current seenBy if chat is open
                : chatItem.seenBy.filter(id => id !== currentUser.id); // Mark as unread
              
              return {
                ...chatItem,
                seenBy,
                lastMessage: data.text
              };
            }
            return chatItem;
          })
        );
      };
      
      // Listen for chat marked as read events
      const handleChatMarkedAsRead = ({ chatId, userId }) => {
        console.log('Chat marked as read:', chatId, 'by user:', userId);
        setChats(prevChats => 
          prevChats.map(chatItem => {
            if (chatItem.id === chatId) {
              // Add user to seenBy array if not already there
              const seenBy = chatItem.seenBy.includes(userId) 
                ? chatItem.seenBy 
                : [...chatItem.seenBy, userId];
              return { ...chatItem, seenBy };
            }
            return chatItem;
          })
        );
      };
      
      socket.on("getMessage", handleNewMessage);
      socket.on("chatMarkedAsRead", handleChatMarkedAsRead);
      
      return () => {
        socket.off("getMessage", handleNewMessage);
        socket.off("chatMarkedAsRead", handleChatMarkedAsRead);
      };
    }
  }, [socket, currentUser, chat]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleOpenChat = async (id, receiver) => {
    try {
      // Immediately update UI optimistically
      setChats(prevChats => 
        prevChats.map(chatItem => {
          if (chatItem.id === id) {
            const seenBy = chatItem.seenBy.includes(currentUser.id) 
              ? chatItem.seenBy 
              : [...chatItem.seenBy, currentUser.id];
            return { ...chatItem, seenBy };
          }
          return chatItem;
        })
      );
      
      const res = await apiRequest("/chats/" + id);
      if (!res.data.seenBy.includes(currentUser.id)) {
        decrease();
      }
      setChat({ ...res.data, receiver });
      
      // Set this as the active chat
      setActiveChat(id);
      
      // Mark chat as read via socket for real-time updates
      if (socket) {
        socket.emit("markChatAsRead", { chatId: id, userId: currentUser.id });
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const text = formData.get("text");

    if (!text) return;
    try {
      const res = await apiRequest.post("/messages/" + chat.id, { text });
      setChat((prev) => ({ ...prev, messages: [...prev.messages, res.data] }));
      e.target.reset();
      
      // Update chat list immediately for sender to keep it "read" (no yellow highlight)
      setChats(prevChats => 
        prevChats.map(chatItem => {
          if (chatItem.id === chat.id) {
            return {
              ...chatItem,
              lastMessage: text,
              seenBy: chatItem.seenBy.includes(currentUser.id) 
                ? chatItem.seenBy 
                : [...chatItem.seenBy, currentUser.id]
            };
          }
          return chatItem;
        })
      );
      
      socket.emit("sendMessage", {
        receiverId: chat.receiver.id,
        data: res.data,
      });
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const read = async () => {
      try {
        await apiRequest.put("/chats/read/" + chat.id);
        // Emit socket event to update notifications in real-time
        if (socket) {
          socket.emit("markChatAsRead", { chatId: chat.id, userId: currentUser.id });
        }
      } catch (err) {
        console.log(err);
      }
    };

    if (chat && socket) {
      const handleGetMessage = (data) => {
        console.log('Received message:', data);
        if (chat.id === data.chatId) {
          setChat((prev) => ({ ...prev, messages: [...prev.messages, data] }));
          read(); // Auto-mark as read when in chat
        }
      };

      socket.on("getMessage", handleGetMessage);
      
      return () => {
        socket.off("getMessage", handleGetMessage);
      };
    }
  }, [socket, chat, currentUser.id]);

  return (
    <div className="chat">
      <div className="messages">
        <h1>Messages</h1>
        {chats?.map((c) => (
          <div
            className="message"
            key={c.id}
            style={{
              backgroundColor:
                c.seenBy.includes(currentUser.id) || chat?.id === c.id
                  ? "white"
                  : "#fecd514e",
            }}
            onClick={() => handleOpenChat(c.id, c.receiver)}
          >
            <img src={c.receiver.avatar || "/noavatar.jpg"} alt="" />
            <span>{c.receiver.username}</span>
            <p>{c.lastMessage}</p>
          </div>
        ))}
      </div>
      {chat && (
        <div className="chatBox">
          <div className="top">
            <div className="user">
              <img src={chat.receiver.avatar || "noavatar.jpg"} alt="" />
              {chat.receiver.username}
            </div>
            <span className="close" onClick={() => {
              setChat(null);
              setActiveChat(null);
            }}>
              X
            </span>
          </div>
          <div className="center">
            {chat.messages.map((message) => (
              <div
                className="chatMessage"
                style={{
                  alignSelf:
                    message.userId === currentUser.id
                      ? "flex-end"
                      : "flex-start",
                  textAlign:
                    message.userId === currentUser.id ? "right" : "left",
                }}
                key={message.id}
              >
                <p>{message.text}</p>
                <span>{format(message.createdAt)}</span>
              </div>
            ))}
            <div ref={messageEndRef}></div>
          </div>
          <form onSubmit={handleSubmit} className="bottom">
            <textarea name="text"></textarea>
            <button>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Chat;
