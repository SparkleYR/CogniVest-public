// Backend authentication utilities
const API_BASE_URL = '/api';

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
  timezone?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface BackendUser {
  id: string;
  username: string;
  email: string | null;
  timezone?: string;
  visibility?: string;
  currentStreak?: number;
  totalXp?: number;
  createdAt?: string;
}

export interface UserStats {
  currentStreak: number;
  totalXp: number;
  totalSolves: number;
  totalSubmissions: number;
  totalStreakDays: number;
  problemsByDifficulty: {
    Easy?: number;
    Medium?: number;
    Hard?: number;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: BackendUser;
  message?: string;
  token?: string;
}

// Cookie management utilities
export const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// Backend authentication functions
export const registerUser = async (userData: RegisterRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in requests
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (response.ok && data.user) {
      // Don't store auth token in frontend cookie - backend sets httpOnly cookie
      // The backend already sets the httpOnly cookie via credentials: 'include'

      // Store user data in localStorage for persistence
      localStorage.setItem('backend_user', JSON.stringify(data.user));
      localStorage.setItem('auth_type', 'backend');

      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Registration failed',
      };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
};

export const loginUser = async (credentials: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in requests
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (response.ok && data.user) {
      // Don't store auth token in frontend cookie - backend sets httpOnly cookie
      // The backend already sets the httpOnly cookie via credentials: 'include'

      // Store user data in localStorage for persistence
      localStorage.setItem('backend_user', JSON.stringify(data.user));
      localStorage.setItem('auth_type', 'backend');

      return {
        success: true,
        user: data.user,
        token: data.token,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Login failed',
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
};

export const logoutBackendUser = async (): Promise<void> => {
  try {
    // Clear stored data
    localStorage.removeItem('backend_user');
    localStorage.removeItem('auth_type');
    // Don't delete frontend cookie since we're using httpOnly cookies

    // Call backend logout endpoint to clear httpOnly cookie
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookie
      });
    } catch (error) {
      console.log('Backend logout call failed, but local cleanup completed');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Check if user is authenticated with backend
export const getBackendUser = (): BackendUser | null => {
  try {
    const authType = localStorage.getItem('auth_type');
    if (authType !== 'backend') return null;

    const userData = localStorage.getItem('backend_user');
    if (!userData) return null;

    return JSON.parse(userData);
  } catch (error) {
    console.error('Error getting backend user:', error);
    return null;
  }
};

// Validate token and refresh user data if needed
export const validateBackendAuth = async (): Promise<BackendUser | null> => {
  const cachedUser = getBackendUser();

  if (!cachedUser) {
    console.log('[BackendAuth] No cached user found');
    return null;
  }

  // Don't check frontend cookies since we're using httpOnly cookies
  // The backend will validate the httpOnly cookie automatically

  // Actually validate the token with the backend
  try {
    console.log('[BackendAuth] Validating token with backend...');
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Use httpOnly cookie for validation
    });

    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        console.log('[BackendAuth] Token validation successful, updating user data');
        // Update stored user data with fresh data from backend
        localStorage.setItem('backend_user', JSON.stringify(data.user));
        return data.user;
      }
    }

    // If validation fails, clear auth data
    console.log('[BackendAuth] Token validation failed, clearing auth data');
    await logoutBackendUser();
    return null;
  } catch (error) {
    console.error('[BackendAuth] Token validation error:', error);
    // On network error, try one more time after a short delay
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (retryResponse.ok) {
        const data = await retryResponse.json();
        if (data.user) {
          console.log('[BackendAuth] Token validation successful on retry');
          localStorage.setItem('backend_user', JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch (retryError) {
      console.error('[BackendAuth] Retry validation failed:', retryError);
    }
    
    // If both attempts fail, keep cached user but log the error
    console.log('[BackendAuth] Using cached user due to network error');
    return cachedUser;
  }
};

// Check if auth token is expired (client-side check)
export const isTokenExpired = (): boolean => {
  const token = getCookie('auth_token');
  if (!token) return true;

  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (with 5 minute buffer)
    return payload.exp && payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('[BackendAuth] Error checking token expiration:', error);
    return true;
  }
};

// Fetch current user from backend API
export const fetchCurrentUser = async (): Promise<BackendUser | null> => {
  try {
    const token = getCookie('auth_token');
    if (!token) return null;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        // Update stored user data
        localStorage.setItem('backend_user', JSON.stringify(data.user));
        return data.user;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
};

// Cache for user stats and subscription status
const profileCache = {
  stats: null as UserStats | null,
  subscription: null as { isSubscriptionActive: boolean } | null,
  statsTimestamp: 0,
  subscriptionTimestamp: 0,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Fetch user stats from backend API
export const fetchUserStats = async (): Promise<UserStats | null> => {
  try {
    // Check cache first
    const now = Date.now();
    if (profileCache.stats && (now - profileCache.statsTimestamp) < profileCache.CACHE_DURATION) {
      console.log('[BackendAuth] Returning cached stats');
      return profileCache.stats;
    }

    const response = await fetch(`${API_BASE_URL}/auth/me/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const stats = data.stats || null;
      
      // Cache the result
      if (stats) {
        profileCache.stats = stats;
        profileCache.statsTimestamp = now;
        console.log('[BackendAuth] Stats cached successfully');
      }
      
      return stats;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
};

// Fetch subscription status from backend API
export const fetchSubscriptionStatus = async (): Promise<{ isSubscriptionActive: boolean } | null> => {
  try {
    // Check cache first
    const now = Date.now();
    if (profileCache.subscription && (now - profileCache.subscriptionTimestamp) < profileCache.CACHE_DURATION) {
      console.log('[BackendAuth] Returning cached subscription status');
      return profileCache.subscription;
    }

    const response = await fetch(`${API_BASE_URL}/subscription/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      
      // Cache the result
      profileCache.subscription = data;
      profileCache.subscriptionTimestamp = now;
      console.log('[BackendAuth] Subscription status cached successfully');
      
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return null;
  }
};

// Create subscription
export const createSubscription = async (): Promise<{ success: boolean; subscriptionId?: string; shortUrl?: string; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/subscription/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        subscriptionId: data.subscriptionId,
        shortUrl: data.shortUrl,
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to create subscription',
      };
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
};

// Change password
export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getCookie('auth_token');
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, message: data.message || 'Password changed successfully' };
    }
    return { success: false, message: data.error || 'Failed to change password' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

// Delete account (soft delete with 7-day grace period)
export const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getCookie('auth_token');
    if (!token) {
      return { success: false, message: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Clear local auth data
      localStorage.removeItem('backend_user');
      localStorage.removeItem('auth_type');
      deleteCookie('auth_token');
      return { success: true, message: data.message || 'Account deleted successfully' };
    }
    return { success: false, message: data.error || 'Failed to delete account' };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};
