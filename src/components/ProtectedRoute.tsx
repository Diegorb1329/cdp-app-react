import { Navigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route that requires user to be zk_verified
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.zk_verified) {
    return <Navigate to="/app/humanity-proof" replace />;
  }

  return <>{children}</>;
}

