

## Plano: Corrigir Datas Voltando Um Dia (Bug de Timezone)

### Causa Raiz

As colunas `data_pedido` e `data_entrega` (e outras) são do tipo **`timestamp with time zone`** no banco, mas armazenam valores de **data pura** (sem hora).

Quando o formulário envia `"2026-03-04"`, o Postgres interpreta como `2026-03-04T00:00:00 UTC`. Ao ler de volta, o JavaScript converte para horário local do Brasil (UTC-3), resultando em `2026-03-03T21:00:00` — **dia anterior**. A cada edição, o ciclo se repete e a data recua mais um dia.

### Colunas Afetadas (todas `timestamptz` usadas como date-only)

| Tabela | Coluna |
|--------|--------|
| `pedidos` | `data_pedido`, `data_entrega` |
| `orders` | `data_despacho` |
| `leads` | `data_retorno` |
| `emprestimos_grade_prova` | `data_emprestimo`, `data_devolucao` |

### Solução em 3 Partes

**1. Criar helper `extractDateOnly` em `src/lib/formatters.ts`**

Extrai apenas `yyyy-MM-dd` de qualquer string de data (ISO ou date-only), ignorando timezone:
```typescript
export function extractDateOnly(dateString: string | null): string {
  if (!dateString) return '';
  return dateString.substring(0, 10); // "2026-03-04T00:00:00+00:00" → "2026-03-04"
}
```

**2. Corrigir leitura de datas no formulário (PedidoForm.tsx)**

Ao carregar pedido para edição, usar `extractDateOnly` em vez de `format(parseDateString(...))`:
```typescript
// Antes (bugado):
data_pedido: format(parseDateString(pedido.data_pedido) || new Date(), 'yyyy-MM-dd')
// Depois (correto):
data_pedido: extractDateOnly(pedido.data_pedido) || format(new Date(), 'yyyy-MM-dd')
```

**3. Corrigir salvamento de datas (usePedidos.ts)**

Ao inserir/atualizar, enviar datas com `T12:00:00` para evitar que o Postgres interprete como meia-noite UTC:
```typescript
data_pedido: formData.data_pedido ? `${formData.data_pedido}T12:00:00` : undefined,
data_entrega: formData.data_entrega ? `${formData.data_entrega}T12:00:00` : undefined,
```

**4. Corrigir exibição em listas e outros locais**

Atualizar `parseDateString` para tratar timestamps com `T00:00:00+00:00` (meia-noite UTC) como date-only, extraindo a parte da data antes de criar o objeto Date. Isso corrige a exibição na lista de pedidos, calendário PCP, detalhes do pedido, e todos os 30+ arquivos que usam `parseDateString`.

**5. Aplicar mesmo padrão nos demais locais do sistema**

- `LeadForm` / leads com `data_retorno`
- `EmprestimoForm` com `data_emprestimo` / `data_devolucao`
- Formulários de envio com `data_despacho`
- Qualquer outro formulário que salve datas em colunas timestamptz

### Arquivos Principais a Modificar

- `src/lib/formatters.ts` — adicionar `extractDateOnly`, melhorar `parseDateString`
- `src/pages/Pedidos/PedidoForm.tsx` — usar `extractDateOnly` na leitura
- `src/hooks/usePedidos.ts` — enviar datas com `T12:00:00` no create/update
- `src/pages/Pedidos/PedidoDetalhes.tsx` — usar parse seguro
- Formulários de leads, empréstimos e envios — mesma correção

