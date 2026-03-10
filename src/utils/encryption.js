// Frontend encryption using Web Crypto API
// Uses a shared key derived from environment variable or a default key

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM auth tag

// Get encryption key from environment or use default
// In production, this should match the backend ENCRYPTION_KEY
const getEncryptionKeyString = () => {
    // Check for environment variable (set at build time)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_ENCRYPTION_KEY) {
        return process.env.REACT_APP_ENCRYPTION_KEY;
    }
    // Default key - should match backend default or be set via env
    return 'default_encryption_key_32_bytes_long!!';
};

// Derive encryption key from string using PBKDF2 (to match backend)
async function getEncryptionKey() {
    const keyString = getEncryptionKeyString();
    const encoder = new TextEncoder();
    
    // Use a fixed salt to match backend derivation
    const salt = new Uint8Array(16).fill(0); // Fixed salt like backend
    
    // Import key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(keyString),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    // Derive key using PBKDF2 (matching backend)
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-512',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
    
    // Debug: Export and log first few bytes in development (only if process is available)
    if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        try {
            const exported = await crypto.subtle.exportKey('raw', derivedKey);
            const keyBytes = new Uint8Array(exported);
            console.log('Derived key (first 8 bytes):', Array.from(keyBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(''));
        } catch (e) {
            // Ignore export errors
        }
    }
    
    return derivedKey;
}

/**
 * Encrypt data
 * @param {string} text - Plain text to encrypt
 * @returns {Promise<string>} - Encrypted data as base64 string
 */
export async function encrypt(text) {
    try {
        const key = await getEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv: iv },
            key,
            data
        );
        
        // In Web Crypto API, the encrypted data includes the auth tag (last 16 bytes)
        // Combine IV and encrypted data (which includes auth tag)
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        // Convert to base64 (matching backend format)
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt data
 * @param {string} encryptedData - Encrypted data as base64 string
 * @returns {Promise<string>} - Decrypted plain text
 */
export async function decrypt(encryptedData) {
    try {
        if (!encryptedData || typeof encryptedData !== 'string') {
            throw new Error('Invalid encrypted data: must be a non-empty string');
        }
        
        const key = await getEncryptionKey();
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
            throw new Error(`Encrypted data too short: ${combined.length} bytes (expected at least ${IV_LENGTH + AUTH_TAG_LENGTH})`);
        }
        
        // Extract IV (first 12 bytes)
        const iv = combined.slice(0, IV_LENGTH);
        
        // The rest is encrypted data (which includes auth tag at the end)
        // Format: IV (12 bytes) + encrypted_data + auth_tag (16 bytes)
        const encryptedWithTag = combined.slice(IV_LENGTH);
        
        if (encryptedWithTag.length < AUTH_TAG_LENGTH) {
            throw new Error(`Encrypted data with tag too short: ${encryptedWithTag.length} bytes (expected at least ${AUTH_TAG_LENGTH})`);
        }
        
        // Web Crypto API decrypt expects encrypted data with auth tag appended
        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: iv },
            key,
            encryptedWithTag
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        console.error('Encrypted data length:', encryptedData?.length);
        console.error('Encrypted data preview:', encryptedData?.substring(0, 50));
        throw new Error('Decryption failed: ' + error.message);
    }
}

/**
 * Encrypt JSON object
 * @param {object} data - Object to encrypt
 * @returns {Promise<string>} - Encrypted JSON string
 */
export async function encryptJSON(data) {
    return encrypt(JSON.stringify(data));
}

/**
 * Decrypt JSON object
 * @param {string} encryptedData - Encrypted JSON string
 * @returns {Promise<object>} - Decrypted object
 */
export async function decryptJSON(encryptedData) {
    return JSON.parse(await decrypt(encryptedData));
}
