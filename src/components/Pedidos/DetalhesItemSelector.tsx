import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DetalheItem {
  tipo_detalhe: string;
  valor: string;
}

interface DetalhesItemSelectorProps {
  value: DetalheItem[];
  onChange: (detalhes: DetalheItem[]) => void;
  disabled?: boolean;
}

const TIPOS_DETALHES = [
  { value: "cor", label: "Cor" },
  { value: "tipo_gola", label: "Tipo de Gola" },
  { value: "mangas", label: "Mangas" },
  { value: "punho", label: "Punho" },
  { value: "cor_vies", label: "Cor do Viés" },
  { value: "nome_numero", label: "Nome/Número" },
  { value: "outros", label: "Outros Detalhes" },
];

export function DetalhesItemSelector({
  value,
  onChange,
  disabled,
}: DetalhesItemSelectorProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [valorDetalhe, setValorDetalhe] = useState<string>("");

  const adicionarDetalhe = () => {
    if (!tipoSelecionado || !valorDetalhe.trim()) return;

    const novoDetalhe: DetalheItem = {
      tipo_detalhe: tipoSelecionado,
      valor: valorDetalhe.trim(),
    };

    onChange([...value, novoDetalhe]);
    setTipoSelecionado("");
    setValorDetalhe("");
  };

  const removerDetalhe = (index: number) => {
    const novosDetalhes = value.filter((_, i) => i !== index);
    onChange(novosDetalhes);
  };

  const getLabelTipo = (tipo: string) => {
    return TIPOS_DETALHES.find((t) => t.value === tipo)?.label || tipo;
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Detalhes Adicionais</Label>
      
      <Card className="p-3 space-y-3">
        <div className="grid grid-cols-[200px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={tipoSelecionado}
              onValueChange={setTipoSelecionado}
              disabled={disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DETALHES.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Especificação</Label>
            <Textarea
              placeholder="Ex: Azul Royal, Gola Redonda... (use Enter para múltiplas linhas)"
              value={valorDetalhe}
              onChange={(e) => setValorDetalhe(e.target.value)}
              disabled={disabled}
              className="min-h-[36px] resize-y"
              rows={2}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={adicionarDetalhe}
            disabled={!tipoSelecionado || !valorDetalhe.trim() || disabled}
            className="h-9"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {value.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <Label className="text-xs text-muted-foreground">
              Detalhes adicionados:
            </Label>
            <div className="space-y-2">
              {value.map((detalhe, index) => {
                const temQuebraLinha = detalhe.valor.includes('\n');
                
                if (temQuebraLinha) {
                  // Renderização em bloco para texto com quebras de linha
                  return (
                    <div key={index} className="p-2 bg-secondary rounded-md text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs shrink-0">
                          {getLabelTipo(detalhe.tipo_detalhe)}:
                        </span>
                        {!disabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-destructive/20 shrink-0"
                            onClick={() => removerDetalhe(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="whitespace-pre-line text-xs mt-1 text-muted-foreground">
                        {detalhe.valor}
                      </div>
                    </div>
                  );
                }
                
                // Renderização inline (Badge) para texto curto sem quebras
                return (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="pl-3 pr-1 py-1 text-xs mr-2"
                  >
                    <span className="font-semibold mr-1.5">
                      {getLabelTipo(detalhe.tipo_detalhe)}:
                    </span>
                    <span>{detalhe.valor}</span>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-destructive/20"
                        onClick={() => removerDetalhe(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {value.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Nenhum detalhe adicionado ainda
          </p>
        )}
      </Card>
    </div>
  );
}
