
// Development configuration
export const DEV_CONFIG = {
  // Set to false to require proper authentication in development
  DISABLE_AUTH_FOR_DEV: false,
  
  // Default role for development mode (when auth is disabled)
  DEFAULT_DEV_ROLE: 'teacher' as 'teacher' | 'student'
};

// Note: Mock user data removed - application now uses proper authentication
// Users must log in with real accounts to access the application
