import "./singlePage.scss";
import Slider from "../../components/slider/Slider";
import Map from "../../components/map/Map";
import { useNavigate, useLoaderData } from "react-router-dom";
import DOMPurify from "dompurify";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useFavoriteStore } from "../../lib/favoriteStore";
import apiRequest from "../../lib/apiRequest";

function SinglePage() {
  const post = useLoaderData();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isFavorited, toggleFavorite, initializeFavorites } = useFavoriteStore();
  
  const saved = isFavorited(post.id);
  const [isToggling, setIsToggling] = useState(false);
  
  // Initialize favorites when component mounts and user is available
  useEffect(() => {
    if (currentUser) {
      initializeFavorites();
    }
  }, [currentUser, initializeFavorites]);

  // Log post data for debugging
  useEffect(() => {
    console.log("Post data:", post);
    console.log("Post user:", post.user);
    console.log("Post user ID:", post.user?.id);
  }, [post]);

  const handleSave = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    if (isToggling) {
      return; // Prevent multiple clicks
    }
    
    setIsToggling(true);
    try {
      await toggleFavorite(post.id);
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    
    // Check if trying to chat with own post
    if (post.user.id === currentUser.id) {
      alert("This is your Post");
      return;
    }
    
    // Check if post.user.id exists
    if (!post.user || !post.user.id) {
      console.error("Post owner information is missing");
      return;
    }
    
    try {
      console.log("Creating chat with user ID:", post.user.id);
      
      // First check if there are existing chats
      const existingChats = await apiRequest("/chats");
      console.log("Existing chats:", existingChats.data);
      
      // Check if there's already a chat with this user
      const existingChat = existingChats.data.find(
        (chat) => chat.receiver.id === post.user.id
      );
      
      if (!existingChat) {
        // Create a new chat with the post owner if no existing chat
        console.log("No existing chat found, creating new chat");
        const newChat = await apiRequest.post("/chats", { receiverId: post.user.id });
        console.log("New chat created:", newChat.data);
      } else {
        console.log("Existing chat found:", existingChat);
      }
      
      // Navigate to profile page to show the chat
      navigate("/profile");
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  return (
    <div className="singlePage">
      <div className="details">
        <div className="wrapper">
          <Slider images={post.images} />
          <div className="info">
            <div className="top">
              <div className="post">
                <h1>{post.title}</h1>
                <div className="address">
                  <img src="/pin.png" alt="" />
                  <span>{post.address}</span>
                </div>
                <div className="price">₹ {post.price}</div>
              </div>
              <div className="user">
                <img src={post.user.avatar} alt="" />
                <span>{post.user.username}</span>
              </div>
            </div>
            <div
              className="bottom"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(post.postDetail.desc),
              }}
            ></div>
          </div>
        </div>
      </div>
      <div className="features">
        <div className="wrapper">
          <p className="title">General</p>
          <div className="listVertical">
            <div className="feature">
              <img src="/utility.png" alt="" />
              <div className="featureText">
                <span>Utilities</span>
                {post.postDetail.utilities === "owner" ? (
                  <p>Owner is responsible</p>
                ) : (
                  <p>Tenant is responsible</p>
                )}
              </div>
            </div>
            <div className="feature">
              <img src="/pet.png" alt="" />
              <div className="featureText">
                <span>Pet Policy</span>
                {post.postDetail.pet === "allowed" ? (
                  <p>Pets Allowed</p>
                ) : (
                  <p>Pets not Allowed</p>
                )}
              </div>
            </div>
            <div className="feature">
              <img src="/fee.png" alt="" />
              <div className="featureText">
                <span>Income Policy</span>
                <p>{post.postDetail.income}</p>
              </div>
            </div>
          </div>
          <p className="title">Sizes</p>
          <div className="sizes">
            <div className="size">
              <img src="/size.png" alt="" />
              <span>{post.postDetail.size} sqft</span>
            </div>
            <div className="size">
              <img src="/bed.png" alt="" />
              <span>{post.bedroom} beds</span>
            </div>
            <div className="size">
              <img src="/bath.png" alt="" />
              <span>{post.bathroom} bathroom</span>
            </div>
          </div>
          <p className="title">Nearby Places</p>
          <div className="listHorizontal">
            <div className="feature">
              <img src="/school.png" alt="" />
              <div className="featureText">
                <span>School</span>
                <p>
                  {post.postDetail.school > 999
                    ? post.postDetail.school / 1000 + "km"
                    : post.postDetail.school + "m"}{" "}
                  away
                </p>
              </div>
            </div>
            <div className="feature">
              <img src="/pet.png" alt="" />
              <div className="featureText">
                <span>Bus Stop</span>
                <p>{post.postDetail.bus}m away</p>
              </div>
            </div>
            <div className="feature">
              <img src="/fee.png" alt="" />
              <div className="featureText">
                <span>Restaurant</span>
                <p>{post.postDetail.restaurant}m away</p>
              </div>
            </div>
          </div>
          <p className="title">Location</p>
          <div className="mapContainer">
            <Map items={[post]} />
          </div>
          <div className="buttons">
            <button onClick={handleSendMessage}>
              <img src="/chat.png" alt="" />
              Send a Message
            </button>
            <button
              onClick={handleSave}
              style={{
                backgroundColor: saved ? "#fece51" : "white",
              }}
            >
              <img src="/save.png" alt="" />
              {saved ? "Place Saved" : "Save the Place"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SinglePage;
