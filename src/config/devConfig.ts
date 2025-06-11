
// Development configuration
export const DEV_CONFIG = {
  // Set to true to bypass authentication during development
  DISABLE_AUTH_FOR_DEV: true,
  
  // Default role for development mode
  DEFAULT_DEV_ROLE: 'teacher' as 'teacher' | 'student'
};

// Mock user data for development - using Pablo Luis Garcia's real data for student mode
export const MOCK_USER_DATA = {
  teacher: {
    user: {
      id: 'dev-teacher-123',
      email: 'mr.cullen@school.edu',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'dev-teacher-123',
      email: 'mr.cullen@school.edu',
      full_name: 'Mr. Cullen',
      role: 'teacher' as const,
      teacher_id: 'TCH001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  },
  student: {
    user: {
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', // Pablo's real ID
      email: 'PabloLuisAlegaGarcia@gmail.com', // Pablo's real email
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    profile: {
      id: 'f2b40ffb-6348-4fa9-ade5-105bd1eb6b26', // Pablo's real ID
      email: 'PabloLuisAlegaGarcia@gmail.com', // Pablo's real email
      full_name: 'Pablo Luis Garcia', // Pablo's real name
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
};
