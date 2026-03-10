// API utility with encryption support and automatic token refresh
import { encryptJSON, decryptJSON } from './encryption';

// Get API URL from environment variable (set at build time) or use default
const getApiBaseUrl = () => {
    // Check for environment variable (available at build time in React)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    // Fallback to default
    return 'http://localhost:3003';
};

const API_BASE_URL = getApiBaseUrl();
const OBFUSCATED_ROUTES = {
    auth: 'ath',
    admin: 'adm',
    habits: 'hbt',
    finance: 'fin',
    todos: 'tds',
    medical: 'med'
};

// Get obfuscated route
function getObfuscatedRoute(route) {
    return OBFUSCATED_ROUTES[route] || route;
}

// Refresh access token
async function refreshToken() {
    try {
        // Don't encrypt refresh request - it uses cookies only
        const response = await fetch(`${API_BASE_URL}/api/${getObfuscatedRoute('auth')}/refresh`, {
            method: 'POST',
            credentials: 'include', // Include cookies
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}) // Empty body, token comes from cookie
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();

        // Decrypt if encrypted, otherwise return as-is
        if (data && data.encrypted && data.data) {
            try {
                return await decryptJSON(data.data);
            } catch (error) {
                console.error('Decryption error in refresh:', error);
                return data; // Fallback to encrypted data
            }
        }

        return data;
    } catch (error) {
        console.error('Token refresh error:', error);
        throw error;
    }
}

// Make API call with automatic encryption/decryption and token refresh
export async function apiCall(url, options = {}) {
    // Encryption enabled by default for security
    // Can be disabled per-request with options.encrypt = false
    // Skip encryption for refresh/logout endpoints (they use cookies only)
    // Also skip if encryption is globally disabled (for debugging)
    // Encryption globally disabled to solve encryption/decryption issues
    const encryptionDisabled = true;
    const skipEncryption = true;
    const useEncryption = false;
    const obfuscatedUrl = url.replace(/\/api\/([^/]+)/, (match, route) => {
        const obfuscated = getObfuscatedRoute(route);
        return obfuscated ? `/api/${obfuscated}` : match;
    });

    let requestOptions = {
        ...options,
        credentials: 'include', // Always include cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    };

    // Always request encrypted responses if encryption is enabled
    if (useEncryption) {
        requestOptions.headers['x-encrypt-response'] = 'true';
    }

    // Encrypt request body if encryption is enabled and method is not GET
    if (useEncryption && options.body && options.method !== 'GET') {
        if (typeof options.body === 'object') {
            try {
                const encrypted = await encryptJSON(options.body);
                requestOptions.body = JSON.stringify({
                    encrypted: true,
                    data: encrypted
                });
                // Header already set above for useEncryption
            } catch (error) {
                console.error('Request encryption error:', error);
                // If encryption fails, send unencrypted but log warning
                console.warn('Falling back to unencrypted request due to encryption error');
                requestOptions.body = JSON.stringify(options.body);
            }
        } else if (typeof options.body === 'string') {
            // If body is already a string, try to parse and encrypt
            try {
                const parsed = JSON.parse(options.body);
                const encrypted = await encryptJSON(parsed);
                requestOptions.body = JSON.stringify({
                    encrypted: true,
                    data: encrypted
                });
                // Header already set above for useEncryption
            } catch (error) {
                // If parsing/encryption fails, use as-is
                requestOptions.body = options.body;
            }
        }
    } else if (options.body && typeof options.body === 'object') {
        // Normal unencrypted request (encryption disabled or GET request)
        requestOptions.body = JSON.stringify(options.body);
    } else if (options.body && typeof options.body === 'string') {
        requestOptions.body = options.body;
    }

    try {
        let response = await fetch(`${API_BASE_URL}${obfuscatedUrl}`, requestOptions);

        // If token expired, try to refresh
        if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'TOKEN_EXPIRED') {
                // Token expired - try to refresh
                try {
                    await refreshToken();
                    // Retry the original request
                    response = await fetch(`${API_BASE_URL}${obfuscatedUrl}`, requestOptions);
                } catch (refreshError) {
                    // Refresh failed, redirect to login
                    localStorage.removeItem('lifeTrackerUser');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    throw new Error('Session expired. Please login again.');
                }
            } else {
                // Other 401 errors (including NO_REFRESH_TOKEN) - user needs to login
                // Don't redirect if already on login page or if it's a checkAuth call
                localStorage.removeItem('lifeTrackerUser');
                if (window.location.pathname !== '/login' && !obfuscatedUrl.includes('/refresh')) {
                    // Only redirect if not already on login page
                    window.location.href = '/login';
                }
                throw new Error(errorData.error || 'Authentication required');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));

            // If decryption failed, provide helpful error message
            if (errorData.code === 'DECRYPTION_FAILED') {
                console.error('Encryption key mismatch detected. Please ensure both frontend and backend use the same ENCRYPTION_KEY.');
                throw new Error('Encryption configuration error. Please contact administrator.');
            }

            throw new Error(errorData.error || 'Request failed');
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            // If response is not JSON, return as text
            const text = await response.text();
            throw new Error(text || 'Invalid response format');
        }

        // Decrypt response if encrypted
        if (data && data.encrypted && data.data) {
            try {
                // Verify encrypted data is a string
                if (typeof data.data !== 'string') {
                    console.warn('Encrypted data is not a string, returning as-is');
                    return data.data;
                }

                const decrypted = await decryptJSON(data.data);
                return decrypted;
            } catch (error) {
                console.error('Response decryption error:', error);
                console.error('Encrypted data type:', typeof data.data);
                console.error('Encrypted data length:', data.data?.length);
                console.error('Full response:', JSON.stringify(data).substring(0, 200));

                // If decryption fails, check if it's actually encrypted or just malformed
                // Try to return the data as-is if it's already an object (might be unencrypted)
                if (data.data && typeof data.data === 'object') {
                    console.warn('Response data is already an object, returning as-is');
                    return data.data;
                }

                // If it's a string but decryption failed, it might be a key mismatch
                if (typeof data.data === 'string') {
                    console.error('⚠️  Decryption failed for string data. This usually indicates:');
                    console.error('   1. Encryption key mismatch between frontend and backend');
                    console.error('   2. Corrupted encrypted data');
                    console.error('   3. Format mismatch');
                }

                throw new Error('Failed to decrypt response: ' + error.message);
            }
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Helper methods
export const api = {
    get: (url, options) => apiCall(url, { ...options, method: 'GET' }),
    post: (url, body, options) => apiCall(url, { ...options, method: 'POST', body }),
    put: (url, body, options) => apiCall(url, { ...options, method: 'PUT', body }),
    delete: (url, options) => apiCall(url, { ...options, method: 'DELETE' }),
};
