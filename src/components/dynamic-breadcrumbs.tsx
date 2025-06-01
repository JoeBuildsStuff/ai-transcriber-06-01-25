'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function generateBreadcrumbs(path: string) {
    // Remove leading and trailing slashes
    const cleanPath = path.replace(/^\/+|\/+$/g, '')
    
    // Split the path into segments
    const segments = cleanPath.split('/')
    
    // Generate breadcrumb items
    const breadcrumbs = segments.map((segment, index) => {
      // Create the URL for this breadcrumb
      const url = '/' + segments.slice(0, index + 1).join('/')
      
      // Capitalize and clean up segment name
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      return { name, url }
    })
  
    return breadcrumbs
  }

export function DynamicBreadcrumbs() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.url}>
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.url}>
                  {crumb.name}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}