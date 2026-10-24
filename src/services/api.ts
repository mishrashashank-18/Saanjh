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
  authProvider?: 'local' | 'google';
  emailVerified: boolean;
  onboardingStep: 'signup' | 'verify' | 'google_complete' | 'profile' | 'interests' | 'interest_questions' | 'done';
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
  user?: User;
  onboardingStep?: User['onboardingStep'];
  email?: string;
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

export interface PartnerPriorities {
  attractiveness: number;
  sincerity: number;
  intelligence: number;
  humour: number;
  ambition: number;
  sharedInterests: number;
}

export interface ProfileData {
  genderPreference: string[];
  ageRange: { min: number; max: number };
  relationshipGoal: string;
  city: string;
  maxDistanceKm: number;
  languages: string[];
  partnerPriorities: PartnerPriorities;
  goingOutFrequency: string;
  culturalImportance?: string;
  dealBreakers?: string;
  notes?: string;
  isFinalSubmit?: boolean;
}

export interface InterestCatalogItem {
  slug: string;
  label: string;
}

export interface InterestCategoryCatalog {
  key: string;
  label: string;
  items: InterestCatalogItem[];
}

export interface UserInterestsData {
  categories: string[];
  interests: string[];
  top3: string[];
  skip?: boolean;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionItem {
  questionId?: string;
  questionIndex?: number;
  dimension?: string;
  text: string;
  options: (string | QuestionOption)[];
  skippable?: boolean;
  isSensitive?: boolean;
}

export interface CategoryQuestionData {
  category: string;
  categoryLabel: string;
  questions: QuestionItem[];
  source?: string;
  model?: string;
  promptVersion?: string;
  answers?: any[];
  answer?: {
    q1?: string;
    q2?: string;
    sharePreference?: string;
  } | null;
  sharedQuestion?: QuestionItem;
}

// API Base URL
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  data?: any;
  field?: string;
  retryAfter?: number;

  constructor(message: string, statusCode: number, data?: any, field?: string, code?: string, retryAfter?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.field = field;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('saanjh_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      'Unable to connect to the Saanjh server. Please check your internet connection or verify the server is running.',
      0,
      networkError,
      undefined,
      'NETWORK_ERROR'
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
    let friendlyMessage = data.message || `Request failed with status ${response.status}`;

    if (response.status === 429) {
      friendlyMessage = data.message || 'You have made too many requests. Please pause for a moment and try again.';
    } else if (response.status === 401) {
      friendlyMessage = data.message || 'Your session has expired. Please log in again.';
    }

    throw new ApiError(
      friendlyMessage,
      response.status,
      data,
      data.field,
      data.code,
      data.retryAfter
    );
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

    async verifyOtp(data: { email: string; code: string }): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('saanjh_token', res.accessToken);
      }
      return res;
    },

    resendOtp(data: { email: string }): Promise<{ success: boolean; message: string }> {
      return request<{ success: boolean; message: string }>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async login(data: LoginData): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('saanjh_token', res.accessToken);
      }
      return res;
    },

    async google(credential: string): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });
      if (res.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('saanjh_token', res.accessToken);
      }
      return res;
    },

    async googleComplete(data: { dateOfBirth: string; genderIdentity: string; email?: string }): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/google-complete', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('saanjh_token', res.accessToken);
      }
      return res;
    },

    async logout(): Promise<{ success: boolean; message: string }> {
      try {
        return await request<{ success: boolean; message: string }>('/api/auth/logout', {
          method: 'POST',
        });
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('saanjh_token');
        }
      }
    },

    getMe(): Promise<{ success: boolean; user: User; onboardingStep: User['onboardingStep'] }> {
      return request<{ success: boolean; user: User; onboardingStep: User['onboardingStep'] }>('/api/auth/me', {
        method: 'GET',
      });
    },
  },

  onboarding: {
    getProfile(): Promise<{ success: boolean; profile: ProfileData; user: Partial<User> }> {
      return request('/api/onboarding/profile', { method: 'GET' });
    },

    saveProfile(data: Partial<ProfileData>): Promise<{ success: boolean; message: string; profile: ProfileData; onboardingStep: User['onboardingStep'] }> {
      return request('/api/onboarding/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getCatalog(): Promise<{ success: boolean; catalog: Record<string, InterestCategoryCatalog> }> {
      return request('/api/onboarding/interests/catalog', { method: 'GET' });
    },

    getUserInterests(): Promise<{ success: boolean; userInterests: UserInterestsData }> {
      return request('/api/onboarding/interests', { method: 'GET' });
    },

    saveUserInterests(data: UserInterestsData): Promise<{ success: boolean; message: string; userInterests?: UserInterestsData; onboardingStep: User['onboardingStep'] }> {
      return request('/api/onboarding/interests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getQuestions(): Promise<{ success: boolean; topCategories: string[]; categoriesQuestions: CategoryQuestionData[] }> {
      return request('/api/onboarding/questions', { method: 'GET' });
    },

    saveAnswer(data: {
      category: string;
      answers?: {
        questionIndex: number;
        questionId: string;
        dimension: string;
        selectedValue: string;
        skipped?: boolean;
      }[];
      q1?: string;
      q2?: string;
      sharePreference?: string;
      skipped?: boolean;
    }): Promise<{ success: boolean; message: string; completedAll: boolean; onboardingStep: User['onboardingStep'] }> {
      return request('/api/onboarding/answers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getSettings(): Promise<{ success: boolean; user: User; profile: ProfileData | null; userInterests: UserInterestsData | null }> {
      return request('/api/onboarding/settings', { method: 'GET' });
    },

    updateSettingsProfile(data: Partial<ProfileData>): Promise<{ success: boolean; message: string; profile: ProfileData }> {
      return request('/api/onboarding/settings/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    updateSettingsInterests(data: UserInterestsData): Promise<{ success: boolean; message: string; userInterests: UserInterestsData }> {
      return request('/api/onboarding/settings/interests', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  health: {
    check(): Promise<{ status: string; service: string; database: { connected: boolean; state: string } }> {
      return request('/api/health', { method: 'GET' });
    },
  },
};

export default api;
