'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { parseSearchParams } from '@/lib/data-table'
import type { PageContext } from '@/types/chat'

interface UsePageContextProps {
  data?: Record<string, unknown>[]
  count?: number
  onContextChange?: (context: PageContext) => void
}

export function usePageContext({ 
  data = [], 
  count = 0, 
  onContextChange 
}: UsePageContextProps = {}) {
  const searchParams = useSearchParams()
  
  // Convert searchParams to regular object
  const searchParamsObj = useMemo(() => {
    const params: Record<string, string | string[]> = {}
    searchParams?.forEach((value, key) => {
      const existing = params[key]
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(value)
        } else {
          params[key] = [existing, value]
        }
      } else {
        params[key] = value
      }
    })
    return params
  }, [searchParams])

  // Parse current filters and sorting
  const { pagination, sorting, columnFilters } = useMemo(() => {
    return parseSearchParams(searchParamsObj)
  }, [searchParamsObj])

  // Create context object
  const context = useMemo((): PageContext => {
    // Get visible data summary (first 5 items with just id and basic info)
    const getDataSummary = () => {
      if (!data || data.length === 0) return []
      
      // Simple generic data summary - just take first 5 items with basic fields
      return data.slice(0, 5).map(item => {
        const basicItem: Record<string, unknown> = {
          id: item.id
        }
        
        // Add name field if it exists in various forms
        if (item.name) {
          basicItem.name = item.name
        } else if (item.first_name || item.last_name) {
          basicItem.name = `${item.first_name || ''} ${item.last_name || ''}`.trim()
        }
        
        // Add any other basic string fields that might be useful
        ['title', 'email', 'description', 'status'].forEach(field => {
          if (item[field] && typeof item[field] === 'string') {
            basicItem[field] = item[field]
          }
        })
        
        return basicItem
      })
    }

    return {
      currentFilters: {
        columnFilters: columnFilters || [],
        activeFiltersCount: columnFilters?.length || 0,
        filtersSummary: columnFilters?.map(filter => {
          const filterValue = filter.value as Record<string, unknown>
          return {
            column: filter.id,
            operator: filterValue?.operator || 'unknown',
            value: filterValue?.value
          }
        }) || []
      },
      currentSort: {
        sorting: sorting || [],
        activeSortsCount: sorting?.length || 0,
        sortingSummary: sorting?.map(sort => ({
          column: sort.id,
          direction: sort.desc ? 'desc' : 'asc'
        })) || []
      },
      visibleData: getDataSummary(),
      totalCount: count
    }
  }, [columnFilters, sorting, data, count])

  // Call onContextChange when context changes
  useEffect(() => {
    if (onContextChange) {
      onContextChange(context)
    }
  }, [context, onContextChange])

  return {
    context,
    currentFilters: context.currentFilters,
    currentSort: context.currentSort,
    visibleData: context.visibleData,
    totalCount: context.totalCount,
    hasFilters: (columnFilters?.length || 0) > 0,
    hasSorting: (sorting?.length || 0) > 0,
    
    // Helper functions
    getFilterSummary: () => {
      if (!columnFilters || columnFilters.length === 0) return 'No filters applied'
      
      const filterDescriptions = columnFilters.map(filter => {
        const column = filter.id
        const filterValue = filter.value as Record<string, unknown>
        const operator = filterValue?.operator || 'unknown'
        const value = filterValue?.value
        
        switch (operator) {
          case 'iLike':
            return `${column} contains "${value}"`
          case 'eq':
            return `${column} equals "${value}"`
          case 'ne':
            return `${column} does not equal "${value}"`
          case 'inArray':
            return `${column} is one of [${Array.isArray(value) ? value.join(', ') : value}]`
          default:
            return `${column} ${operator} ${value}`
        }
      })
      
      return filterDescriptions.length === 1 
        ? filterDescriptions[0]
        : `${filterDescriptions.length} filters: ${filterDescriptions.join('; ')}`
    },
    
    getSortSummary: () => {
      if (!sorting || sorting.length === 0) return 'Default sorting'
      
      const sortDescriptions = sorting.map(sort => 
        `${sort.id} ${sort.desc ? 'descending' : 'ascending'}`
      )
      
      return sortDescriptions.length === 1
        ? `Sorted by ${sortDescriptions[0]}`
        : `Sorted by: ${sortDescriptions.join(', ')}`
    },
    
    getDataSummary: () => {
      if (count === 0) return 'No items found'
      if (data.length === 0) return `${count} items (not loaded)`
      
      const visibleCount = data.length
      if (visibleCount === count) {
        return `Showing all ${count} items`
      } else {
        return `Showing ${visibleCount} of ${count} items`
      }
    }
  }
} 