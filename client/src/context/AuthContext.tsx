import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'ADMIN' | 'BGA' | 'ACCOUNTS' | 'TECHNICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: string;
  profileImageUrl?: string;
  panVerified?: boolean;
  aadhaarNumber?: string;
  aadhaarMasked?: string;
  aadhaarVerified?: boolean;
  bankVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('bga_auth_token'));
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('bga_auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('bga_auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('bga_auth_token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
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

