import React from 'react'

export function TableSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Table header skeleton */}
      <div className="border rounded-md">
        <div className="flex p-4 bg-gray-50 border-b">
          <div className="h-7 bg-gray-200 rounded w-1/4"></div>
          <div className="ml-auto flex space-x-2">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        
        {/* Table header row */}
        <div className="grid grid-cols-4 p-4 border-b bg-gray-50">
          {[...Array(4)].map((_, i) => (
            <div key={`header-${i}`} className="h-6 bg-gray-200 rounded w-3/4"></div>
          ))}
        </div>

        {/* Table rows */}
        {[...Array(5)].map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 p-4 border-b last:border-0">
            {[...Array(4)].map((_, colIndex) => (
              <div 
                key={`cell-${rowIndex}-${colIndex}`} 
                className="h-5 bg-gray-200 rounded w-4/5"
              ></div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-32"></div>
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <div key={`page-${i}`} className="h-8 bg-gray-200 rounded w-8"></div>
          ))}
        </div>
        <div className="h-6 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  )
}