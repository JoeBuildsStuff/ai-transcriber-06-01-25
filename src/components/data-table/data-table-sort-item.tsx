import { ChevronsUpDown, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Column } from "@tanstack/react-table";
import { useState } from "react";

interface DataTableSortItemProps<TData> {
  id: string;
  column?: string;
  direction: "asc" | "desc";
  onColumnChange: (id: string, column: string) => void;
  onDirectionChange: (id: string, direction: "asc" | "desc") => void;
  onRemove: (id: string) => void;
  columns: Column<TData, unknown>[];
}

export default function DataTableSortItem<TData>({
  id,
  column,
  direction,
  onColumnChange,
  onDirectionChange,
  onRemove,
  columns,
}: DataTableSortItemProps<TData>) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex flex-row gap-2 items-center w-full"
    >
      <Button 
        variant="ghost" 
        size="icon"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex-1">
            <span className="flex-1 text-left capitalize">
              {column ? 
                (columns.find(col => col.id === column)?.columnDef.meta?.label ?? column) 
                : "Column"
              }
            </span>
            <ChevronsUpDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Search column" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {columns.map((col) => (
                  <CommandItem
                    key={col.id}
                    onSelect={() => {
                      onColumnChange(id, col.id);
                      setOpen(false);
                    }}
                    className="capitalize"
                  >
                    {col.columnDef.meta?.label ?? col.id}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Select value={direction} onValueChange={(value: "asc" | "desc") => onDirectionChange(id, value)}>
        <SelectTrigger className="w-[5.25rem]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Asc</SelectItem>
          <SelectItem value="desc">Desc</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={() => onRemove(id)}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}