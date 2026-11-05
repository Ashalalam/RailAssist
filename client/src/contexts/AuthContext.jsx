import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import localDB from '../services/db';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('railassist_token'));
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const logout = useCallback(async () => {
    localStorage.removeItem('railassist_token');
    setToken(null);
    setUser(null);
    try {
      await localDB.delete('profile', 'current_user');
      await localDB.clear('journeys');
      await localDB.clear('templates');
      await localDB.clear('reports');
    } catch (err) {
      console.error('Logout cache clear failed:', err);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial auth load
    const loadSession = async () => {
      try {
        await localDB.init();
        
        if (token) {
          if (navigator.onLine) {
            // Verify token with backend
            try {
              const profile = await api.auth.getProfile();
              setUser(profile);
              // Cache profile locally
              await localDB.put('profile', { key: 'current_user', ...profile });
            } catch (err) {
              console.error('Session validation failed online, trying local cache:', err);
              // Fallback to local profile cache
              const cachedUser = await localDB.get('profile', 'current_user');
              if (cachedUser) {
                setUser(cachedUser);
              } else {
                logout();
              }
            }
          } else {
            // Offline fallback - load profile from local IndexedDB
            const cachedUser = await localDB.get('profile', 'current_user');
            if (cachedUser) {
              setUser(cachedUser);
            } else {
              logout();
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, logout]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      localStorage.setItem('railassist_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      // Cache session in IndexedDB
      await localDB.put('profile', { key: 'current_user', ...data.user });
      return data.user;
    } catch (error) {
      // In offline scenario, check if the email matches the cached profile
      if (!navigator.onLine) {
        const cachedUser = await localDB.get('profile', 'current_user');
        if (cachedUser && cachedUser.email === email.toLowerCase()) {
          // Allow offline login for same user
          setUser(cachedUser);
          return cachedUser;
        }
        throw new Error('Offline login is only available for the previously logged-in user on this device.', { cause: error });
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await api.auth.register(userData);
      localStorage.setItem('railassist_token', data.token);
      setToken(data.token);
      setUser(data.user);
      await localDB.put('profile', { key: 'current_user', ...data.user });
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    if (navigator.onLine) {
      const updatedUser = await api.auth.updateProfile(profileData);
      setUser(updatedUser);
      await localDB.put('profile', { key: 'current_user', ...updatedUser });
      return updatedUser;
    } else {
      // Offline edit: update local cache and note that it's pending profile sync
      const cachedUser = await localDB.get('profile', 'current_user');
      const merged = { ...cachedUser, ...profileData };
      setUser(merged);
      await localDB.put('profile', { key: 'current_user', ...merged });
      // We save profile update to profile store to sync later if needed
      await localDB.put('profile', { key: 'pending_profile_update', ...profileData });
      return merged;
    }
  };

  const requestPasswordReset = async (email) => {
    return await api.auth.requestPasswordReset(email);
  };

  const resetPassword = async (token, newPassword) => {
    return await api.auth.resetPassword(token, newPassword);
  };

  const forgotPassword = async (email) => {
    return await api.auth.requestPasswordReset(email);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      isOnline, 
      login, 
      register, 
      logout, 
      updateProfile, 
      requestPasswordReset, 
      resetPassword, 
      forgotPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
