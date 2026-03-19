import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Cliente {
  id: string;
  nome_razao_social: string;
  cpf_cnpj?: string | null;
  responsavel?: string | null;
}

interface ClienteComboboxProps {
  clientes: Cliente[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ClienteCombobox({
  clientes,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Selecione um cliente",
}: ClienteComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedCliente = clientes?.find((cliente) => cliente.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedCliente ? selectedCliente.nome_razao_social : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clientes?.map((cliente) => (
                <CommandItem
                  key={cliente.id}
                  value={`${cliente.nome_razao_social} ${cliente.responsavel || ''} ${cliente.cpf_cnpj || ''}`}
                  onSelect={() => {
                    onValueChange(cliente.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cliente.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{cliente.nome_razao_social}</span>
                    {cliente.responsavel && (
                      <span className="text-xs text-muted-foreground">
                        {cliente.responsavel}
                      </span>
                    )}
                    {cliente.cpf_cnpj && (
                      <span className="text-xs text-muted-foreground">
                        {cliente.cpf_cnpj}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
