import { useGradeTamanhoItens } from "@/hooks/useGradesTamanho";
import { GradeTamanhosSelector } from "./GradeTamanhosSelector";

interface GradeSelecionada {
  codigo: string;
  nome: string;
  quantidade: number;
}

interface GradeTamanhosSelectorWrapperProps {
  gradeId: string;
  quantidadeTotal: number;
  value: GradeSelecionada[];
  onChange: (grades: GradeSelecionada[]) => void;
  disabled?: boolean;
}

export function GradeTamanhosSelectorWrapper({
  gradeId,
  quantidadeTotal,
  value,
  onChange,
  disabled,
}: GradeTamanhosSelectorWrapperProps) {
  const { data: tamanhos, isLoading } = useGradeTamanhoItens(gradeId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando tamanhos...</div>;
  }

  if (!tamanhos || tamanhos.length === 0) {
    return null;
  }

  return (
    <GradeTamanhosSelector
      tamanhos={tamanhos}
      quantidadeTotal={quantidadeTotal}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
