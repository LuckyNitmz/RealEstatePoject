import { create } from "zustand";
import apiRequest from "./apiRequest";

export const useFavoriteStore = create((set, get) => ({
  favorites: new Set(), // Using Set for O(1) lookup
  isLoading: false,
  lastUpdated: null, // Track when favorites were last updated
  pendingOperations: new Set(), // Track pending toggle operations
  
  // Initialize favorites from user's saved posts
  initializeFavorites: async () => {
    if (get().isLoading) return;
    
    set({ isLoading: true });
    try {
      const response = await apiRequest("/users/profilePosts");
      const savedPosts = response.data.savedPosts || [];
      const favoriteIds = new Set(savedPosts.map(post => post.id));
      set({ favorites: favoriteIds, isLoading: false, lastUpdated: Date.now() });
    } catch (error) {
      console.error("Failed to initialize favorites:", error);
      set({ isLoading: false });
    }
  },
  
  // Check if a post is favorited
  isFavorited: (postId) => {
    return get().favorites.has(postId);
  },
  
  // Toggle favorite status
  toggleFavorite: async (postId) => {
    // Prevent concurrent operations on the same post
    if (get().pendingOperations.has(postId)) {
      console.log(`Operation already pending for post ${postId}`);
      return get().favorites.has(postId);
    }
    
    // Mark operation as pending
    const pendingOps = new Set(get().pendingOperations);
    pendingOps.add(postId);
    set({ pendingOperations: pendingOps });
    
    const currentFavorites = new Set(get().favorites);
    const wasFavorited = currentFavorites.has(postId);
    
    // Optimistic update
    if (wasFavorited) {
      currentFavorites.delete(postId);
    } else {
      currentFavorites.add(postId);
    }
    set({ favorites: currentFavorites, lastUpdated: Date.now() });
    
    try {
      await apiRequest.post("/users/save", { postId });
      
      // Remove from pending operations
      const updatedPendingOps = new Set(get().pendingOperations);
      updatedPendingOps.delete(postId);
      set({ pendingOperations: updatedPendingOps });
      
      return !wasFavorited; // Return new state
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      
      // Revert optimistic update on error
      const revertedFavorites = new Set(get().favorites);
      if (wasFavorited) {
        revertedFavorites.add(postId);
      } else {
        revertedFavorites.delete(postId);
      }
      
      // Remove from pending operations
      const updatedPendingOps = new Set(get().pendingOperations);
      updatedPendingOps.delete(postId);
      
      set({ 
        favorites: revertedFavorites, 
        lastUpdated: Date.now(),
        pendingOperations: updatedPendingOps
      });
      
      throw error;
    }
  },
  
  // Add favorite (used when we know it should be added)
  addFavorite: (postId) => {
    const currentFavorites = new Set(get().favorites);
    currentFavorites.add(postId);
    set({ favorites: currentFavorites, lastUpdated: Date.now() });
  },
  
  // Remove favorite (used when we know it should be removed)
  removeFavorite: (postId) => {
    const currentFavorites = new Set(get().favorites);
    currentFavorites.delete(postId);
    set({ favorites: currentFavorites, lastUpdated: Date.now() });
  },
  
  // Clear all favorites (for logout)
  clearFavorites: () => {
    set({ 
      favorites: new Set(), 
      isLoading: false, 
      lastUpdated: Date.now(),
      pendingOperations: new Set()
    });
  },
  
  // Get favorites as array for rendering
  getFavoritesArray: () => {
    return Array.from(get().favorites);
  },
}));