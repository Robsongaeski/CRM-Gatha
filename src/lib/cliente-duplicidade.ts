import { supabase } from '@/integrations/supabase/client';

export type MotivoClienteDuplicado = 'cpf_cnpj' | 'telefone';

export interface ClienteBasico {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
}

export interface ClienteDuplicadoEncontrado {
  cliente: ClienteBasico;
  motivo: MotivoClienteDuplicado;
}

const somenteDigitos = (value: string | null | undefined): string => (value || '').replace(/\D/g, '');

export const normalizarCpfCnpj = (value: string | null | undefined): string => somenteDigitos(value);

export const normalizarTelefoneBase = (value: string | null | undefined): string => {
  let digits = somenteDigitos(value);
  if (!digits) return '';

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  if (digits.length > 11) {
    digits = digits.slice(-11);
  }

  if (digits.length < 10) return '';
  return digits;
};

export const gerarVariacoesTelefone = (value: string | null | undefined): string[] => {
  const base = normalizarTelefoneBase(value);
  if (!base) return [];

  const variants = new Set<string>([base]);
  const ehDigitoMovel = (digit: string | undefined) => !!digit && /[6-9]/.test(digit);

  // Compara numeros equivalentes com e sem o nono digito apos o DDD (mobile).
  if (base.length === 11 && base[2] === '9' && ehDigitoMovel(base[3])) {
    variants.add(base.slice(0, 2) + base.slice(3));
  } else if (base.length === 10 && ehDigitoMovel(base[2])) {
    variants.add(base.slice(0, 2) + '9' + base.slice(2));
  }

  return [...variants];
};

export async function buscarClienteDuplicado(params: {
  cpfCnpj?: string | null;
  telefone?: string | null;
  excludeId?: string;
}): Promise<ClienteDuplicadoEncontrado | null> {
  const cpfNormalizado = normalizarCpfCnpj(params.cpfCnpj);
  const telefoneNormalizado = new Set(gerarVariacoesTelefone(params.telefone));

  if (!cpfNormalizado && telefoneNormalizado.size === 0) {
    return null;
  }

  let query = supabase
    .from('clientes')
    .select('id, nome_razao_social, cpf_cnpj, telefone, whatsapp');

  if (params.excludeId) {
    query = query.neq('id', params.excludeId);
  }

  const { data, error } = await query;
  if (error) throw error;

  for (const cliente of data || []) {
    const cpfCliente = normalizarCpfCnpj(cliente.cpf_cnpj);
    if (cpfNormalizado && cpfCliente && cpfNormalizado === cpfCliente) {
      return { cliente, motivo: 'cpf_cnpj' };
    }

    for (const phone of [cliente.telefone, cliente.whatsapp]) {
      const phoneVariations = gerarVariacoesTelefone(phone);
      if (phoneVariations.some((variation) => telefoneNormalizado.has(variation))) {
        return { cliente, motivo: 'telefone' };
      }
    }
  }

  return null;
}
