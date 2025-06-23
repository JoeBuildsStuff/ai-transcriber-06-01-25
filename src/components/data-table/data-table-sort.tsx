import { ChevronRight, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import DataTableSortItem from "./data-table-sort-item";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortingState, Table } from "@tanstack/react-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SortItem {
  id: string;
  column?: string;
  direction: "asc" | "desc";
}

interface DataTableSortProps<TData> {
  table: Table<TData>;
}

export default function DataTableSort<TData>({ table }: DataTableSortProps<TData>) {
  const [sortItems, setSortItems] = useState<SortItem[]>([]);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync sortItems with table's sorting state
  useEffect(() => {
    const currentSorting = table.getState().sorting;
    if (currentSorting.length > 0) {
      const newSortItems: SortItem[] = currentSorting.map((sort, index) => ({
        id: `${sort.id}-${index}`, // Create unique ID
        column: sort.id,
        direction: sort.desc ? "desc" : "asc",
      }));
      setSortItems(newSortItems);
    } else {
      // If no sorting is applied, show one empty sort item
      setSortItems([{ id: "1", direction: "asc" }]);
    }
  }, [table.getState().sorting]);

  const addSortItem = () => {
    const newId = Date.now().toString(); // Use timestamp for unique IDs
    setSortItems([...sortItems, { id: newId, direction: "asc" }]);
  };

  const removeSortItem = (id: string) => {
    setSortItems(sortItems.filter(item => item.id !== id));
  };

  const updateSortItemColumn = (id: string, column: string) => {
    setSortItems(sortItems.map(item => 
      item.id === id ? { ...item, column } : item
    ));
  };

  const updateSortItemDirection = (id: string, direction: "asc" | "desc") => {
    setSortItems(sortItems.map(item => 
      item.id === id ? { ...item, direction } : item
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSortItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const applySort = () => {
    const sorting: SortingState = sortItems
      .filter((item) => !!item.column)
      .map((item) => ({
        id: item.column!,
        desc: item.direction === "desc",
      }));
    table.setSorting(sorting);
    setOpen(false); // Close the popover after applying sort
  };

  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanSort()
    );

  // Get the actual number of applied sorts from the table state
  const appliedSortCount = table.getState().sorting.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <ChevronsUpDown className="w-4 h-4" />
          <div>Sort</div>
          <Badge variant="secondary">
            {appliedSortCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-sm p-3">
        <div className="flex flex-col gap-3 w-full">
          <p className="text-sm font-medium text-muted-foreground">
            Sort by:
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
              {sortItems.map((item) => (
                <DataTableSortItem
                  key={item.id}
                  id={item.id}
                  column={item.column}
                  direction={item.direction}
                  onColumnChange={updateSortItemColumn}
                  onDirectionChange={updateSortItemDirection}
                  onRemove={removeSortItem}
                  columns={columns}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Separator />

          <div className="flex flex-row gap-3 items-center justify-between">
            <Button variant="secondary" onClick={addSortItem} className="flex flex-row items-center h-8">
              <Plus className="w-4 h-4" />
              Add
            </Button>
            <Button variant="default" onClick={applySort} className="flex flex-row items-center h-8">
              Apply
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}