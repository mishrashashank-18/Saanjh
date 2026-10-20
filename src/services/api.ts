/**
 * Saanjh API Client
 * Connects frontend components to the Node.js / Express backend
 */

export interface User {
  id: string;
  _id?: string;
  fullName: string;
  displayName: string;
  email: string;
  googleId?: string | null;
  emailVerified: boolean;
  mobileNumber?: string;
  dateOfBirth?: string | null;
  genderIdentity?: string;
  profilePhoto?: string;
  bio?: string;
  city?: string;
  education?: string;
  occupation?: string;
  languages?: string[];
  relationshipStatus?: string;
  interests?: string[];
  profileCompleted: boolean;
  role: 'user' | 'admin';
  accountStatus: 'active' | 'suspended' | 'deactivated';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  accessToken?: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  genderIdentity?: string;
  termsAccepted: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  fullName?: string;
  displayName?: string;
  mobileNumber?: string;
  dateOfBirth?: string;
  genderIdentity?: string;
  bio?: string;
  city?: string;
  education?: string;
  occupation?: string;
  languages?: string[];
  relationshipStatus?: string;
  interests?: string[];
  profilePhoto?: string;
}

// API Base URL from environment variable or default to backend port 5000 / relative proxy
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

class ApiError extends Error {
  statusCode: number;
  data?: any;
  field?: string;

  constructor(message: string, statusCode: number, data?: any, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.field = field;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Sends & receives HTTP-only JWT cookies across origins
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkError: any) {
    throw new ApiError(
      'Unable to connect to the Saanjh server. Please ensure the backend server is running on port 5000.',
      0,
      networkError
    );
  }

  let data: any = {};
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const errorMessage =
      data.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, data, data.field);
  }

  return data as T;
}

export const api = {
  auth: {
    signup(data: SignupData): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    login(data: LoginData): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    google(credential: string): Promise<AuthResponse> {
      return request<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
    },

    logout(): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    },

    getMe(): Promise<{ success: boolean; user: User }> {
      return request<{ success: boolean; user: User }>('/api/auth/me', {
        method: 'GET',
      });
    },
  },

  users: {
    getMe(): Promise<{ success: boolean; user: User }> {
      return request<{ success: boolean; user: User }>('/api/users/me', {
        method: 'GET',
      });
    },

    updateMe(data: UpdateProfileData): Promise<{ success: boolean; message: string; user: User }> {
      return request<{ success: boolean; message: string; user: User }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    updatePhoto(photoUrl: string): Promise<{ success: boolean; message: string; profilePhoto: string; user: User }> {
      return request<{ success: boolean; message: string; profilePhoto: string; user: User }>('/api/users/me/photo', {
        method: 'POST',
        body: JSON.stringify({ photoUrl }),
      });
    },
  },

  health: {
    check(): Promise<{ status: string; service: string; database: { connected: boolean; state: string } }> {
      return request('/api/health', { method: 'GET' });
    },
  },
};

export { ApiError };
export default api;
