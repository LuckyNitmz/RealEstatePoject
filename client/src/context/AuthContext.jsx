import { createContext, useEffect, useState } from "react";
import { useFavoriteStore } from "../lib/favoriteStore";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );
  const { clearFavorites, initializeFavorites } = useFavoriteStore();

  const updateUser = (data) => {
    setCurrentUser(data);
    
    // Clear favorites when user logs out
    if (!data) {
      clearFavorites();
    } else {
      // Initialize favorites when user logs in
      initializeFavorites();
    }
  };

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser,updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
