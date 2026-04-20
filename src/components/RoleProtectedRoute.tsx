import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'vendedor' | 'financeiro' | 'atendente' | 'pcp')[];
  allowedPermissions?: string[];
  redirectTo?: string;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles = [],
  allowedPermissions = [],
  redirectTo = '/dashboard'
}: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { roles, isLoading: rolesLoading } = useUserRole();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const location = useLocation();
  
  // Timeout de segurança para evitar loading infinito
  const [timedOut, setTimedOut] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || rolesLoading || permissionsLoading) {
        console.warn('[RoleProtectedRoute] Loading timeout (8s) - forcing render');
        setTimedOut(true);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading, rolesLoading, permissionsLoading]);

  // Debug log detalhado
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RoleProtectedRoute] Loading state:', {
        authLoading: loading,
        rolesLoading,
        permissionsLoading,
        hasUser: !!user,
        timedOut,
        currentPath: location.pathname,
      });
    }
  }, [loading, rolesLoading, permissionsLoading, user, timedOut, location.pathname]);

  // Calcular permissões antes de qualquer retorno condicional (regra de hooks)
  const hasRestrictions = allowedRoles.length > 0 || allowedPermissions.length > 0;
  const hasRolePermission = allowedRoles.length > 0 && roles.some(role => allowedRoles.includes(role as any));
  const hasSpecificPermission = allowedPermissions.length > 0 && allowedPermissions.some(permission => can(permission));

  // Debug log para ajudar a identificar problemas de permissão
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[RoleProtectedRoute] Permission check:', {
        userEmail: user?.email,
        userId: user?.id,
        roles,
        allowedRoles,
        allowedPermissions,
        hasRolePermission,
        hasSpecificPermission,
        accessGranted: hasRolePermission || hasSpecificPermission,
        timedOut,
      });
    }
  }, [user, roles, allowedRoles, allowedPermissions, hasRolePermission, hasSpecificPermission, timedOut]);

  if ((loading || rolesLoading || permissionsLoading) && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login preservando a URL de destino
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!hasRestrictions) {
    // Sem restrições definidas = acesso liberado (comportamento legado)
    return <>{children}</>;
  }

  // Permitir acesso se tiver role OU permissão específica
  if (!hasRolePermission && !hasSpecificPermission) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
