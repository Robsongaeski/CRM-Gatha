import { createContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Timeout de segurança - garantir que loading não fique travado
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[AuthContext] Safety timeout triggered - forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (mounted) {
          if (error) {
            console.error('[AuthContext] Erro ao recuperar sessão:', error);
          }
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[AuthContext] Erro crítico ao recuperar sessão:', err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast.error(sanitizeError(error));
        return { error };
      }
      
      // Buscar perfis do usuário para redirecionar corretamente
      if (data.user) {
        // Verificar sistema NOVO (user_profiles + system_profiles)
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select(`
            profile_id,
            system_profiles!inner (
              codigo,
              ativo
            )
          `)
          .eq('user_id', data.user.id);
        
        const newProfileCodes = profiles
          ?.filter((p: any) => p.system_profiles?.ativo)
          .map((p: any) => p.system_profiles?.codigo) || [];

        // Fallback: sistema ANTIGO (user_roles)
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);
        
        const oldRoles = roles?.map(r => r.role) || [];
        
        // Combinar ambos os sistemas
        const allRoles = [...new Set([...newProfileCodes, ...oldRoles])];
        
        const isAdmin = allRoles.includes('admin') || allRoles.includes('administrador');
        const isVendedor = allRoles.includes('vendedor');
        const isFinanceiro = allRoles.includes('financeiro');
        const isAtendente = allRoles.includes('atendente');
        const isPcp = allRoles.includes('pcp');
        
        const isAtendenteOnly = isAtendente && !isAdmin && !isVendedor && !isFinanceiro && !isPcp;
        const isFinanceiroOnly = isFinanceiro && !isAdmin && !isVendedor;
        const isPcpOnly = isPcp && !isAdmin && !isVendedor && !isFinanceiro;
        
        toast.success('Login realizado com sucesso!');
        
        // Redirecionar baseado no perfil
        if (isAtendenteOnly) {
          navigate('/entrega-pedidos');
        } else if (isFinanceiroOnly) {
          navigate('/financeiro/pagamentos-pendentes');
        } else if (isPcpOnly) {
          navigate('/pcp/kanban');
        } else {
          navigate('/');
        }
      }
      
      return { error: null };
    } catch (error: any) {
      toast.error('Erro inesperado ao fazer login');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome,
          },
        },
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(sanitizeError(error));
        }
        return { error };
      }
      
      toast.success('Conta criada com sucesso! Verifique seu email.');
      return { error: null };
    } catch (error: any) {
      toast.error('Erro inesperado ao criar conta');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn('[AuthContext] Falha no logout global, tentando logout local:', error);

        const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
        if (localError) {
          throw localError;
        }
      }

      // Garante atualização imediata do estado local, mesmo se o evento demorar.
      setSession(null);
      setUser(null);
      toast.success('Logout realizado com sucesso');
      navigate('/auth', { replace: true });
    } catch (error) {
      toast.error(sanitizeError(error));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
