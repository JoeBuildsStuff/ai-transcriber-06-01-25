'use client'

import { useCallback, useMemo } from 'react'
import { useChatStore } from '@/lib/chat/chat-store'
import type { ChatMessage, ChatAction, PageContext } from '@/types/chat'
import type { Attachment } from '@/components/chat/chat-input'

interface UseChatProps {
  onSendMessage?: (message: string, attachments?: Attachment[]) => Promise<void>
  onActionClick?: (action: ChatAction) => void
}

export function useChat({ onSendMessage, onActionClick }: UseChatProps = {}) {
  const {
    messages,
    isOpen,
    isMinimized,
    isLoading,
    currentContext,
    currentSessionId,
    createSession,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setOpen,
    setMinimized,
    setLoading,
    toggleChat,
    updatePageContext,
  } = useChatStore()

  // Handle sending a new message
  const sendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0) || isLoading) return

    // Ensure we have a current session
    if (!currentSessionId) {
      createSession()
    }

    // Add user message immediately
    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content: content.trim() || 'Sent with attachments',
      context: currentContext ? {
        filters: currentContext.currentFilters,
        data: {
          totalCount: currentContext.totalCount,
          visibleDataSample: currentContext.visibleData.slice(0, 3) // Limit context data
        }
      } : undefined
    }

    addMessage(userMessage)

    // Set loading state
    setLoading(true)

    try {
      // Call custom send handler if provided, otherwise use default API call
      if (onSendMessage) {
        await onSendMessage(content, attachments)
      } else {
        // Default API call
        await sendToAPI(content, currentContext, attachments)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
      })
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }, [currentContext, currentSessionId, createSession, addMessage, onSendMessage, isLoading, setLoading])

  // Default API handler
  const sendToAPI = useCallback(async (content: string, context: PageContext | null, attachments?: Attachment[]) => {
    const formData = new FormData()
    formData.append('message', content)
    formData.append('context', JSON.stringify(context))
    formData.append('messages', JSON.stringify(messages.slice(-10))) // Send last 10 messages for context
    
    // Add attachments if any
    if (attachments && attachments.length > 0) {
      attachments.forEach((attachment, index) => {
        formData.append(`attachment-${index}`, attachment.file)
        formData.append(`attachment-${index}-name`, attachment.name)
        formData.append(`attachment-${index}-type`, attachment.type)
        formData.append(`attachment-${index}-size`, attachment.size.toString())
      })
      formData.append('attachmentCount', attachments.length.toString())
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const result = await response.json()
    
    addMessage({
      role: 'assistant',
      content: result.message || 'I apologize, but I couldn\'t generate a response.',
      suggestedActions: result.actions || []
    })
  }, [messages, addMessage])

  // Handle action clicks
  const handleActionClick = useCallback((action: ChatAction) => {
    if (onActionClick) {
      onActionClick(action)
    } else {
      // Default action handling
      console.log('Action clicked:', action)
      // Add confirmation message
      addMessage({
        role: 'system',
        content: `Action executed: ${action.label}`,
      })
    }
  }, [onActionClick, addMessage])

  // Get unread message count
  const getUnreadCount = useCallback(() => {
    if (isOpen) return 0
    // Count assistant messages since last opened
    // For now, just return 0 - this could be enhanced with proper read tracking
    return 0
  }, [isOpen])

  // Chat state utilities
  const chatState = useMemo(() => ({
    isEmpty: messages.length === 0,
    hasMessages: messages.length > 0,
    lastMessage: messages[messages.length - 1] || null,
    messageCount: messages.length,
    isTyping: isLoading, // Use loading state as typing indicator
  }), [messages, isLoading])

  // Context utilities
  const contextInfo = useMemo(() => {
    if (!currentContext) {
      return {
        hasContext: false,
        pageDescription: 'No page context available',
        summary: 'Unable to determine current page context'
      }
    }

    const { totalCount, currentFilters, currentSort, visibleData } = currentContext
    const hasFilters = (currentFilters as Record<string, unknown>)?.activeFiltersCount as number > 0
    const hasSorting = (currentSort as Record<string, unknown>)?.activeSortsCount as number > 0

    return {
      hasContext: true,
      pageDescription: 'Current data view',
      summary: `Viewing ${totalCount} items${hasFilters ? ' (filtered)' : ''}${hasSorting ? ' (sorted)' : ''}`,
      hasFilters,
      hasSorting,
      dataCount: totalCount,
      visibleCount: visibleData.length
    }
  }, [currentContext])

  return {
    // State
    messages,
    isOpen,
    isMinimized,
    isLoading,
    currentContext,
    chatState,
    contextInfo,

    // Actions
    sendMessage,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    handleActionClick,

    // UI State
    setOpen,
    setMinimized,
    toggleChat,
    openChat: () => setOpen(true),
    closeChat: () => setOpen(false),
    minimizeChat: () => setMinimized(true),
    maximizeChat: () => setMinimized(false),

    // Context
    updatePageContext,

    // Utilities
    getUnreadCount,
    hasUnread: getUnreadCount() > 0,

    // Convenience methods
    clearAndClose: () => {
      clearMessages()
      setOpen(false)
    },
    
    canSendMessage: (content: string) => {
      return content.trim().length > 0 && !isLoading
    },

    // Get context summary for display
    getContextSummary: () => {
      if (!currentContext) return null
      
      const { totalCount, currentFilters, currentSort } = currentContext
      const hasFilters = (currentFilters as Record<string, unknown>)?.activeFiltersCount as number > 0
      const hasSorting = (currentSort as Record<string, unknown>)?.activeSortsCount as number > 0
      
      let summary = `${totalCount} items`
      if (hasFilters) summary += ' (filtered)'
      if (hasSorting) summary += ' (sorted)'
      
      return summary
    },

    // Get suggested prompts based on context
    getSuggestedPrompts: () => {
      if (!currentContext) return []
      
      const { totalCount } = currentContext
      const hasData = totalCount > 0
      
      if (!hasData) {
        return [
          `Why are there no items?`,
          `How can I add a new item?`,
          `Show me how to import items`
        ]
      }

      return [
        `Filter items by status`,
        `Show me recent items`,
        `Sort items by priority`
      ]
    }
  }
} 