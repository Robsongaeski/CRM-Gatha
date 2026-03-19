# 🔐 Sistema de Permissões RBAC - Instruções de Instalação

## ⚠️ IMPORTANTE: Execute na Ordem Correta

### Passo 1: Executar SQL no Supabase
1. Acesse seu projeto no **Supabase Dashboard** (https://supabase.com)
2. Vá em **SQL Editor** (menu lateral esquerdo)
3. Clique em **"+ New query"**
4. Copie TODO o conteúdo do arquivo `rbac-sistema-permissoes.sql`
5. Cole no editor e clique em **RUN** (canto inferior direito)
6. Aguarde a mensagem: ✅ Sistema de permissões RBAC criado com sucesso!

### Passo 2: Atualizar Tipos TypeScript no Lovable
1. Volte para o **Lovable**
2. Clique no ícone de **integração Supabase** (menu lateral)
3. Clique em **"Pull types from Supabase"**
4. Aguarde a sincronização dos tipos TypeScript

### Passo 3: Verificar Tabelas Criadas
As seguintes tabelas devem aparecer:
- ✅ `permissions` (67 permissões)
- ✅ `system_profiles` (4 perfis: admin, vendedor, financeiro, atendente)
- ✅ `profile_permissions` (relacionamento perfil → permissões)
- ✅ `user_profiles` (seus usuários migrados)

### Passo 4: Informar o Lovable
⚠️ **IMPORTANTE**: Depois de executar os passos 1 e 2, volte aqui e me avise:
- "Executei o SQL e fiz Pull types"

Daí eu vou criar os arquivos React (hooks, páginas, componentes) para gerenciar os perfis.

### Passo 5: Após eu criar os arquivos, você vai testar
1. Faça **logout** e **login** novamente
2. Acesse **/admin/perfis** (só admin vê)
3. Crie um novo perfil customizado (ex: "Financeiro Sênior")
4. Atribua permissões específicas

## 🎯 Funcionalidades

- ✅ 67 permissões granulares em 9 módulos
- ✅ 4 perfis default (admin, vendedor, financeiro, atendente)
- ✅ Criar perfis customizados ilimitados
- ✅ Atribuir/remover permissões via UI
- ✅ Compatibilidade com sistema antigo (user_roles)
- ✅ Hook `usePermissions()` com função `can()`

## 🔄 Compatibilidade

O sistema antigo (`user_roles`) continua funcionando. Os dados foram migrados automaticamente para `user_profiles`.
