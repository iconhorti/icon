import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('icon_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem('icon_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('icon_user');
    setUser(null);
    // Do NOT use window.location.href — that causes a full page reload which
    // discards all in-progress form state. Setting user to null lets React
    // Router's Layout <Navigate to="/login"> handle the redirect client-side,
    // preserving the React tree until the actual navigation happens.
  };

  useEffect(() => {
    const handleAuthError = () => {
      // Dispatch a toast-style warning before clearing session so the user
      // understands why they are being redirected (expired token, not a bug).
      window.dispatchEvent(new CustomEvent('icon-toast', {
        detail: { message: 'Your session has expired. Please log in again.', type: 'warning' }
      }));
      logout();
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // logout is stable — defined in the same render scope as this effect

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
