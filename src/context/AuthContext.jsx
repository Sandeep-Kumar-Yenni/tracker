import React, { createContext, useContext, useState, useEffect } from 'react';
import { decryptJSON } from '../utils/encryption';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated by trying to get user info
        // Cookies are automatically sent with requests
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // First check if we have user data stored
            const storedUser = localStorage.getItem('lifeTrackerUser');
            if (storedUser) {
                // If we have stored user, assume authenticated for now
                // The API calls will automatically handle 401s and refresh if needed
                setUser(JSON.parse(storedUser));
                return;
            }

            // If no stored user, try to refresh token to get user data payload
            const userData = await api.post('/api/ath/refresh', {}, { encrypt: false });
            if (userData && userData.id) {
                setUser(userData);
                localStorage.setItem('lifeTrackerUser', JSON.stringify(userData));
            } else {
                setUser(null);
            }
        } catch (error) {
            // Not authenticated - this is expected if user hasn't logged in
            setUser(null);
            localStorage.removeItem('lifeTrackerUser');
        } finally {
            setLoading(false);
        }
    };

    const login = async (userData) => {
        setUser(userData);
        localStorage.setItem('lifeTrackerUser', JSON.stringify(userData));
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('lifeTrackerUser', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await api.post('/api/ath/logout', {});
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('lifeTrackerUser');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
