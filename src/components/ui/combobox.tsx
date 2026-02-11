import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  value: string;
  options: ComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
};

export function Combobox({
  value,
  options,
  onChange,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  const selectedLabel = options.find((option) => option.value === value)?.label ?? placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                setQuery("");
              }}
            >
              <span>{option.label}</span>
              <Check className={cn("h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
            </button>
          ))}
          {filtered.length === 0 && <p className="px-2 py-2 text-sm text-muted-foreground">No results</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
