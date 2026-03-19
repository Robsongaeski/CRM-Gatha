export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue || 0);
};

export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

export const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  const amount = parseFloat(numbers) / 100;
  return amount.toFixed(2).replace('.', ',');
};

export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const parsePhone = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const calcularDesconto = (valorBase: number, valorUnitario: number) => {
  if (valorUnitario >= valorBase) {
    return null; // Sem desconto
  }
  const percentual = ((valorBase - valorUnitario) / valorBase) * 100;
  return {
    percentual: Math.round(percentual),
    valorEconomizado: valorBase - valorUnitario,
    temDesconto: true
  };
};

/**
 * Extrai apenas a parte yyyy-MM-dd de qualquer string de data,
 * ignorando timezone. Útil para campos timestamptz usados como date-only.
 * "2026-03-04T00:00:00+00:00" → "2026-03-04"
 * "2026-03-04" → "2026-03-04"
 */
export function extractDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return dateString.substring(0, 10);
}

/**
 * Converte uma string de data em objeto Date evitando problemas de timezone.
 * Para campos date-only (yyyy-MM-dd ou timestamptz com meia-noite UTC),
 * extrai a parte da data e cria o Date como hora local, evitando shift de dia.
 */
export const parseDateString = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  // Extrair apenas a parte da data (yyyy-MM-dd)
  const datePart = extractDateOnly(dateString);
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return new Date(dateString); // fallback
  }
  
  // Criar Date usando componentes para evitar interpretação UTC
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formata uma data para exibição, tratando corretamente o timezone
 */
export const formatDateSafe = (
  dateString: string | null | undefined, 
  formatStr: string = 'dd/MM/yyyy'
): string => {
  if (!dateString) return '';
  
  const date = parseDateString(dateString);
  if (!date) return '';
  
  // Formatação manual para o formato padrão dd/MM/yyyy
  if (formatStr === 'dd/MM/yyyy') {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Para outros formatos, usar toLocaleDateString
  return date.toLocaleDateString('pt-BR');
};
