import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRole();
  const location = useLocation();
  
  // Timeout de segurança para evitar loading infinito
  const [timedOut, setTimedOut] = useState(false);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading || rolesLoading) {
        console.warn('[ProtectedRoute] Loading timeout (6s) - forcing render');
        setTimedOut(true);
      }
    }, 6000);

    return () => clearTimeout(timeout);
  }, [loading, rolesLoading]);

  // Debug log detalhado para identificar problemas de carregamento
  if (process.env.NODE_ENV === 'development') {
    console.log('[ProtectedRoute] State:', { 
      authLoading: loading, 
      rolesLoading, 
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      timedOut,
      currentPath: location.pathname
    });
  }

  // Mostrar loading enquanto autentica (com limite de tempo)
  if ((loading || rolesLoading) && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se timeout atingido e ainda não há usuário, redirecionar para login preservando a URL de destino
  if (timedOut && !user) {
    console.warn('[ProtectedRoute] Timeout reached without user - redirecting to auth');
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Redirecionar para login se não autenticado, preservando a URL de destino
  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Verificar permissão de admin se necessário
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
