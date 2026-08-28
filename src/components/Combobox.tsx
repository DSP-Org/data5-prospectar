import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type Opcao = { value: string; label: string };

export function Combobox({
  opcoes,
  valor,
  onChange,
  placeholder = "Selecionar…",
  buscaPlaceholder = "Buscar…",
  vazio = "Nada encontrado.",
  disabled,
  loading,
}: {
  opcoes: Opcao[];
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  buscaPlaceholder?: string;
  vazio?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.value === valor);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !atual && "text-muted-foreground")}>
            {loading ? "Carregando…" : (atual?.label ?? placeholder)}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={buscaPlaceholder} />
          <CommandList>
            <CommandEmpty>{vazio}</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value === valor ? "" : o.value);
                    setAberto(false);
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", o.value === valor ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ComboboxMulti({
  opcoes,
  valores,
  onChange,
  placeholder = "Selecionar…",
  buscaPlaceholder = "Buscar…",
  vazio = "Nada encontrado.",
  disabled,
  loading,
}: {
  opcoes: Opcao[];
  valores: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  buscaPlaceholder?: string;
  vazio?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const rotulo = (v: string) => opcoes.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="space-y-2">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", valores.length === 0 && "text-muted-foreground")}>
              {loading
                ? "Carregando…"
                : valores.length === 0
                  ? placeholder
                  : `${valores.length} selecionado(s)`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={buscaPlaceholder} />
            <CommandList>
              <CommandEmpty>{vazio}</CommandEmpty>
              <CommandGroup>
                {opcoes.map((o) => {
                  const marcado = valores.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() =>
                        onChange(
                          marcado ? valores.filter((v) => v !== o.value) : [...valores, o.value],
                        )
                      }
                    >
                      <Check className={cn("mr-2 h-4 w-4", marcado ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{o.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {valores.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              <span className="max-w-48 truncate">{rotulo(v)}</span>
              <button
                type="button"
                onClick={() => onChange(valores.filter((x) => x !== v))}
                className="opacity-60 hover:opacity-100"
                aria-label={`Remover ${rotulo(v)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
