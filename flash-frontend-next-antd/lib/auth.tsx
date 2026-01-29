'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      return null;
    }
    try {
      return JSON.parse(userData) as User;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      
      if (response.error) {
        console.error('Login error:', response.error);
        return { success: false, error: response.error };
      }

      console.log('Login response:', response.data);
      const data = response.data;
      if (!data) {
        console.error('No response data received');
        return { success: false, error: 'No response data received' };
      }
      const { access_token } = data;
      
      if (!access_token) {
        console.error('No access token in response:', response.data);
        return { success: false, error: 'No access token received' };
      }
      
      localStorage.setItem('token', access_token);
      
      // Fetch user data after login
      const userResponse = await authApi.getMe();
      console.log('User response:', userResponse);
      
      if (userResponse.error) {
        console.error('Failed to fetch user:', userResponse.error);
        return { success: false, error: userResponse.error };
      }
      
      if (userResponse.data) {
        const userData = userResponse.data as User;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      
      router.push('/dashboard');
      
      return { success: true };
    } catch (_error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
