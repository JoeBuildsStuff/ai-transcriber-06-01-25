'use client'

import { useEffect } from 'react'
import { usePageContext } from '@/hooks/use-page-context'
import { useChatContext } from '@/components/chat/chat-provider'

interface TableWithPageContextProps {
  data: Record<string, unknown>[]
  count: number
  children: React.ReactNode
}

export function TableWithPageContext({ data, count, children }: TableWithPageContextProps) {
  const { updatePageContext } = useChatContext()
  
  const { context } = usePageContext({
    data,
    count,
    onContextChange: updatePageContext
  })

  // Update context when data changes
  useEffect(() => {
    updatePageContext(context)
  }, [context, updatePageContext])

  return <>{children}</>
} 