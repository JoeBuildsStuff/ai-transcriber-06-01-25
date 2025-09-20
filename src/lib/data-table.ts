import type { RowData } from "@tanstack/react-table";
import type { ColumnFiltersState, PaginationState, SortingState, VisibilityState, ColumnOrderState } from "@tanstack/react-table";

export type DataTableConfig = typeof dataTableConfig;

export const dataTableConfig = {
  textOperators: [
    { label: "Contains", value: "iLike" as const },
    { label: "Does not contain", value: "notILike" as const },
    { label: "Is", value: "eq" as const },
    { label: "Is not", value: "ne" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  numericOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Is not", value: "ne" as const },
    { label: "Is less than", value: "lt" as const },
    { label: "Is greater than", value: "gt" as const },
    { label: "Is between", value: "isBetween" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  dateOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Is not", value: "ne" as const },
    { label: "Is before", value: "lt" as const },
    { label: "Is after", value: "gt" as const },
    { label: "Is between", value: "isBetween" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  selectOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Is not", value: "ne" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  multiSelectOperators: [
    { label: "Has any of", value: "inArray" as const },
    { label: "Has none of", value: "notInArray" as const },
    { label: "Is empty", value: "isEmpty" as const },
    { label: "Is not empty", value: "isNotEmpty" as const },
  ],
  booleanOperators: [
    { label: "Is", value: "eq" as const },
    { label: "Is not", value: "ne" as const },
  ],
  filterVariants: [
    "text", "number", "range", "date", "dateRange", "boolean", "select", "multiSelect"
  ] as const,
  operators: [
    "iLike", "notILike", "eq", "ne", "inArray", "notInArray", 
    "isEmpty", "isNotEmpty", "lt", "gt", "isBetween"
  ] as const,
}; 

// URL Search Parameters Types
export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export interface DataTableSearchParams {
  page?: string;
  pageSize?: string;
  sort?: string;
  filters?: string;
  visibility?: string;
  order?: string;
}

export interface DataTableState {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
}

// Utility Functions for URL Search Parameters
export function parseSearchParams(searchParams: SearchParams): Partial<DataTableState> {
  const state: Partial<DataTableState> = {};

  // Parse pagination
  const page = searchParams.page ? parseInt(searchParams.page as string) - 1 : 0;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize as string) : 50;
  state.pagination = {
    pageIndex: Math.max(0, page),
    pageSize: Math.max(1, pageSize),
  };

  // Parse sorting
  if (searchParams.sort) {
    try {
      const sortString = searchParams.sort as string;
      state.sorting = sortString.split(',').map(sort => {
        const [id, desc] = sort.split(':');
        return {
          id,
          desc: desc === 'desc'
        };
      });
    } catch {
      state.sorting = [];
    }
  } else {
    state.sorting = [];
  }

  // Parse filters
  if (searchParams.filters) {
    try {
      const filtersString = decodeURIComponent(searchParams.filters as string);
      state.columnFilters = JSON.parse(filtersString);
    } catch {
      state.columnFilters = [];
    }
  } else {
    state.columnFilters = [];
  }

  // Parse column visibility
  if (searchParams.visibility) {
    try {
      const visibilityString = decodeURIComponent(searchParams.visibility as string);
      state.columnVisibility = JSON.parse(visibilityString);
    } catch {
      state.columnVisibility = {};
    }
  } else {
    state.columnVisibility = {};
  }

  // Parse column order
  if (searchParams.order) {
    try {
      state.columnOrder = (searchParams.order as string).split(",");
    } catch {
      state.columnOrder = [];
    }
  } else {
    state.columnOrder = [];
  }

  return state;
}

export function serializeTableState(state: DataTableState): DataTableSearchParams {
  const params: DataTableSearchParams = {};

  // Serialize pagination
  if (state.pagination.pageIndex > 0) {
    params.page = (state.pagination.pageIndex + 1).toString();
  }
  if (state.pagination.pageSize !== 50) {
    params.pageSize = state.pagination.pageSize.toString();
  }

  // Serialize sorting
  if (state.sorting.length > 0) {
    params.sort = state.sorting
      .map(sort => `${sort.id}:${sort.desc ? 'desc' : 'asc'}`)
      .join(',');
  }

  // Serialize filters
  if (state.columnFilters.length > 0) {
    params.filters = encodeURIComponent(JSON.stringify(state.columnFilters));
  }

  // Serialize column visibility (only if columns are hidden)
  const hiddenColumns = Object.entries(state.columnVisibility).filter(([, visible]) => !visible);
  if (hiddenColumns.length > 0) {
    params.visibility = encodeURIComponent(JSON.stringify(state.columnVisibility));
  }

  // Serialize column order
  if (state.columnOrder?.length > 0) {
    params.order = state.columnOrder.join(",");
  }

  return params;
}

export function updateSearchParams(
  currentParams: URLSearchParams,
  newParams: DataTableSearchParams
): URLSearchParams {
  const updatedParams = new URLSearchParams(currentParams);

  // Remove existing data table params
  updatedParams.delete('page');
  updatedParams.delete('pageSize');
  updatedParams.delete('sort');
  updatedParams.delete('filters');
  updatedParams.delete('visibility');
  updatedParams.delete('order');

  // Add new params
  Object.entries(newParams).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      updatedParams.set(key, value);
    }
  });

  return updatedParams;
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    placeholder?: string;
    variant?: FilterVariant;
    options?: Option[];
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    excludeFromForm?: boolean;
    readOnly?: boolean;
  }
}

export interface Option {
  label: string;
  value: string;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface RelativeDateValue {
  type: "relative";
  amount: number;
  unit: "days" | "weeks" | "months" | "years";
  direction: "ago" | "from_now";
}

export function isRelativeDateValue(value: unknown): value is RelativeDateValue {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RelativeDateValue>;
  return (
    candidate.type === "relative" &&
    typeof candidate.amount === "number" &&
    ["days", "weeks", "months", "years"].includes(candidate.unit ?? "") &&
    ["ago", "from_now"].includes(candidate.direction ?? "")
  );
}

export function resolveRelativeDate(value: RelativeDateValue, referenceDate: Date = new Date()): Date {
  const target = new Date(referenceDate);
  const multiplier = value.direction === "ago" ? -1 : 1;

  switch (value.unit) {
    case "days":
      target.setDate(target.getDate() + multiplier * value.amount);
      break;
    case "weeks":
      target.setDate(target.getDate() + multiplier * value.amount * 7);
      break;
    case "months":
      target.setMonth(target.getMonth() + multiplier * value.amount);
      break;
    case "years":
      target.setFullYear(target.getFullYear() + multiplier * value.amount);
      break;
    default:
      break;
  }

  return target;
}

export function normalizeFilterValue(value: unknown, variant?: FilterVariant): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeFilterValue(item, variant));
  }

  if (variant === "date" || variant === "dateRange") {
    if (isRelativeDateValue(value)) {
      return resolveRelativeDate(value).toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
  }

  if (variant === "number" && typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (variant === "boolean" && typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return value;
}

export type FilterOperator = DataTableConfig["operators"][number];
export type FilterVariant = DataTableConfig["filterVariants"][number];

export interface ExtendedColumnFilter<TData> {
  id: Extract<keyof TData, string>;
  value: string | string[] | number | boolean | Date | RelativeDateValue;
  variant: FilterVariant;
  operator: FilterOperator;
  filterId: string;
}

// Custom filter function that handles all our operators
export function customFilterFn(row: { getValue: (key: string) => unknown }, columnId: string, filterValue: { operator: string; value: unknown; variant: string }) {
  if (!filterValue || typeof filterValue !== 'object') return true;
  
  const { operator, value, variant } = filterValue;
  const cellValue = row.getValue(columnId);

  // Handle empty/not empty operators first
  if (operator === "isEmpty") {
    return cellValue === null || cellValue === undefined || cellValue === "";
  }
  if (operator === "isNotEmpty") {
    return cellValue !== null && cellValue !== undefined && cellValue !== "";
  }

  // If no value provided for other operators, don't filter
  if (value === null || value === undefined || value === "") return true;

  // Convert values for comparison
  let compareValue = value;
  
  // Convert string numbers to actual numbers for numeric operations
  if (variant === "number" && typeof value === "string" && value !== "") {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      compareValue = numValue;
    }
  }
  
  // Convert date strings to Date objects for date operations
  if (variant === "date") {
    if (isRelativeDateValue(value)) {
      compareValue = resolveRelativeDate(value);
    } else if (typeof value === "string" && value !== "") {
      compareValue = new Date(value);
    }
  }
  
  // Convert string booleans to actual booleans
  if (variant === "boolean" && typeof value === "string") {
    compareValue = value === "true";
  }

  // Handle different operators
  switch (operator) {
    case "eq": // Is
      // Handle date comparisons for equality
      if (variant === "date") {
        const cellDate = typeof cellValue === "string" ? new Date(cellValue) : cellValue;
        const compareDate = compareValue instanceof Date ? compareValue : new Date(compareValue as string);
        if (cellDate instanceof Date && compareDate instanceof Date && !isNaN(cellDate.getTime()) && !isNaN(compareDate.getTime())) {
          // Compare dates by day (ignore time)
          return cellDate.toDateString() === compareDate.toDateString();
        }
      }
      return cellValue === compareValue;
      
    case "ne": // Is not
      // Handle date comparisons for inequality
      if (variant === "date") {
        const cellDate = typeof cellValue === "string" ? new Date(cellValue) : cellValue;
        const compareDate = compareValue instanceof Date ? compareValue : new Date(compareValue as string);
        if (cellDate instanceof Date && compareDate instanceof Date && !isNaN(cellDate.getTime()) && !isNaN(compareDate.getTime())) {
          // Compare dates by day (ignore time)
          return cellDate.toDateString() !== compareDate.toDateString();
        }
      }
      return cellValue !== compareValue;
      
    case "iLike": // Contains (case insensitive)
      if (typeof cellValue === "string" && typeof compareValue === "string") {
        return cellValue.toLowerCase().includes(compareValue.toLowerCase());
      }
      return false;
      
    case "notILike": // Does not contain (case insensitive)
      if (typeof cellValue === "string" && typeof compareValue === "string") {
        return !cellValue.toLowerCase().includes(compareValue.toLowerCase());
      }
      return true;
      
    case "lt": // Less than / Before
      if (typeof cellValue === "number" && typeof compareValue === "number") {
        return cellValue < compareValue;
      }
      // Handle date comparisons
      if (variant === "date") {
        const cellDate = typeof cellValue === "string" ? new Date(cellValue) : cellValue;
        const compareDate = compareValue instanceof Date ? compareValue : new Date(compareValue as string);
        if (cellDate instanceof Date && compareDate instanceof Date && !isNaN(cellDate.getTime()) && !isNaN(compareDate.getTime())) {
          return cellDate < compareDate;
        }
      }
      if (cellValue instanceof Date && compareValue instanceof Date) {
        return cellValue < compareValue;
      }
      return false;
      
    case "gt": // Greater than / After
      if (typeof cellValue === "number" && typeof compareValue === "number") {
        return cellValue > compareValue;
      }
      // Handle date comparisons
      if (variant === "date") {
        const cellDate = typeof cellValue === "string" ? new Date(cellValue) : cellValue;
        const compareDate = compareValue instanceof Date ? compareValue : new Date(compareValue as string);
        if (cellDate instanceof Date && compareDate instanceof Date && !isNaN(cellDate.getTime()) && !isNaN(compareDate.getTime())) {
          return cellDate > compareDate;
        }
      }
      if (cellValue instanceof Date && compareValue instanceof Date) {
        return cellValue > compareValue;
      }
      return false;
      
    case "inArray": // Has any of (for multi-select)
      if (Array.isArray(compareValue)) {
        return compareValue.includes(cellValue);
      }
      return false;
      
    case "notInArray": // Has none of (for multi-select)
      if (Array.isArray(compareValue)) {
        return !compareValue.includes(cellValue);
      }
      return true;
      
    case "isBetween": // Is between (for ranges)
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        const minNum = typeof min === "string" ? parseFloat(min) : min;
        const maxNum = typeof max === "string" ? parseFloat(max) : max;
        
        if (typeof cellValue === "number" && !isNaN(minNum as number) && !isNaN(maxNum as number)) {
          return cellValue >= (minNum as number) && cellValue <= (maxNum as number);
        }
      }
      return true;
      
    default:
      return true;
  }
} 
