'use client'

import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from '@/components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

export default function DataTablePagination({
    currentPage, // current page
    totalPages, // total pages
    resultsPerPage, // results per page
}: {
    currentPage: number, // current page
    totalPages: number, // total pages
    resultsPerPage: number, // results per page
}) {

    const router = useRouter();
  
  // Helper function to create URLs with preserved query parameters
  const createPageUrl = (pageNumber: number, rowsPerPage: number = resultsPerPage) => {
    const params = new URLSearchParams()
    params.set('currentPage', pageNumber.toString())
    params.set('resultsPerPage', rowsPerPage.toString())
    return `?${params.toString()}`
  }

  // Handle rows per page change
  const handleRowsPerPageChange = (value: string) => {
    const newRowsPerPage = parseInt(value)
    // Calculate the new current page to maintain the position of the first item
    const firstItemIndex = (currentPage - 1) * resultsPerPage
    const newCurrentPage = Math.floor(firstItemIndex / newRowsPerPage) + 1
    const newUrl = createPageUrl(newCurrentPage, newRowsPerPage)
    router.push(newUrl)
  }

  // Helper function to determine which page numbers to show
  // Show 4 pages then ellipsis --> 1 2 3 4 ... 10
  // FIRST page and LAST page are always shown --> 1 ... 4 5 6 7 8 ... 10
  // Helper function to determine which page numbers to show
  const getVisiblePages = (currentPage: number, totalPages: number) => {
    // Handle single page case
    if (totalPages === 1) {
      return [1];
    }

    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;
    
    range.push(1);
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    // Remove duplicates from range
    const uniqueRange = [...new Set(range)];
    
    // Add dots between numbers
    for (const i of uniqueRange) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };


  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center space-x-4">
        <p className="text-sm font-medium whitespace-nowrap">
          Rows per page
        </p>
        <Select onValueChange={handleRowsPerPageChange} defaultValue={resultsPerPage.toString()}>
          <SelectTrigger className="w-[4rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

        {/* Pagination */}
        <Pagination>
          <PaginationContent>
            {/* Pagination links with ellipsis */}
            {getVisiblePages(currentPage, totalPages).map((pageNum, index) => (
              <PaginationItem key={index}>
                {pageNum === '...' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink 
                    href={createPageUrl(pageNum as number)}
                    isActive={pageNum === currentPage}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>


        <Pagination className="w-fit">
          <PaginationContent className="space-x-2">
             {/* Previous page */}
             <PaginationItem>
              {currentPage > 1 ? (
                // if this is NOT the first page, ENABLE the previous button  
                <PaginationPrevious href={createPageUrl(currentPage - 1)} className="w-[6.25rem] border border-border" />
              ) : (
                // if this is the first page, DISABLE the previous button
                <PaginationPrevious href="#" className="pointer-events-none opacity-50 w-[6.25rem] border border-border" />
              )}
            </PaginationItem>

            {/* Next page */}
            <PaginationItem>
              {currentPage < totalPages ? (
                // if this is NOT the last page, ENABLE the next button
                <PaginationNext href={createPageUrl(currentPage + 1)} className="w-[6.25rem] border border-border"/>
              ) : (
                // if this is the last page, DISABLE the next button
                <PaginationNext href="#" className="pointer-events-none opacity-50 w-[6.25rem] border border-border" />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
  )
}