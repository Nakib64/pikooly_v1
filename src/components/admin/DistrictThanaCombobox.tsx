import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BD_DISTRICTS, BD_DISTRICTS_THANAS } from "@/data/bdDistrictsThanas";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** When set, options are thanas of this district. Else, districts. */
  district?: string;
  className?: string;
  allowFreeText?: boolean;
}

export function DistrictThanaCombobox({ value, onChange, placeholder, district, className, allowFreeText = true }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    if (district !== undefined) return BD_DISTRICTS_THANAS[district] || [];
    return BD_DISTRICTS;
  }, [district]);

  const showCreate = allowFreeText && search.trim() && !options.some((o) => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 justify-between font-normal", !value && "text-muted-foreground", className)}
          style={{ fontSize: 16 }}
        >
          <span className="truncate">{value || placeholder || "Select..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[220px]" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={placeholder || "Search..."}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {showCreate ? (
                <button
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded"
                  onClick={() => { onChange(search.trim()); setOpen(false); setSearch(""); }}
                >
                  Use "{search.trim()}"
                </button>
              ) : (
                "No results."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => { onChange(opt); setOpen(false); setSearch(""); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create_${search}`}
                  onSelect={() => { onChange(search.trim()); setOpen(false); setSearch(""); }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use "{search.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
