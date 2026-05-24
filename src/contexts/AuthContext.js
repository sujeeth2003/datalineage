// src/contexts/AuthContext.js
// No Google OAuth needed — users just pick a display name.
// Identity is stored in localStorage for convenience.

import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "datalineage_author";

export function AuthProvider({ children }) {
  const [author, setAuthorState] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAuthorState(saved);
  }, []);

  const setAuthor = (name) => {
    const trimmed = name.trim();
    localStorage.setItem(STORAGE_KEY, trimmed);
    setAuthorState(trimmed);
  };

  const clearAuthor = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthorState(null);
  };

  return (
    <AuthContext.Provider value={{ author, setAuthor, clearAuthor, isIdentified: !!author }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
