"use client"

import { Table } from "@tanstack/react-table"
import { useMemo } from "react"

import DataTableCommandFilterItem from "./data-table-command-filter-item"
import type { FilterOperator, FilterVariant, Option, RelativeDateValue } from "@/lib/data-table"
import { dataTableConfig, isRelativeDateValue, resolveRelativeDate } from "@/lib/data-table"

interface DataTableCommandFilterProps<TData> {
  table: Table<TData>
}

type OperatorConfig = {
  label: string
  value: FilterOperator
}

interface ColumnFilterValue {
  operator?: FilterOperator
  value?: unknown
  variant?: FilterVariant
}

type ColumnMeta = {
  label?: string
  options?: Option[]
  variant?: FilterVariant
}

interface FilterItem {
  key: string
  columnLabel: string
  operatorLabel: string
  valueLabel?: string
  onRemove: () => void
}

const operatorMap: Record<FilterVariant, OperatorConfig[]> = {
  text: dataTableConfig.textOperators,
  number: dataTableConfig.numericOperators,
  range: dataTableConfig.numericOperators,
  date: dataTableConfig.dateOperators,
  dateRange: dataTableConfig.dateOperators,
  boolean: dataTableConfig.booleanOperators,
  select: dataTableConfig.selectOperators,
  multiSelect: dataTableConfig.multiSelectOperators,
}

const allOperators: OperatorConfig[] = [
  ...dataTableConfig.textOperators,
  ...dataTableConfig.numericOperators,
  ...dataTableConfig.dateOperators,
  ...dataTableConfig.booleanOperators,
  ...dataTableConfig.selectOperators,
  ...dataTableConfig.multiSelectOperators,
]

function getOperatorLabel(variant: FilterVariant | undefined, operator?: FilterOperator): string {
  if (!operator) return ""
  if (variant) {
    const label = operatorMap[variant]?.find((item) => item.value === operator)?.label
    if (label) return label
  }

  return allOperators.find((item) => item.value === operator)?.label ?? operator
}

function formatDate(value: string | Date) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date)
  } catch {
    return String(value)
  }
}

function formatFilterValue(
  value: unknown,
  variant: FilterVariant | undefined,
  columnMeta?: ColumnMeta,
): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined
  }

  if (Array.isArray(value)) {
    if (variant === "multiSelect") {
      const labels = value
        .map((item) => {
          const option = columnMeta?.options?.find((opt) => opt.value === item)
          return option?.label ?? String(item)
        })
        .filter(Boolean)
      return labels.join(", ")
    }

    return value.map((item) => formatFilterValue(item, variant, columnMeta)).filter(Boolean).join(" – ")
  }

  switch (variant) {
    case "select": {
      const option = columnMeta?.options?.find((opt) => opt.value === value)
      return option?.label ?? String(value)
    }
    case "boolean":
      if (typeof value === "boolean") return value ? "True" : "False"
      if (typeof value === "string") return value === "true" ? "True" : value === "false" ? "False" : value
      return String(value)
    case "date":
    case "dateRange":
      if (isRelativeDateValue(value)) {
        return formatDate(resolveRelativeDate(value as RelativeDateValue))
      }
      return formatDate(value as string)
    case "number":
    case "range":
      return String(value)
    default:
      return String(value)
  }
}

export default function DataTableCommandFilter<TData>({ table }: DataTableCommandFilterProps<TData>) {
  const filters = table.getState().columnFilters

  const filterItems = useMemo(() => {
    return filters.map<FilterItem | null>((filter, index) => {
      const column = table.getColumn(filter.id)
      const columnMeta = column?.columnDef.meta as ColumnMeta | undefined

      const rawValue = ((): ColumnFilterValue => {
        const currentValue = filter.value
        if (currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)) {
          return currentValue as ColumnFilterValue
        }
        return { value: currentValue }
      })()

      const variant = rawValue?.variant ?? columnMeta?.variant
      const operator = rawValue?.operator
      const formattedValue = formatFilterValue(rawValue?.value, variant, columnMeta)

      const columnLabel = columnMeta?.label ?? column?.id ?? filter.id
      const operatorLabel = getOperatorLabel(variant, operator)

      const key = `${filter.id}-${index}`

      const handleRemove = () => {
        table.setColumnFilters((current) => current.filter((item) => item.id !== filter.id))
      }

      if (!columnLabel && !operatorLabel && !formattedValue) {
        return null
      }

      return {
        key,
        columnLabel,
        operatorLabel,
        valueLabel: formattedValue,
        onRemove: handleRemove,
      }
    }).filter((item): item is FilterItem => item !== null)
  }, [filters, table])

  if (filterItems.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 w-full">
      {filterItems.map(({ key, columnLabel, operatorLabel, valueLabel, onRemove }) => (
        <DataTableCommandFilterItem
          key={key}
          columnLabel={columnLabel}
          operatorLabel={operatorLabel}
          valueLabel={valueLabel}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
