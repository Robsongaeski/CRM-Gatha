/**
 * Sistema de tratamento de erros com mensagens amigáveis
 * Todas as mensagens são claras e compreensíveis para qualquer usuário
 */

// Mapeamento de códigos de erro para mensagens amigáveis
const errorMessages: Record<string, string> = {
  // PostgreSQL/Supabase
  '23505': 'Este registro já existe. Verifique se não há duplicidade.',
  '23503': 'Não foi possível completar a operação. Há dados relacionados que impedem esta ação.',
  '23502': 'Campos obrigatórios não foram preenchidos. Verifique o formulário.',
  '42501': 'Você não tem permissão para realizar esta ação. Contate o administrador.',
  'PGRST116': 'Você não tem acesso a este recurso.',
  '22P02': 'Os dados informados são inválidos. Verifique e tente novamente.',
  '23514': 'O valor informado não é permitido. Verifique as regras do campo.',
  '42P01': 'Erro de configuração do sistema. Contate o suporte.',
  '42703': 'Erro de configuração do sistema. Contate o suporte.',
  'P0001': 'Operação não permitida pelas regras do sistema.',
  '08006': 'Erro de conexão com o banco de dados. Tente novamente em alguns instantes.',
  '08001': 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  '57014': 'A operação demorou muito e foi cancelada. Tente novamente.',
  
  // Auth
  'invalid_credentials': 'Email ou senha incorretos.',
  'email_not_confirmed': 'Confirme seu email antes de fazer login.',
  'user_not_found': 'Usuário não encontrado.',
  'invalid_grant': 'Credenciais inválidas ou expiradas.',
  'weak_password': 'A senha deve ter no mínimo 6 caracteres.',
  'email_exists': 'Este email já está cadastrado.',
  
  // WhatsApp específicos
  'whatsapp_not_registered': 'O número informado não está registrado no WhatsApp.',
  'instance_disconnected': 'A instância do WhatsApp está desconectada. Reconecte e tente novamente.',
  'invalid_phone': 'Número de telefone inválido. Use o formato com DDD.',
  'media_too_large': 'O arquivo é muito grande. O limite é 16MB.',
  'unsupported_media': 'Tipo de arquivo não suportado pelo WhatsApp.',
  'rate_limited': 'Muitas mensagens enviadas. Aguarde alguns minutos.',
  
  // Rede
  'network_error': 'Erro de conexão. Verifique sua internet e tente novamente.',
  'timeout': 'A operação demorou muito. Tente novamente.',
  'server_error': 'Erro no servidor. Tente novamente em alguns instantes.',
};

// Padrões de mensagens de erro para detecção
const errorPatterns: Array<{ pattern: RegExp; message: string; code?: string }> = [
  // JWT/Autenticação
  { pattern: /JWT|token.*expired|invalid.*token/i, message: 'Sua sessão expirou. Faça login novamente.' },
  { pattern: /row-level security/i, message: 'Você não tem permissão para esta operação. Verifique se está logado corretamente.' },
  { pattern: /permission denied/i, message: 'Você não tem permissão para realizar esta ação.' },
  { pattern: /violates.*policy/i, message: 'Operação não permitida. Você pode não ter acesso a este recurso.' },
  
  // Rede
  { pattern: /Failed to fetch|Network|fetch.*failed/i, message: 'Erro de conexão. Verifique sua internet.', code: 'network_error' },
  { pattern: /timeout|ETIMEDOUT/i, message: 'A operação demorou muito. Tente novamente.', code: 'timeout' },
  { pattern: /502|503|504|Bad Gateway|Service Unavailable/i, message: 'Servidor temporariamente indisponível. Tente em alguns instantes.', code: 'server_error' },
  
  // WhatsApp
  { pattern: /not registered|número.*não.*registrado|not on whatsapp|não está registrado/i, message: 'O número informado não possui WhatsApp. Verifique se o número está correto e tente novamente.', code: 'whatsapp_not_registered' },
  { pattern: /instance.*disconnect|instância.*desconect|não está conectad/i, message: 'WhatsApp desconectado. Reconecte a instância e tente novamente.', code: 'instance_disconnected' },
  { pattern: /invalid.*phone|telefone.*inválido|número.*inválido/i, message: 'Número de telefone inválido. Verifique o formato com DDD.', code: 'invalid_phone' },
  { pattern: /exists.*false/i, message: 'O número informado não possui WhatsApp ativo. Verifique se o número está correto.', code: 'whatsapp_not_registered' },
  { pattern: /nenhuma instância.*disponível/i, message: 'Nenhuma instância WhatsApp disponível. Verifique as configurações.', code: 'instance_disconnected' },
  { pattern: /Evolution API não configurada/i, message: 'A API do WhatsApp não está configurada. Contate o administrador.', code: 'instance_disconnected' },
  
  // Tipos de dados inválidos
  { pattern: /invalid input syntax for type uuid/i, message: 'Dados inválidos no formulário. Tente novamente ou recarregue a página.' },
  { pattern: /invalid input syntax for type/i, message: 'Os dados informados estão em formato incorreto.' },
  { pattern: /column .* does not exist/i, message: 'Erro de configuração do sistema. Contate o suporte.' },
  { pattern: /value too long/i, message: 'O texto informado excede o limite permitido.' },
  
  // Validação
  { pattern: /duplicate.*key|já existe|already exists|already.*registered/i, message: 'Este email já está cadastrado no sistema.' },
  { pattern: /null.*constraint|campo.*obrigatório|required/i, message: 'Preencha todos os campos obrigatórios.' },
  { pattern: /foreign key|referência inválida/i, message: 'Dados relacionados inválidos ou inexistentes.' },
  { pattern: /check constraint/i, message: 'O valor informado não é válido para este campo.' },
  
  // Upload
  { pattern: /file.*too.*large|arquivo.*grande/i, message: 'O arquivo é muito grande. Reduza o tamanho e tente novamente.' },
  { pattern: /unsupported.*type|tipo.*não.*suportado/i, message: 'Tipo de arquivo não suportado.' },
  
  // Leads específico
  { pattern: /leads.*interacoes/i, message: 'Erro ao registrar interação. Tente recarregar a página.' },
];

export interface ParsedError {
  message: string;
  code?: string;
  details?: string;
  isUserError: boolean; // Erro causado por ação do usuário vs erro do sistema
}

/**
 * Analisa um erro e retorna informações estruturadas com mensagem amigável
 */
export function parseError(error: unknown): ParsedError {
  // Log completo para debugging (só visível no console do desenvolvedor)
  console.error('Erro completo:', error);
  
  const errorObj = normalizeError(error);
  
  // Verificar código de erro conhecido
  if (errorObj.code && errorMessages[errorObj.code]) {
    return {
      message: errorMessages[errorObj.code],
      code: errorObj.code,
      details: errorObj.originalMessage,
      isUserError: isUserError(errorObj.code),
    };
  }
  
  // Verificar padrões de mensagem
  const message = errorObj.message || errorObj.originalMessage || '';
  for (const { pattern, message: friendlyMessage, code } of errorPatterns) {
    if (pattern.test(message)) {
      return {
        message: friendlyMessage,
        code: code || 'pattern_match',
        details: errorObj.originalMessage,
        isUserError: true,
      };
    }
  }
  
  // Erro genérico
  return {
    message: 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.',
    code: 'unknown',
    details: errorObj.originalMessage,
    isUserError: false,
  };
}

/**
 * Retorna apenas a mensagem amigável (para uso simples em toasts)
 */
export function sanitizeError(error: unknown): string {
  return parseError(error).message;
}

/**
 * Retorna mensagem com detalhes para exibição mais completa
 */
export function getErrorWithDetails(error: unknown): { message: string; details?: string } {
  const parsed = parseError(error);
  return {
    message: parsed.message,
    details: parsed.isUserError ? undefined : parsed.details,
  };
}

// Helpers internos

interface NormalizedError {
  code?: string;
  message?: string;
  originalMessage?: string;
}

function normalizeError(error: unknown): NormalizedError {
  if (!error) {
    return { originalMessage: 'Erro desconhecido' };
  }
  
  if (typeof error === 'string') {
    return { originalMessage: error, message: error };
  }
  
  // Handle ZodError (validation errors)
  if (error instanceof Error && error.name === 'ZodError') {
    const anyError = error as any;
    try {
      const issues = anyError.issues || JSON.parse(error.message);
      if (Array.isArray(issues) && issues.length > 0) {
        const firstIssue = issues[0];
        const friendlyMessage = firstIssue.message || 'Dados inválidos no formulário.';
        return {
          code: 'validation',
          message: friendlyMessage,
          originalMessage: friendlyMessage,
        };
      }
    } catch {
      // fallback
    }
    return {
      code: 'validation',
      message: 'Dados inválidos no formulário. Verifique os campos.',
      originalMessage: error.message,
    };
  }
  
  if (error instanceof Error) {
    const anyError = error as any;
    return {
      code: anyError.code,
      message: error.message,
      originalMessage: error.message,
    };
  }
  
  if (typeof error === 'object') {
    const obj = error as Record<string, any>;
    
    // Handle ZodError-like objects
    if (obj.name === 'ZodError' && Array.isArray(obj.issues)) {
      const firstIssue = obj.issues[0];
      const friendlyMessage = firstIssue?.message || 'Dados inválidos no formulário.';
      return {
        code: 'validation',
        message: friendlyMessage,
        originalMessage: friendlyMessage,
      };
    }
    
    return {
      code: obj.code || obj.error_code || obj.statusCode?.toString(),
      message: obj.message || obj.error_description || obj.error || obj.msg,
      originalMessage: obj.message || obj.error_description || obj.error || JSON.stringify(obj),
    };
  }
  
  return { originalMessage: String(error) };
}

function isUserError(code: string): boolean {
  // Erros causados por ação do usuário (validação, permissão, dados inválidos)
  const userErrorCodes = [
    '23505', '23503', '23502', '42501', 'PGRST116', '22P02', '23514',
    'invalid_credentials', 'email_not_confirmed', 'weak_password', 'email_exists',
    'whatsapp_not_registered', 'invalid_phone', 'media_too_large', 'unsupported_media',
  ];
  return userErrorCodes.includes(code);
}

/**
 * Helper para usar em catch blocks com toast
 * @example
 * try { ... } catch (error) { handleError(error, toast); }
 */
export function handleError(
  error: unknown, 
  toastFn: (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void
): void {
  const parsed = parseError(error);
  
  toastFn({
    title: parsed.isUserError ? 'Atenção' : 'Erro',
    description: parsed.message,
    variant: 'destructive',
  });
}
