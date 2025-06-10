
// Development configuration
export const DEV_CONFIG = {
  // Set to true to bypass authentication during development
  DISABLE_AUTH_FOR_DEV: true,
  
  // Default role for development mode
  DEFAULT_DEV_ROLE: 'teacher' as 'teacher' | 'student'
};

// Mock user data for development
export const MOCK_USER_DATA = {
  teacher: {
    user: {
      id: 'dev-teacher-123',
      email: 'teacher@dev.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'dev-teacher-123',
      email: 'teacher@dev.com',
      full_name: 'Dev Teacher',
      role: 'teacher' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  student: {
    user: {
      id: 'dev-student-456',
      email: 'student@dev.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'dev-student-456',
      email: 'student@dev.com',
      full_name: 'Dev Student',
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
};
