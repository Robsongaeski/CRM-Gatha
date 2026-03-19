import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Factory, ShoppingCart, Calendar, RefreshCw, Settings, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuantidadesVendidas } from '@/hooks/pcp/useQuantidadesVendidas';
import { Skeleton } from '@/components/ui/skeleton';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type PeriodoPreset = 'hoje' | 'ontem' | 'semana' | 'custom';

export default function QuantidadesDashboard() {
  const navigate = useNavigate();
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('hoje');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [showNaoClassificados, setShowNaoClassificados] = useState(false);
  
  const handlePresetChange = (preset: PeriodoPreset) => {
    setPeriodoPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case 'hoje':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'ontem':
        const ontem = subDays(now, 1);
        setDateRange({ from: startOfDay(ontem), to: endOfDay(ontem) });
        break;
      case 'semana':
        setDateRange({ 
          from: startOfWeek(now, { weekStartsOn: 1 }), 
          to: endOfWeek(now, { weekStartsOn: 1 }) 
        });
        break;
      case 'custom':
        // Mantém o range atual
        break;
    }
  };
  
  const { data: resumo, isLoading, refetch, isFetching } = useQuantidadesVendidas(
    dateRange.from,
    dateRange.to
  );

  const formatarPeriodo = () => {
    if (periodoPreset === 'hoje') return 'Hoje';
    if (periodoPreset === 'ontem') return 'Ontem';
    if (periodoPreset === 'semana') return 'Esta semana';
    return `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`;
  };

  const handleGerarRelatorio = () => {
    const params = new URLSearchParams({
      inicio: format(dateRange.from, 'yyyy-MM-dd'),
      fim: format(dateRange.to, 'yyyy-MM-dd'),
    });
    navigate(`/pcp/quantidades/relatorio?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quantidades Vendidas</h1>
          <p className="text-muted-foreground">
            Resumo de peças que entraram em produção por categoria
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodoPreset} onValueChange={(v) => handlePresetChange(v as PeriodoPreset)}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ontem">Ontem</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {periodoPreset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  {formatarPeriodo()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateRange({ 
                        from: range.from, 
                        to: range.to || range.from 
                      });
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          )}
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          
          <Button 
            variant="default"
            onClick={handleGerarRelatorio}
            disabled={!resumo?.totalGeral}
          >
            <FileText className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/pcp/cadastros/categorias-ecommerce')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Categorias
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Total Geral</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold">{resumo?.totalGeral || 0}</div>
                <p className="text-xs text-muted-foreground">peças • {formatarPeriodo().toLowerCase()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">E-commerce</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-600">{resumo?.totalEcommerce || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {resumo?.totalGeral ? ((resumo.totalEcommerce / resumo.totalGeral) * 100).toFixed(0) : 0}% do total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Comercial</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold text-orange-600">{resumo?.totalComercial || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {resumo?.totalGeral ? ((resumo.totalComercial / resumo.totalGeral) * 100).toFixed(0) : 0}% do total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta de não classificados */}
      {resumo?.itensNaoClassificados && resumo.itensNaoClassificados.length > 0 && (
        <Collapsible open={showNaoClassificados} onOpenChange={setShowNaoClassificados}>
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                      {resumo.itensNaoClassificados.length} produto(s) não classificado(s)
                    </CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    {showNaoClassificados ? 'Ocultar' : 'Ver detalhes'}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Estes produtos não corresponderam a nenhuma categoria. Considere adicionar novos prefixos.
              </CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU/Código</TableHead>
                        <TableHead className="text-center">Origem</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumo.itensNaoClassificados.slice(0, 20).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.nome || 'Sem nome'}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.sku.substring(0, 30)}{item.sku.length > 30 ? '...' : ''}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={item.origem === 'ecommerce' ? 'default' : 'secondary'}>
                              {item.origem === 'ecommerce' ? 'E-comm' : 'Comercial'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {resumo.itensNaoClassificados.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      E mais {resumo.itensNaoClassificados.length - 20} itens...
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Tabela de Quantidades por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Quantidades por Categoria</CardTitle>
          <CardDescription>
            Distribuição de peças que entraram em produção por tipo de produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !resumo?.porCategoria?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado encontrado para o período selecionado</p>
              <p className="text-sm mt-2">
                Os dados aparecerão quando pedidos entrarem em produção
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      E-commerce
                    </span>
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Factory className="h-4 w-4 text-orange-500" />
                      Comercial
                    </span>
                  </TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.porCategoria.map((cat) => (
                  <TableRow key={cat.categoria}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.categoria}</span>
                        {cat.categoriaId === null && (
                          <Badge variant="outline" className="text-xs">Não classificado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {cat.ecommerce}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {cat.comercial}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {cat.total}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Linha de totais */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {resumo.totalEcommerce}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {resumo.totalComercial}
                  </TableCell>
                  <TableCell className="text-right">
                    {resumo.totalGeral}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info sobre coleta de dados */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Como os dados são coletados</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>E-commerce:</strong> Pedidos que entraram em produção (status 4 da WBuy)</li>
                <li>• <strong>Comercial:</strong> Pedidos que passaram para a etapa "Ficha Impressa"</li>
                <li>• A classificação usa prefixos de código OU o nome do produto como fallback</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
