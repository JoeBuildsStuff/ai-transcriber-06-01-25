'use client'

import { ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider' 
import { SidebarProvider } from '@/components/ui/sidebar' 
import { Toaster } from '@/components/ui/sonner' 

export function Providers({ children }: { children: ReactNode }) {
const [queryClient] = useState(() => new QueryClient())

return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider> 
        {children}
        <Toaster />
      </SidebarProvider>
    </ThemeProvider>
  </QueryClientProvider>
)
}