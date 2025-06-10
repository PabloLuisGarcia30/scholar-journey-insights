
// Development mode configuration
export const isDevelopment = import.meta.env.DEV;

export const DEVELOPMENT_CONFIG = {
  bypassAuth: isDevelopment,
  mockUser: {
    id: 'dev-user-123',
    email: 'dev@example.com',
    full_name: 'Development User',
    role: 'teacher' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
};
