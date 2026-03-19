import * as React from "react";
import { Input } from "@/components/ui/input";

export interface CpfCnpjInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Formata CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) automaticamente
 */
export const formatCpfCnpj = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 11) {
    // CPF: 000.000.000-00
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return numbers
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

/**
 * Remove formatação e retorna apenas dígitos
 */
export const parseCpfCnpj = (value: string): string => {
  return value.replace(/\D/g, '');
};

const CpfCnpjInput = React.forwardRef<HTMLInputElement, CpfCnpjInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCpfCnpj(e.target.value);
      if (onChange) {
        onChange(formatted);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="000.000.000-00"
        maxLength={18}
      />
    );
  }
);

CpfCnpjInput.displayName = "CpfCnpjInput";

export { CpfCnpjInput };
