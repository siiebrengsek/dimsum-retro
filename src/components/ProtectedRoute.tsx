import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const user = useAuthStore((s) => s.user);
    const profile = useAuthStore((s) => s.profile);
    const isLoading = useAuthStore((s) => s.isLoading);
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
