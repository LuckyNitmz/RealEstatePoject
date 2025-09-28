import { create } from "zustand";
import apiRequest from "./apiRequest";

export const useNotificationStore = create((set, get) => ({
  number: 0,
  isLoading: false,
  
  fetch: async () => {
    if (get().isLoading) return; // Prevent multiple concurrent requests
    
    set({ isLoading: true });
    try {
      const res = await apiRequest("/users/notification");
      set({ number: res.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },
  
  decrease: () => {
    set((prev) => ({ 
      number: Math.max(0, prev.number - 1) // Ensure number doesn't go below 0
    }));
  },
  
  increase: () => {
    set((prev) => ({ number: prev.number + 1 }));
  },
  
  reset: () => {
    set({ number: 0, isLoading: false });
  },
  
  // Set specific number (useful for real-time updates)
  setNumber: (number) => {
    set({ number: Math.max(0, number) });
  },
}));
