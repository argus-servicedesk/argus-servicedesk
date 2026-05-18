import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const CLIENT_ALLOWED_PREFIXES = [
  '/dashboard',
  '/incidents',
  '/problems',
  '/changes',
  '/catalog',
  '/service-requests',
  '/kb',
  '/knowledge-base',
  '/notifications',
  '/profile',
  '/settings',
  '/portal',
];

function clientCanOpen(pathname: string) {
  if (pathname === '/change-password') return true;
  if (pathname === '/catalog/create') return false;
  return CLIENT_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user, isLoading, hasHydrated } = useAuthStore();
  const location = useLocation();

  if (!hasHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-signal/30 border-t-signal rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-mono">Checking session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  if (user?.role === 'CLIENT' && !clientCanOpen(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold text-stone-900 mb-2">Access Denied</h2>
          <p className="text-sm text-stone-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
