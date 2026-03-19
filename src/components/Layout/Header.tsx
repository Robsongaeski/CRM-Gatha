import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/NotificationBell';

export function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin, isVendedor, isFinanceiro, isAtendente, isPcp } = useUserRole();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Determinar label baseado nas verificações de role/perfil
  const roleLabel = isAdmin ? 'Administrador' : 
                    isVendedor ? 'Vendedor' : 
                    isFinanceiro ? 'Financeiro' :
                    isPcp ? 'PCP / Produção' :
                    isAtendente ? 'Atendente' : 'Usuário';

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <SidebarTrigger />
      
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="text-right">
          <p className="text-sm font-medium">{profile?.nome || user?.email}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {profile?.nome?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Button variant="outline" size="icon" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
