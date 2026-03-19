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

interface Produto {
  id: string;
  nome: string;
  codigo?: string | null;
}

interface ProdutoComboboxProps {
  produtos: Produto[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ProdutoCombobox({
  produtos,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Selecione",
}: ProdutoComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedProduto = produtos?.find((produto) => produto.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal text-left"
        >
          <div className="flex flex-col items-start truncate">
            {selectedProduto ? (
              <>
                <span className="truncate">{selectedProduto.nome}</span>
                {selectedProduto.codigo && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Código: {selectedProduto.codigo}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar produto..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup>
              {produtos?.map((produto) => (
                <CommandItem
                  key={produto.id}
                  value={`${produto.nome} ${produto.codigo || ''}`}
                  onSelect={() => {
                    onValueChange(produto.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === produto.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{produto.nome}</span>
                    {produto.codigo && (
                      <span className="text-xs text-muted-foreground font-mono">
                        Código: {produto.codigo}
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
