import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { GradeTamanhoItem } from "@/hooks/useGradesTamanho";

interface GradeSelecionada {
  codigo: string;
  nome: string;
  quantidade: number;
}

interface GradeTamanhosSelectorProps {
  tamanhos: GradeTamanhoItem[];
  quantidadeTotal: number;
  value: GradeSelecionada[];
  onChange: (grades: GradeSelecionada[]) => void;
  disabled?: boolean;
}

export function GradeTamanhosSelector({
  tamanhos,
  quantidadeTotal,
  value,
  onChange,
  disabled = false,
}: GradeTamanhosSelectorProps) {
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState<number>(0);

  const tamanhosSelecionados = value || [];
  const somaGrades = tamanhosSelecionados.reduce((acc, g) => acc + g.quantidade, 0);
  const diferenca = quantidadeTotal - somaGrades;
  const isValido = diferenca === 0 && tamanhosSelecionados.length > 0;
  const temErro = tamanhosSelecionados.length > 0 && diferenca !== 0;

  const tamanhosDisponiveis = tamanhos.filter(
    (t) => !tamanhosSelecionados.find((s) => s.codigo === t.codigo)
  );

  const handleAdicionar = () => {
    if (!tamanhoSelecionado || quantidade <= 0) return;

    const tamanho = tamanhos.find((t) => t.codigo === tamanhoSelecionado);
    if (!tamanho) return;

    const novasGrades = [
      ...tamanhosSelecionados,
      {
        codigo: tamanho.codigo,
        nome: tamanho.nome,
        quantidade,
      },
    ];

    onChange(novasGrades);
    setTamanhoSelecionado("");
    setQuantidade(0);
  };

  const handleRemover = (codigo: string) => {
    const novasGrades = tamanhosSelecionados.filter((g) => g.codigo !== codigo);
    onChange(novasGrades);
  };

  const handleQuantidadeChange = (codigo: string, novaQuantidade: number) => {
    const novasGrades = tamanhosSelecionados.map((g) =>
      g.codigo === codigo ? { ...g, quantidade: novaQuantidade } : g
    );
    onChange(novasGrades);
  };

  if (tamanhos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Grade de Tamanhos</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Total: {somaGrades} / {quantidadeTotal}
          </span>
          {isValido && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {temErro && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {temErro && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {diferenca > 0 ? `Faltam ${diferenca} unidades` : `Excesso de ${Math.abs(diferenca)} unidades`}
        </div>
      )}

      {/* Adicionar novo tamanho */}
      {tamanhosDisponiveis.length > 0 && !disabled && (
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <Select value={tamanhoSelecionado} onValueChange={setTamanhoSelecionado}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                {tamanhosDisponiveis.map((tamanho) => (
                  <SelectItem key={tamanho.codigo} value={tamanho.codigo}>
                    {tamanho.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            placeholder="Qtd"
            value={quantidade || ""}
            onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
            className="w-20 h-9"
            min={0}
          />
          <Button
            type="button"
            onClick={handleAdicionar}
            disabled={!tamanhoSelecionado || quantidade <= 0}
            size="sm"
            className="h-9 px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tamanhos selecionados */}
      {tamanhosSelecionados.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Tamanhos Selecionados:</Label>
          <div className="flex flex-wrap gap-2">
            {tamanhosSelecionados.map((grade) => (
              <div
                key={grade.codigo}
                className="relative inline-flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background"
              >
                <span className="font-medium text-sm">{grade.nome}</span>
                <Input
                  type="number"
                  value={grade.quantidade}
                  onChange={(e) =>
                    handleQuantidadeChange(grade.codigo, parseInt(e.target.value) || 0)
                  }
                  className="w-14 h-7 text-center text-sm"
                  min={0}
                  disabled={disabled}
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-destructive/10"
                    onClick={() => handleRemover(grade.codigo)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
