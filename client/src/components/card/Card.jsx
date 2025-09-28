import { Link, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useFavoriteStore } from "../../lib/favoriteStore";
import apiRequest from "../../lib/apiRequest";
import "./card.scss";

function Card({ item }) {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isFavorited, toggleFavorite, initializeFavorites } = useFavoriteStore();
  
  const saved = isFavorited(item.id);
  
  // Initialize favorites when component mounts and user is available
  useEffect(() => {
    if (currentUser) {
      initializeFavorites();
    }
  }, [currentUser, initializeFavorites]);

  const handleSave = async (e) => {
    e.preventDefault(); // Prevent navigation to single page
    e.stopPropagation();
    
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    try {
      await toggleFavorite(item.id);
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault(); // Prevent navigation to single page
    e.stopPropagation();
    
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Check if trying to chat with own post
    if (item.user.id === currentUser.id) {
      alert("This is your Post");
      return;
    }

    try {
      // Check if there's already a chat with this user
      const existingChats = await apiRequest("/chats");
      const existingChat = existingChats.data.find(
        (chat) => chat.receiver.id === item.user.id
      );
      
      if (!existingChat) {
        // Create a new chat
        await apiRequest.post("/chats", { receiverId: item.user.id });
      }
      
      // Navigate to profile page to show the chat
      navigate("/profile");
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  return (
    <div className="card">
      <Link to={`/${item.id}`} className="imageContainer">
        <img src={item.images[0]} alt="" />
      </Link>
      <div className="textContainer">
        <h2 className="title">
          <Link to={`/${item.id}`}>{item.title}</Link>
        </h2>
        <p className="address">
          <img src="/pin.png" alt="" />
          <span>{item.address}</span>
        </p>
        <p className="price">₹ {item.price}</p>
        <div className="bottom">
          <div className="features">
            <div className="feature">
              <img src="/bed.png" alt="" />
              <span>{item.bedroom} bedroom</span>
            </div>
            <div className="feature">
              <img src="/bath.png" alt="" />
              <span>{item.bathroom} bathroom</span>
            </div>
          </div>
          <div className="icons">
            <div 
              className="icon"
              onClick={handleSave}
              style={{
                backgroundColor: saved ? "#fece51" : "transparent",
                cursor: "pointer"
              }}
            >
              <img src="/save.png" alt="" />
            </div>
            <div 
              className="icon"
              onClick={handleChat}
              style={{ cursor: "pointer" }}
            >
              <img src="/chat.png" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Card;
