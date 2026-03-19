import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSegmentos } from '@/hooks/useSegmentos';
import { useImportarLeads } from '@/hooks/useLeads';
import { useUsuarios } from '@/hooks/useUsuarios';
import { Upload, AlertCircle, CheckCircle, FileSpreadsheet, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';
import { formatPhone } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';

interface CsvRow {
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
  segmento?: string;
  observacao?: string;
}

interface ImportarLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Normaliza headers do CSV para mapeamento flexível
 */
const normalizeHeader = (header: string): string => {
  const normalized = header.toLowerCase().trim();
  const aliases: Record<string, string> = {
    'celular': 'whatsapp',
    'fone': 'telefone',
    'tel': 'telefone',
    'phone': 'telefone',
    'mobile': 'whatsapp',
    'observação': 'observacao',
    'observacoes': 'observacao',
    'observações': 'observacao',
    'cpf': 'cpf_cnpj',
    'cnpj': 'cpf_cnpj',
    'endereço': 'endereco',
    'segmento_nome': 'segmento',
  };
  return aliases[normalized] || normalized;
};

/**
 * Normaliza um número de telefone/WhatsApp
 * - Se tiver múltiplos números (separados por / ou , ou | ou ;), usa apenas o primeiro
 * - Remove parênteses extras e formata no padrão (00) 00000-0000
 */
const normalizePhoneNumber = (value: string | undefined): { normalized: string; hadMultiple: boolean } => {
  if (!value || value.trim() === '') {
    return { normalized: '', hadMultiple: false };
  }
  
  // Detectar múltiplos números (separados por / , | ou ;)
  const hasMultiple = /[\/,\|;]/.test(value);
  
  // Pegar apenas o primeiro número
  const firstNumber = value.split(/[\/,\|;]/)[0]?.trim() ?? value;
  
  // Limpar parênteses extras e caracteres estranhos
  const cleaned = firstNumber.replace(/[\(\)]+/g, match => match.length > 2 ? '()' : match);
  
  // Usar o formatador existente
  const normalized = formatPhone(cleaned);
  
  return { normalized, hadMultiple: hasMultiple };
};

/**
 * Extrai apenas dígitos de um valor
 */
const onlyDigits = (value: string | undefined | null): string => {
  return value?.replace(/\D/g, '') || '';
};

/**
 * Verifica se já existe cliente com esse telefone/whatsapp ou CPF/CNPJ
 */
const verificarClienteExistente = async (
  telefone?: string,
  whatsapp?: string,
  cpfCnpj?: string
): Promise<{ id: string; nome: string } | null> => {
  const telNorm = onlyDigits(telefone);
  const whatsNorm = onlyDigits(whatsapp);
  const cpfNorm = onlyDigits(cpfCnpj);

  // Se não tem nenhum dado para comparar, retorna null
  if (!telNorm && !whatsNorm && !cpfNorm) return null;

  // Buscar clientes para comparação
  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome_razao_social, telefone, whatsapp, cpf_cnpj');

  if (!clientes || clientes.length === 0) return null;

  for (const cliente of clientes) {
    const clienteTel = onlyDigits(cliente.telefone);
    const clienteWhats = onlyDigits(cliente.whatsapp);
    const clienteCpf = onlyDigits(cliente.cpf_cnpj);

    // Match por CPF/CNPJ (exato)
    if (cpfNorm && clienteCpf && cpfNorm === clienteCpf) {
      return { id: cliente.id, nome: cliente.nome_razao_social };
    }

    // Match por telefone/whatsapp
    const numerosLead = [telNorm, whatsNorm].filter(n => n.length >= 10);
    const numerosCliente = [clienteTel, clienteWhats].filter(n => n.length >= 10);
    
    if (numerosLead.some(n => numerosCliente.includes(n))) {
      return { id: cliente.id, nome: cliente.nome_razao_social };
    }
  }

  return null;
};

export function ImportarLeadsDialog({ open, onOpenChange }: ImportarLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [segmentoId, setSegmentoId] = useState<string | undefined>(undefined);
  const [vendedorId, setVendedorId] = useState<string | undefined>(undefined);
  const [origem, setOrigem] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [clientesExistentes, setClientesExistentes] = useState<{ leadIndex: number; clienteId: string; clienteNome: string }[]>([]);
  const [isVerificando, setIsVerificando] = useState(false);

  const { data: segmentos = [] } = useSegmentos();
  const { data: usuarios = [] } = useUsuarios();
  const importarMutation = useImportarLeads();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErros([]);
    setAvisos([]);
    setClientesExistentes([]);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: async (results) => {
        const data = results.data as CsvRow[];
        const { validados, erros: errosValidacao, avisos: avisosValidacao } = validarCSV(data);
        
        setCsvData(validados);
        setErros(errosValidacao);
        setAvisos(avisosValidacao);

        // Verificar clientes existentes
        if (validados.length > 0) {
          setIsVerificando(true);
          const existentes: typeof clientesExistentes = [];
          
          for (let i = 0; i < validados.length; i++) {
            const row = validados[i];
            const cliente = await verificarClienteExistente(row.telefone, row.whatsapp, row.cpf_cnpj);
            if (cliente) {
              existentes.push({ leadIndex: i, clienteId: cliente.id, clienteNome: cliente.nome });
            }
          }
          
          setClientesExistentes(existentes);
          setIsVerificando(false);
        }
      },
      error: (error) => {
        setErros([`Erro ao ler arquivo: ${error.message}`]);
      },
    });
  };

  const validarCSV = (data: CsvRow[]) => {
    const erros: string[] = [];
    const avisos: string[] = [];
    const validados: CsvRow[] = [];

    data.forEach((row, index) => {
      const linha = index + 2; // +2 porque CSV tem header e é 1-indexed

      if (!row.nome || row.nome.trim() === '') {
        erros.push(`Linha ${linha}: Nome é obrigatório`);
        return;
      }

      // Normalizar telefone
      if (row.telefone) {
        const { normalized, hadMultiple } = normalizePhoneNumber(row.telefone);
        row.telefone = normalized;
        if (hadMultiple) {
          avisos.push(`Linha ${linha}: "${row.nome}" tinha múltiplos telefones, usando apenas o primeiro`);
        }
      }

      // Normalizar WhatsApp
      if (row.whatsapp) {
        const { normalized, hadMultiple } = normalizePhoneNumber(row.whatsapp);
        row.whatsapp = normalized;
        if (hadMultiple) {
          avisos.push(`Linha ${linha}: "${row.nome}" tinha múltiplos WhatsApp, usando apenas o primeiro`);
        }
      }

      // Se só tem whatsapp e não tem telefone, copiar para telefone
      if (row.whatsapp && !row.telefone) {
        row.telefone = row.whatsapp;
      }
      // Se só tem telefone e não tem whatsapp, copiar para whatsapp
      if (row.telefone && !row.whatsapp) {
        row.whatsapp = row.telefone;
      }

      if (!row.telefone && !row.whatsapp) {
        avisos.push(`Linha ${linha}: "${row.nome}" sem telefone/WhatsApp`);
      }

      // Tentar mapear segmento por nome
      if (row.segmento) {
        const segmentoEncontrado = segmentos.find(
          s => s.nome.toLowerCase() === row.segmento?.toLowerCase()
        );
        if (segmentoEncontrado) {
          (row as any).segmento_id = segmentoEncontrado.id;
        } else {
          avisos.push(`Linha ${linha}: Segmento "${row.segmento}" não encontrado`);
        }
      }

      validados.push(row);
    });

    return { validados, erros, avisos };
  };

  const handleImportar = async () => {
    if (csvData.length === 0) {
      setErros(['Nenhum dado válido para importar']);
      return;
    }

    // Mapear leads que já são clientes
    const clienteMap = new Map(clientesExistentes.map(c => [c.leadIndex, c]));

    const leads = csvData.map((row, index) => {
      const existente = clienteMap.get(index);
      return {
        nome: row.nome,
        telefone: row.telefone,
        whatsapp: row.whatsapp,
        email: row.email,
        cpf_cnpj: row.cpf_cnpj,
        endereco: row.endereco,
        segmento_id: (row as any).segmento_id || segmentoId || undefined,
        observacao: row.observacao,
        vendedor_id: vendedorId || undefined,
        // Se já é cliente, marcar como convertido e vincular
        ...(existente ? {
          status: 'convertido' as const,
          cliente_id: existente.clienteId,
          data_conversao: new Date().toISOString(),
        } : {}),
      };
    });

    await importarMutation.mutateAsync({
      leads,
      origem: origem || `Importação CSV - ${new Date().toLocaleDateString('pt-BR')}`,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFile(null);
    setCsvData([]);
    setSegmentoId(undefined);
    setVendedorId(undefined);
    setOrigem('');
    setErros([]);
    setAvisos([]);
    setClientesExistentes([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Leads via CSV
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha CSV com os dados dos leads.
            <br />
            <strong>Colunas:</strong> nome* (obrigatório), telefone, whatsapp, email, cpf_cnpj, endereco, segmento, observacao
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Arquivo CSV</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {isVerificando && (
            <Alert>
              <AlertCircle className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Verificando clientes existentes...
              </AlertDescription>
            </Alert>
          )}

          {csvData.length > 0 && !isVerificando && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>{csvData.length} leads</strong> prontos para importar
                </AlertDescription>
              </Alert>

              {clientesExistentes.length > 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Users className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>{clientesExistentes.length} leads já são clientes</strong> e serão vinculados automaticamente:
                    <ul className="list-disc pl-4 mt-1 text-sm">
                      {clientesExistentes.slice(0, 3).map((c, i) => (
                        <li key={i}>{csvData[c.leadIndex]?.nome} → {c.clienteNome}</li>
                      ))}
                      {clientesExistentes.length > 3 && (
                        <li>... e mais {clientesExistentes.length - 3} clientes</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label>Origem da Lista (opcional)</Label>
                <Input
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  placeholder="Ex: Lista Associação Comercial 2025"
                />
              </div>

              <div>
                <Label>Segmento Padrão (opcional)</Label>
                <Select value={segmentoId} onValueChange={setSegmentoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aplicar segmento a todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentos.map((seg) => (
                      <SelectItem key={seg.id} value={seg.id}>
                        {seg.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Atribuir Vendedor (opcional)</Label>
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Atribuir vendedor específico" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {avisos.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <strong>Avisos:</strong>
                <ul className="list-disc pl-4 mt-1 text-sm">
                  {avisos.slice(0, 5).map((aviso, i) => (
                    <li key={i}>{aviso}</li>
                  ))}
                  {avisos.length > 5 && <li>... e mais {avisos.length - 5} avisos</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {erros.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erros encontrados:</strong>
                <ul className="list-disc pl-4 mt-1 text-sm">
                  {erros.map((erro, i) => (
                    <li key={i}>{erro}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={csvData.length === 0 || erros.length > 0 || importarMutation.isPending || isVerificando}
          >
            {importarMutation.isPending ? 'Importando...' : `Importar ${csvData.length} leads`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
