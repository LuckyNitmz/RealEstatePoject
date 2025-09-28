import Chat from "../../components/chat/Chat";
import List from "../../components/list/List";
import "./profilePage.scss";
import apiRequest from "../../lib/apiRequest";
import { Await, Link, useLoaderData, useNavigate } from "react-router-dom";
import { Suspense, useContext, useEffect, useState, useMemo } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useFavoriteStore } from "../../lib/favoriteStore";

function ProfilePage() {
  const data = useLoaderData();
  const { updateUser, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { favorites, initializeFavorites, lastUpdated } = useFavoriteStore();
  const [savedPosts, setSavedPosts] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [chats, setChats] = useState([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [chatDataLoaded, setChatDataLoaded] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Initialize favorites when component mounts
  useEffect(() => {
    if (currentUser) {
      initializeFavorites();
    }
  }, [currentUser, initializeFavorites]);
  
  // Load initial data from loader
  useEffect(() => {
    if (data?.postResponse && !initialDataLoaded) {
      data.postResponse.then(response => {
        setUserPosts(response.data.userPosts || []);
        setSavedPosts(response.data.savedPosts || []);
        setInitialDataLoaded(true);
      }).catch(error => {
        console.error("Failed to load initial data:", error);
        setInitialDataLoaded(true);
      });
    }
  }, [data, initialDataLoaded]);
  
  // Load chat data from loader
  useEffect(() => {
    if (data?.chatResponse && !chatDataLoaded) {
      data.chatResponse.then(response => {
        setChats(response.data || []);
        setChatDataLoaded(true);
      }).catch(error => {
        console.error("Failed to load chat data:", error);
        setChatDataLoaded(true);
      });
    }
  }, [data, chatDataLoaded]);
  
  // Update saved posts when favorites change (real-time sync)
  useEffect(() => {
    const fetchSavedPosts = async () => {
      // Only fetch if we haven't synced recently or if favorites were updated
      if (currentUser && initialDataLoaded && (!lastSyncTime || (lastUpdated && lastUpdated > lastSyncTime))) {
        try {
          const response = await apiRequest("/users/profilePosts");
          const newSavedPosts = response.data.savedPosts || [];
          setSavedPosts(newSavedPosts);
          setLastSyncTime(Date.now());
          console.log('Updated saved posts:', newSavedPosts.length);
        } catch (error) {
          console.error("Failed to fetch saved posts:", error);
        }
      }
    };
    
    // Add a small delay to allow for API operations to complete
    const timeoutId = setTimeout(fetchSavedPosts, 100);
    return () => clearTimeout(timeoutId);
  }, [lastUpdated, currentUser, initialDataLoaded, lastSyncTime]);
  
  // Immediate optimistic update - combine server data with optimistic favorites state
  const displayedSavedPosts = useMemo(() => {
    // Start with server-provided saved posts
    const basePost = [...savedPosts];
    
    // Add posts that are favorited but not yet in savedPosts (optimistic additions)
    const favoriteIds = Array.from(favorites);
    const existingIds = new Set(basePost.map(post => post.id));
    
    // For now, we can only display posts that are already in savedPosts or have been removed
    // This ensures immediate removal but requires server sync for additions
    return basePost.filter(post => favorites.has(post.id));
  }, [savedPosts, favorites]);

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout");
      updateUser(null);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="profilePage">
      <div className="details">
        <div className="wrapper">
          <div className="title">
            <h1>User Information</h1>
            <Link to="/profile/update">
              <button>Update Profile</button>
            </Link>
          </div>
          <div className="info">
            <span>
              Avatar:
              <img src={currentUser.avatar || "noavatar.jpg"} alt="" />
            </span>
            <span>
              Username: <b>{currentUser.username}</b>
            </span>
            <span>
              E-mail: <b>{currentUser.email}</b>
            </span>
            <button onClick={handleLogout}>Logout</button>
          </div>
          <div className="title">
            <h1>My List</h1>
            <Link to="/add">
              <button>Create New Post</button>
            </Link>
          </div>
          {initialDataLoaded ? (
            <>
              <List 
                posts={userPosts} 
                emptyMessage="You haven't created any posts yet." 
                emptySubMessage="Create your first property listing to get started!" 
              />
              {(!userPosts || userPosts.length === 0) && (
                <div className="emptyStateActions">
                  <Link to="/add">
                    <button className="emptyStateButton">Create New Post</button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p>Loading...</p>
          )}
          <div className="title">
            <h1>Saved List</h1>
          </div>
          {initialDataLoaded ? (
            <List 
              posts={displayedSavedPosts} 
              emptyMessage="No saved properties yet." 
              emptySubMessage="Save properties you like to see them here!" 
            />
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
      <div className="chatContainer">
        <div className="wrapper">
          {chatDataLoaded ? (
            <Chat chats={chats} />
          ) : (
            <p>Loading chats...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
