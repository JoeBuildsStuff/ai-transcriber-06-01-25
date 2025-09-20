"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "./data-table-pagination"
import DataTableToolbar from "./data-table-toolbar"
import { 
  DataTableState, 
  serializeTableState, 
  updateSearchParams 
} from "@/lib/data-table"

/**
 * Props for the DataTable component
 */
export interface DataTableProps {
  /** Array of column definitions that define the table structure */
  columns: ColumnDef<Record<string, unknown>, unknown>[]
  /** Array of data objects to display in the table */
  data: Record<string, unknown>[]
  /** Initial state for the table including pagination, sorting, filters, etc. */
  initialState?: Partial<DataTableState>
  /** Total number of pages for server-side pagination */
  pageCount?: number
  /** Unique identifier for persisting saved views */
  tableKey: string
  /** Function to handle multi deletion of rows */
  deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  /** Function to handle creation of new rows */
  createAction?: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  /** Function to handle updating existing rows */
  updateActionSingle?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  /** Function to handle multi updating of multiple rows */
  updateActionMulti?: (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  /** Custom form component for adding new rows */
  customAddForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>
  /** Custom form component for editing existing rows */
  customEditFormSingle?: React.ComponentType<{
    data: Record<string, unknown>
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  }>
  /** Custom form component for multi editing multiple rows */
  customEditFormMulti?: React.ComponentType<{
    selectedCount: number
    onSuccess?: () => void
    onCancel?: () => void
    multiUpdateAction?: (ids: string[], data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>
}

interface DataTableInternalProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  initialState?: Partial<DataTableState>
  pageCount?: number
  tableKey: string
  deleteAction?: (ids: string[]) => Promise<{ success: boolean; error?: string; deletedCount?: number }>
  createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionSingle?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  updateActionMulti?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  customAddForm?: React.ComponentType<{
    onSuccess?: () => void
    onCancel?: () => void
    createAction?: (data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormSingle?: React.ComponentType<{
    data: TData
    onSuccess?: () => void
    onCancel?: () => void
    updateAction?: (id: string, data: Partial<TData>) => Promise<{ success: boolean; error?: string }>
  }>
  customEditFormMulti?: React.ComponentType<{
    selectedCount: number
    onSuccess?: () => void
    onCancel?: () => void
    multiUpdateAction?: (ids: string[], data: Partial<TData>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
  }>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  initialState,
  pageCount,
  tableKey,
  deleteAction,
  createAction,
  updateActionSingle,
  updateActionMulti,
  customAddForm,
  customEditFormSingle,
  customEditFormMulti,
}: DataTableInternalProps<TData, TValue>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? []
  )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters ?? []
  )
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialState?.columnVisibility ?? {}
  )
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialState?.pagination ?? { pageIndex: 0, pageSize: 10 }
  )
  const [columnOrder, setColumnOrder] = React.useState<string[]>(
    initialState?.columnOrder ?? []
  )

  // Sync state changes to URL
  React.useEffect(() => {
    const currentState: DataTableState = {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      columnOrder,
    }

    const newParams = serializeTableState(currentState)
    const updatedSearchParams = updateSearchParams(searchParams, newParams)
    
    // Only update URL if parameters actually changed
    const currentUrl = `${pathname}?${searchParams.toString()}`
    const newUrl = `${pathname}?${updatedSearchParams.toString()}`
    
    if (currentUrl !== newUrl) {
      router.replace(newUrl, { scroll: false })
    }
  }, [pagination, sorting, columnFilters, columnVisibility, columnOrder, router, pathname, searchParams])

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onColumnOrderChange: setColumnOrder,
    enableMultiSort: true,
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      columnOrder,
    },
  })

  return (
    <div className="">
        <div className="pb-2 ">
            <DataTableToolbar 
              table={table} 
              tableKey={tableKey}
              deleteAction={deleteAction} 
              createAction={createAction}
              updateActionSingle={updateActionSingle}
              updateActionMulti={updateActionMulti}
              customAddForm={customAddForm}
              customEditFormSingle={customEditFormSingle}
              customEditFormMulti={customEditFormMulti}
            />
        </div>

        <div className="rounded-md border">
            <Table>
                <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                        return (
                        <TableHead key={header.id}>
                            {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                                )}
                        </TableHead>
                        )
                    })}
                    </TableRow>
                ))}
                </TableHeader>
                <TableBody>
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                    <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                    >
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
        
        <div className="pt-2">
            <DataTablePagination table={table} />
        </div>
    </div>
  )
}
