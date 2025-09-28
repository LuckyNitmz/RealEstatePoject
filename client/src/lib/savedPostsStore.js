import { create } from "zustand";

// A lightweight store to hold optimistic saved posts so the UI updates instantly
export const useSavedPostsStore = create((set, get) => ({
  postsById: {},

  // Initialize from server response
  setFromServer: (posts) => {
    const map = {};
    (posts || []).forEach((p) => {
      if (p && p.id) map[p.id] = p;
    });
    set({ postsById: map });
  },

  // Add a post optimistically
  add: (post) => {
    if (!post || !post.id) return;
    set((state) => ({ postsById: { ...state.postsById, [post.id]: post } }));
  },

  // Remove a post optimistically
  remove: (postId) => {
    set((state) => {
      const copy = { ...state.postsById };
      delete copy[postId];
      return { postsById: copy };
    });
  },

  // Clear all (e.g., on logout)
  clear: () => set({ postsById: {} }),

  // Helper to get array form
  getPostsArray: () => Object.values(get().postsById),
}));
