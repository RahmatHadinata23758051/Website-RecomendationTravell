import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  preferences?: string[];
  xp?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthData: (user: User, token: string) => void;
  updateUserProfile: (data: { fullName?: string; bio?: string; location?: string; avatarUrl?: string }) => Promise<User | undefined>;
  updateUserPreferences: (preferences: string[]) => Promise<User | undefined>;
  addXp: (amount: number, actionName?: string) => Promise<User | undefined>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('kelana_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.data?.user) {
          setUser(res.data.data.user);
        }
      } catch (err) {
        localStorage.removeItem('kelana_access_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const setAuthData = (userData: User, token: string) => {
    localStorage.setItem('kelana_access_token', token);
    setUser(userData);
    closeAuthModal();
  };

  const updateUserProfile = async (data: { fullName?: string; bio?: string; location?: string; avatarUrl?: string }) => {
    try {
      const res = await apiClient.patch('/auth/profile', data);
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Gagal memperbarui profil');
    }
  };

  const updateUserPreferences = async (preferences: string[]) => {
    try {
      const res = await apiClient.patch('/auth/preferences', { preferences });
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Gagal memperbarui preferensi');
    }
  };

  const addXp = async (amount: number, actionName?: string) => {
    try {
      const res = await apiClient.post('/auth/xp', { amount, action: actionName });
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
        return res.data.data.user;
      }
    } catch (err) {
      // Ignore XP errors silently or fallback
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('kelana_access_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthData,
        updateUserProfile,
        updateUserPreferences,
        addXp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
