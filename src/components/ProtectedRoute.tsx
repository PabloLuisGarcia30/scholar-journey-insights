
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { DEV_CONFIG } from '@/config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/auth'
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Development mode: bypass authentication
  if (DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
    // Get role from URL params or use default
    const roleFromUrl = searchParams.get('role') as UserRole;
    const currentRole = roleFromUrl || DEV_CONFIG.DEFAULT_DEV_ROLE;

    // Check role requirements when bypassing auth
    if (requiredRole && currentRole !== requiredRole) {
      // Redirect based on the attempted role
      const roleRedirect = currentRole === 'student' ? '/student-dashboard?role=student' : '/?role=teacher';
      return <Navigate to={roleRedirect} replace />;
    }

    return <>{children}</>;
  }

  // Normal authentication flow (when DEV_CONFIG.DISABLE_AUTH_FOR_DEV is false)
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Redirect based on user's actual role
    const roleRedirect = profile?.role === 'student' ? '/student-dashboard' : '/';
    return <Navigate to={roleRedirect} replace />;
  }

  return <>{children}</>;
}
