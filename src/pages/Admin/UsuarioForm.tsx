import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useSystemProfiles } from '@/hooks/useSystemProfiles';
import { sanitizeError } from '@/lib/errorHandling';

const usuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().optional(),
  ativo: z.boolean().default(true),
  password: z.union([
    z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    z.literal('')
  ]).optional(),
  roles: z.array(z.enum(['admin', 'vendedor', 'financeiro', 'atendente'])).optional(),
  profiles: z.array(z.string()).min(1, 'Selecione ao menos um perfil RBAC'),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

export default function UsuarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const { profiles: systemProfiles, isLoading: profilesLoading } = useSystemProfiles();

  const { data: usuario } = useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id);
      
      if (rolesError) throw rolesError;

      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('user_id', id);
      
      if (profilesError) throw profilesError;

      return {
        ...profile,
        roles: roles.map(r => r.role),
        profiles: userProfiles.map(p => p.profile_id),
      };
    },
    enabled: isEditing,
  });

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: '',
      email: '',
      whatsapp: '',
      ativo: true,
      password: '',
      roles: [],
      profiles: [],
    },
    values: usuario ? { 
      ...usuario, 
      password: '', 
      whatsapp: usuario.whatsapp || '', 
      ativo: usuario.ativo ?? true,
      profiles: usuario.profiles || [],
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (data: UsuarioFormData) => {
      if (isEditing) {
        // Check if email changed
        const emailChanged = usuario?.email && data.email.toLowerCase() !== usuario.email.toLowerCase();
        
        if (emailChanged) {
          // Call edge function to update email
          const { data: result, error: emailError } = await supabase.functions.invoke('admin-update-email', {
            body: { userId: id, newEmail: data.email },
          });
          
          if (emailError) throw emailError;
          if (result?.error) throw new Error(result.error);
        }

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            nome: data.nome, 
            whatsapp: data.whatsapp || null,
            ativo: data.ativo 
          })
          .eq('id', id);
        
        if (profileError) throw profileError;

        // Update roles - remove old ones and add new ones
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', id);
        
        if (deleteError) throw deleteError;

        const rolesToInsert = data.roles.map(role => ({
          user_id: id,
          role,
        }));

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);
        
        if (rolesError) throw rolesError;

        // Atualizar perfis RBAC (novo sistema)
        // Buscar perfis atuais para comparação
        const { data: currentProfiles } = await supabase
          .from('user_profiles')
          .select('profile_id')
          .eq('user_id', id);
        
        const currentProfileIds = currentProfiles?.map(p => p.profile_id) || [];
        const newProfileIds = data.profiles || [];
        
        // Remover perfis que não estão mais selecionados
        const profilesToRemove = currentProfileIds.filter(pid => !newProfileIds.includes(pid));
        if (profilesToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', id)
            .in('profile_id', profilesToRemove);
          
          if (removeError) throw removeError;
        }
        
        // Adicionar novos perfis que não existem ainda
        const profilesToAdd = newProfileIds.filter(pid => !currentProfileIds.includes(pid));
        if (profilesToAdd.length > 0) {
          const profilesToInsert = profilesToAdd.map(profileId => ({
            user_id: id,
            profile_id: profileId,
          }));

          const { error: profilesError } = await supabase
            .from('user_profiles')
            .insert(profilesToInsert);
          
          if (profilesError) throw profilesError;
        }

        // Reset password if provided (admin-only via edge function)
        if (data.password && data.password.length >= 6) {
          const { error: passError } = await supabase.functions.invoke('admin-reset-password', {
            body: { userId: id, password: data.password },
          });
          if (passError) throw passError;
        }
      } else {
        // Create new user via edge function (avoids auto-login)
        const { data: result, error: createError } = await supabase.functions.invoke('admin-create-user', {
          body: {
            email: data.email,
            password: data.password!,
            nome: data.nome,
            whatsapp: data.whatsapp || null,
            ativo: data.ativo,
            roles: data.roles || [],
            profiles: data.profiles || [],
          },
        });
        
        if (createError) throw createError;
        if (result?.error) throw new Error(result.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Sucesso',
        description: isEditing ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
      });
      navigate('/admin/usuarios');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: UsuarioFormData) => {
    console.log('Submetendo formulário:', data);
    mutation.mutate(data);
  };

  // Log de erros de validação
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log('Erros de validação:', formErrors);
  }

  const roleOptions = [
    { value: 'admin', label: 'Administrador' },
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'atendente', label: 'Atendente' },
  ];

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/admin/usuarios')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        {...field} 
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription className="text-warning-foreground bg-warning/10 p-2 rounded border border-warning/20">
                        ⚠️ Alterar o email permite liberar este endereço para outro usuário. 
                        Pedidos, comissões e histórico continuarão vinculados a este cadastro.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="(00) 00000-0000"
                        onChange={(e) => {
                          const formatted = e.target.value
                            .replace(/\D/g, '')
                            .replace(/(\d{2})(\d)/, '($1) $2')
                            .replace(/(\d{5})(\d)/, '$1-$2')
                            .replace(/(-\d{4})\d+?$/, '$1');
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditing ? 'Nova Senha' : 'Senha'}{isEditing ? '' : ' *'}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} placeholder={isEditing ? 'Deixe em branco para não alterar' : ''} />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>Opcional. Informe para redefinir a senha do usuário.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Usuário Ativo</FormLabel>
                      <FormDescription>
                        Desabilite para impedir o acesso do usuário ao sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />


              {!profilesLoading && systemProfiles.length > 0 && (
                <FormField
                  control={form.control}
                  name="profiles"
                  render={() => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel className="text-base">Perfis de Acesso *</FormLabel>
                        <FormDescription>
                          Selecione ao menos um perfil de acesso para o usuário
                        </FormDescription>
                      </div>
                      <div className="space-y-3 mt-3 max-h-60 overflow-y-auto">
                        {systemProfiles.filter(p => p.ativo).map((profile) => (
                          <FormField
                            key={profile.id}
                            control={form.control}
                            name="profiles"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(profile.id);
                              return (
                                <div className="flex items-start space-x-2 p-2 border rounded">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      const value = field.value || [];
                                      if (checked) {
                                        field.onChange([...value, profile.id]);
                                      } else {
                                        field.onChange(value.filter((id) => id !== profile.id));
                                      }
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{profile.nome}</div>
                                    {profile.descricao && (
                                      <div className="text-xs text-muted-foreground">{profile.descricao}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  onClick={(e) => {
                    // Força a validação do formulário
                    form.handleSubmit(onSubmit)(e);
                  }}
                >
                  {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/admin/usuarios')}>
                  Cancelar
                </Button>
              </div>
              
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                  <p className="font-semibold">Corrija os seguintes erros:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {form.formState.errors.nome && (
                      <li>{form.formState.errors.nome.message}</li>
                    )}
                    {form.formState.errors.email && (
                      <li>{form.formState.errors.email.message}</li>
                    )}
                    {form.formState.errors.password && (
                      <li>{form.formState.errors.password.message}</li>
                    )}
                    {form.formState.errors.roles && (
                      <li>{form.formState.errors.roles.message}</li>
                    )}
                  </ul>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
