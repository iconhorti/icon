import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const USER_KEY = 'icon_user';

export interface AuthUser {
  id: number;
  role: string;
  first_name: string;
  phone: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(USER_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {
        // corrupted store — ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (phone: string, password: string): Promise<void> => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.100:8000/api/v1';
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).detail ?? 'Login failed');
    }
    const data = await res.json();
    // Backend returns: { id, role, first_name, token, token_type, ... }
    const authUser: AuthUser = {
      id:          data.id,
      role:        data.role,
      first_name:  data.first_name,
      phone:       phone,
      token:       data.token,
    };
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  };

  const unlockWithBiometric = async (): Promise<boolean> => {
    const hasBio = await LocalAuthentication.hasHardwareAsync();
    if (!hasBio) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock ICON',
      fallbackLabel: 'Use PIN',
    });
    return result.success;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, unlockWithBiometric }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
};
