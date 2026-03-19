import * as React from "react";
import { Input } from "@/components/ui/input";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Formata telefone brasileiro: (00) 00000-0000 ou (00) 0000-0000
 */
export const formatPhoneBR = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  // Celular: (00) 00000-0000
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

/**
 * Remove formatação e retorna apenas dígitos
 */
export const parsePhone = (value: string): string => {
  return value.replace(/\D/g, '');
};

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneBR(e.target.value);
      if (onChange) {
        onChange(formatted);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="(00) 00000-0000"
        maxLength={15}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
