import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useMemo } from 'react';
import { useSystemProfiles } from '@/hooks/useSystemProfiles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Shield } from 'lucide-react';

const perfilSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  codigo: z.string().min(3, 'Código deve ter no mínimo 3 caracteres').max(20, 'Código deve ter no máximo 20 caracteres').regex(/^[a-z_]+$/, 'Código deve conter apenas letras minúsculas e underscore'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
  permissions: z.array(z.string()).min(1, 'Selecione ao menos uma permissão'),
});

type PerfilFormData = z.infer<typeof perfilSchema>;

export default function PerfilForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { permissions, getProfileWithPermissions, saveProfile, isSaving } = useSystemProfiles();

  const form = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nome: '',
      codigo: '',
      descricao: '',
      ativo: true,
      permissions: [],
    },
  });

  // Carregar dados do perfil se estiver editando
  useEffect(() => {
    if (isEditing && id) {
      getProfileWithPermissions(id).then((profile) => {
        if (profile) {
          form.reset({
            nome: profile.nome,
            codigo: profile.codigo,
            descricao: profile.descricao || '',
            ativo: profile.ativo,
            permissions: profile.permissions,
          });
        }
      });
    }
  }, [id, isEditing]);

  // Agrupar permissões por categoria
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof permissions> = {};
    permissions.forEach((permission) => {
      if (!grouped[permission.categoria]) {
        grouped[permission.categoria] = [];
      }
      grouped[permission.categoria].push(permission);
    });
    return grouped;
  }, [permissions]);

  const categories = Object.keys(permissionsByCategory).sort();

  // Contar permissões selecionadas por categoria
  const getSelectedCountForCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    const selectedPermissions = form.watch('permissions') || [];
    return categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length;
  };

  // Selecionar/desselecionar todas as permissões de uma categoria
  const toggleCategoryPermissions = (category: string, checked: boolean) => {
    const categoryPermissions = permissionsByCategory[category] || [];
    const currentPermissions = form.watch('permissions') || [];
    
    if (checked) {
      // Adicionar todas as permissões da categoria
      const newPermissions = [...new Set([...currentPermissions, ...categoryPermissions.map(p => p.id)])];
      form.setValue('permissions', newPermissions);
    } else {
      // Remover todas as permissões da categoria
      const categoryIds = categoryPermissions.map(p => p.id);
      const newPermissions = currentPermissions.filter(id => !categoryIds.includes(id));
      form.setValue('permissions', newPermissions);
    }
  };

  const onSubmit = (data: PerfilFormData) => {
    saveProfile({
      id: isEditing ? id : undefined,
      nome: data.nome,
      codigo: data.codigo,
      descricao: data.descricao,
      ativo: data.ativo,
      permissions: data.permissions,
    });
    navigate('/admin/perfis');
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/admin/perfis')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Editar Perfil' : 'Criar Perfil'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Perfil *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Gerente de Vendas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: gerente_vendas" 
                        disabled={isEditing}
                        className={isEditing ? 'bg-muted' : ''}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>
                        O código não pode ser alterado para evitar quebrar referências
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Descreva as responsabilidades deste perfil..."
                        rows={3}
                      />
                    </FormControl>
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
                      <FormLabel className="text-base">Perfil Ativo</FormLabel>
                      <FormDescription>
                        Perfis inativos não aparecem na seleção de usuários
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

              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base">Permissões *</FormLabel>
                    <FormDescription>
                      Selecione as permissões que este perfil terá
                    </FormDescription>
                    
                    <Accordion type="multiple" className="w-full">
                      {categories.map((category) => {
                        const categoryPermissions = permissionsByCategory[category];
                        const selectedCount = getSelectedCountForCategory(category);
                        const totalCount = categoryPermissions.length;
                        const allSelected = selectedCount === totalCount;

                        return (
                          <AccordionItem key={category} value={category}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-medium">{category}</span>
                                <span className="text-sm text-muted-foreground">
                                  {selectedCount}/{totalCount}
                                  {allSelected && ' ✓'}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center space-x-2 pb-2 border-b">
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(checked) => 
                                      toggleCategoryPermissions(category, checked as boolean)
                                    }
                                  />
                                  <label className="text-sm font-medium cursor-pointer">
                                    Selecionar todas
                                  </label>
                                </div>
                                
                                {categoryPermissions.map((permission) => (
                                  <FormField
                                    key={permission.id}
                                    control={form.control}
                                    name="permissions"
                                    render={({ field }) => {
                                      const isChecked = field.value?.includes(permission.id);
                                      return (
                                        <div className="flex items-start space-x-2 pl-6">
                                          <Checkbox
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const value = field.value || [];
                                              if (checked) {
                                                field.onChange([...value, permission.id]);
                                              } else {
                                                field.onChange(value.filter((id) => id !== permission.id));
                                              }
                                            }}
                                          />
                                          <div className="space-y-1">
                                            <label className="text-sm font-medium cursor-pointer">
                                              {permission.descricao}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                              <code>{permission.modulo}.{permission.acao}</code>
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                    
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/admin/perfis')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
