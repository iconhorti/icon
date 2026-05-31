import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);  // true while restoring session

  // Restore session on app launch
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync('icon_user');
        if (stored) setUser(JSON.parse(stored));
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  const login = async (username, password) => {
    const userData = await apiLogin(username, password);
    await SecureStore.setItemAsync('icon_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('icon_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
