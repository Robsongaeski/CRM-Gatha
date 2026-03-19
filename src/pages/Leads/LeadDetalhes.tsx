import { useParams, useNavigate } from 'react-router-dom';
import { useLead } from '@/hooks/useLeads';
import { useLeadInteracoes } from '@/hooks/useLeadsInteracoes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Phone, Mail, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadStatusBadge } from '@/components/Leads/LeadStatusBadge';
import { SegmentoBadge } from '@/components/Leads/SegmentoBadge';
import { RegistrarContatoDialog } from '@/components/Leads/RegistrarContatoDialog';
import { ConverterLeadDialog } from '@/components/Leads/ConverterLeadDialog';
import { useState } from 'react';

const tipoIconMap = {
  ligacao: <Phone className="h-4 w-4" />,
  whatsapp: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  reuniao: <Calendar className="h-4 w-4" />,
  outro: <UserCheck className="h-4 w-4" />,
};

const resultadoLabelMap = {
  sem_resposta: 'Sem resposta',
  retornar: 'Retornar depois',
  interessado: 'Interessado',
  nao_interessado: 'Não interessado',
  agendado: 'Agendado',
  convertido: 'Convertido',
};

export default function LeadDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registrarContatoOpen, setRegistrarContatoOpen] = useState(false);
  const [converterOpen, setConverterOpen] = useState(false);
  
  const { data: lead, isLoading } = useLead(id);
  const { data: interacoes = [] } = useLeadInteracoes(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/leads')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Lead não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const podeConverter = lead.status !== 'convertido' && lead.status !== 'perdido';

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/leads')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{lead.nome}</h1>
          <div className="flex items-center gap-2 mt-2">
            <LeadStatusBadge status={lead.status} />
            {lead.segmento && (
              <SegmentoBadge 
                nome={lead.segmento.nome}
                cor={lead.segmento.cor}
                icone={lead.segmento.icone}
              />
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {lead.status !== 'convertido' && (
            <Button onClick={() => navigate(`/leads/editar/${id}`)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <Button onClick={() => setRegistrarContatoOpen(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Registrar Contato
          </Button>
          {podeConverter && (
            <Button onClick={() => setConverterOpen(true)} variant="secondary">
              <UserCheck className="mr-2 h-4 w-4" />
              Converter para Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.telefone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{lead.telefone}</p>
              </div>
            )}
            {lead.whatsapp && (
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{lead.whatsapp}</p>
              </div>
            )}
            {lead.email && (
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{lead.email}</p>
              </div>
            )}
            {lead.cpf_cnpj && (
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{lead.cpf_cnpj}</p>
              </div>
            )}
            {lead.endereco && (
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{lead.endereco}</p>
              </div>
            )}
            {lead.vendedor && (
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{lead.vendedor.nome}</p>
              </div>
            )}
            {lead.origem && (
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                <p className="font-medium">{lead.origem}</p>
              </div>
            )}
            {lead.data_retorno && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Retorno</p>
                <p className="font-medium">
                  {format(new Date(lead.data_retorno), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {lead.observacao || 'Nenhuma observação registrada.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Interações</CardTitle>
        </CardHeader>
        <CardContent>
          {interacoes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma interação registrada ainda.
            </p>
          ) : (
            <div className="space-y-6">
              {interacoes.map((interacao) => (
                <div key={interacao.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-primary">{tipoIconMap[interacao.tipo]}</div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {interacao.tipo}
                          </Badge>
                          {interacao.resultado && (
                            <Badge variant="secondary">
                              {resultadoLabelMap[interacao.resultado]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(interacao.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{interacao.descricao}</p>
                      {interacao.proxima_acao && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-xs text-muted-foreground mb-1">Próxima ação:</p>
                          <p className="text-sm">{interacao.proxima_acao}</p>
                          {interacao.data_proxima_acao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📅{' '}
                              {format(
                                new Date(interacao.data_proxima_acao),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      {interacao.created_by_profile && (
                        <p className="text-xs text-muted-foreground">
                          por {interacao.created_by_profile.nome}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RegistrarContatoDialog
        leadId={lead.id}
        open={registrarContatoOpen}
        onOpenChange={setRegistrarContatoOpen}
      />

      <ConverterLeadDialog
        leadId={lead.id}
        leadNome={lead.nome}
        open={converterOpen}
        onOpenChange={setConverterOpen}
      />
    </div>
  );
}
