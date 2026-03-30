export interface PedidoObservacaoItem {
  data: string | null;
  texto: string;
}

interface ParsedObservacaoInput {
  data?: unknown;
  texto?: unknown;
  observacao?: unknown;
}

export function parsePedidoObservacoes(observacao: string | null | undefined): PedidoObservacaoItem[] {
  if (!observacao || !observacao.trim()) {
    return [];
  }

  const raw = observacao.trim();

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [{ data: null, texto: raw }];
    }

    const normalized = parsed
      .map((item): PedidoObservacaoItem | null => {
        if (typeof item === 'string') {
          const texto = item.trim();
          return texto ? { data: null, texto } : null;
        }

        if (!item || typeof item !== 'object') {
          return null;
        }

        const typedItem = item as ParsedObservacaoInput;
        const textoRaw = typeof typedItem.texto === 'string'
          ? typedItem.texto
          : typeof typedItem.observacao === 'string'
            ? typedItem.observacao
            : '';
        const texto = textoRaw.trim();

        if (!texto) {
          return null;
        }

        return {
          data: typeof typedItem.data === 'string' ? typedItem.data : null,
          texto,
        };
      })
      .filter((item): item is PedidoObservacaoItem => Boolean(item));

    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Formato legado: texto simples.
  }

  return [{ data: null, texto: raw }];
}
