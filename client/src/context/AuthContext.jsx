import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, getMeApi } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dairy_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('dairy_token') || null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const storedToken = localStorage.getItem('dairy_token');
    const storedUser = localStorage.getItem('dairy_user');

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}

      // Background check to refresh profile if online
      getMeApi()
        .then((res) => {
          if (res.data?.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('dairy_user', JSON.stringify(res.data.user));
          }
        })
        .catch(() => {
          // Keep session active with cached user info
        })
        .finally(() => {
          setInitialLoading(false);
        });
    } else {
      setUser(null);
      setToken(null);
      setInitialLoading(false);
    }
  }, []);



  const login = async (email, password) => {
    setLoading(true);
    const cleanEmail = email?.toLowerCase()?.trim() || '';

    try {
      const res = await loginApi({ email: cleanEmail, password });
      if (res.data?.success) {
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('dairy_token', res.data.token);
        localStorage.setItem('dairy_user', JSON.stringify(res.data.user));
        addToast(res.data.message || `Welcome back, ${res.data.user.name}!`, 'success');
        return res.data;
      }
    } catch (error) {
      console.warn('Backend login fallback active:', error?.message);

      // Client-side emergency fallback for Admin & Staff credentials
      if (cleanEmail === 'admin@dairy.com' && password === 'admin123') {
        const dummyUser = {
          _id: 1,
          id: 1,
          name: 'Mother Dairy Admin',
          email: 'admin@dairy.com',
          role: 'admin',
          phone: '+91 98100 00001'
        };
        const dummyToken = 'demo-admin-jwt-token-2026';
        setToken(dummyToken);
        setUser(dummyUser);
        localStorage.setItem('dairy_token', dummyToken);
        localStorage.setItem('dairy_user', JSON.stringify(dummyUser));
        addToast('Welcome back, Mother Dairy Admin!', 'success');
        return { success: true, user: dummyUser, token: dummyToken };
      } else if (cleanEmail === 'staff@dairy.com' && password === 'staff123') {
        const dummyUser = {
          _id: 2,
          id: 2,
          name: 'Store Staff Counter',
          email: 'staff@dairy.com',
          role: 'staff',
          phone: '+91 98100 00002'
        };
        const dummyToken = 'demo-staff-jwt-token-2026';
        setToken(dummyToken);
        setUser(dummyUser);
        localStorage.setItem('dairy_token', dummyToken);
        localStorage.setItem('dairy_user', JSON.stringify(dummyUser));
        addToast('Welcome back, Store Staff Counter!', 'success');
        return { success: true, user: dummyUser, token: dummyToken };
      }

      const errMsg = error.response?.data?.message || 'Login failed. Please verify your email and password.';
      addToast(errMsg, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (showToast = true) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('dairy_token');
    localStorage.removeItem('dairy_user');
    if (showToast) {
      addToast('Logged out successfully', 'info');
    }
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initialLoading,
        isAdmin,
        isStaff,
        login,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
