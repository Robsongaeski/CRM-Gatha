import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

// Valor padrão para quando o contexto não está disponível (durante hot reload)
const defaultAuthContext = {
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: new Error('AuthProvider not available') }),
  signUp: async () => ({ error: new Error('AuthProvider not available') }),
  signOut: async () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Durante hot reload ou quando fora do provider, retornar contexto padrão
  // em vez de lançar erro
  if (context === undefined) {
    console.warn('[useAuth] Context not available - returning default (loading) state');
    return defaultAuthContext;
  }
  
  return context;
}
