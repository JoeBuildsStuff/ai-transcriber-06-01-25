'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useChatStore } from '@/lib/chat/chat-store'
import { ChatFullPage } from '@/components/chat/chat-fullpage'
import { ChatProvider } from '@/components/chat/chat-provider'
import { getChatMessages } from '@/actions/chat'
import type { Database } from '@/types/supabase'

// Types for the database row with relations
type ChatMessageRow = Database['ai_transcriber']['Tables']['chat_messages']['Row'] & {
  chat_attachments: Database['ai_transcriber']['Tables']['chat_attachments']['Row'][]
  chat_tool_calls: Database['ai_transcriber']['Tables']['chat_tool_calls']['Row'][]
  chat_suggested_actions: Database['ai_transcriber']['Tables']['chat_suggested_actions']['Row'][]
}

type ChatAttachmentRow = Database['ai_transcriber']['Tables']['chat_attachments']['Row']
type ChatSuggestedActionRow = Database['ai_transcriber']['Tables']['chat_suggested_actions']['Row']
type ChatToolCallRow = Database['ai_transcriber']['Tables']['chat_tool_calls']['Row']

export default function ChatPage() {
  const params = useParams()
  const chatId = params.id as string
  const { setLayoutMode, setCurrentSessionIdFromServer, setMessagesForSession } = useChatStore()

  useEffect(() => {
    // Switch to the specified session and set full page mode
    if (chatId) {
      setCurrentSessionIdFromServer(chatId)
      // Load messages from server
      getChatMessages(chatId).then(async (res) => {
        if ('error' in res && res.error) return
        const rows = res.data || []
        const msgs = await Promise.all(rows.map(async (m: ChatMessageRow) => {
          const attachments = Array.isArray(m.chat_attachments) ? await Promise.all(m.chat_attachments.map(async (att: ChatAttachmentRow) => {
            const endpoint = (att.mime_type as string)?.startsWith('image/') ? '/api/images/serve' : '/api/files/serve'
            try {
              const r = await fetch(`${endpoint}?path=${encodeURIComponent(att.storage_path)}`)
              const j = await r.json()
              const signed = j.imageUrl || j.fileUrl
              return { id: att.id, name: att.name, size: att.size, type: att.mime_type, url: signed }
            } catch {
              return { id: att.id, name: att.name, size: att.size, type: att.mime_type }
            }
          })) : []
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
            reasoning: m.reasoning || undefined,
            attachments,
            context: m.context ? (typeof m.context === 'object' && m.context !== null ? m.context as { filters?: Record<string, unknown>, data?: Record<string, unknown> } : undefined) : undefined,
            suggestedActions: Array.isArray(m.chat_suggested_actions) ? m.chat_suggested_actions.map((a: ChatSuggestedActionRow) => ({ 
              type: a.type, 
              label: a.label, 
              payload: (a.payload && typeof a.payload === 'object' && a.payload !== null) ? a.payload as Record<string, unknown> : {}
            })) : undefined,
            functionResult: m.function_result ? (typeof m.function_result === 'object' && m.function_result !== null ? m.function_result as { success: boolean, data?: unknown, error?: string } : undefined) : undefined,
            toolCalls: Array.isArray(m.chat_tool_calls) ? m.chat_tool_calls.map((t: ChatToolCallRow) => ({ 
              id: t.id, 
              name: t.name, 
              arguments: t.arguments as Record<string, unknown>, 
              result: t.result ? (typeof t.result === 'object' && t.result !== null ? t.result as { success: boolean, data?: unknown, error?: string } : undefined) : undefined, 
              reasoning: t.reasoning || undefined 
            })) : undefined,
            citations: m.citations ? (Array.isArray(m.citations) ? m.citations as Array<{ url: string, title: string, cited_text: string }> : undefined) : undefined,
          }
        }))
        setMessagesForSession(chatId, msgs)
      })
      setLayoutMode('fullpage')
    }
  }, [chatId, setLayoutMode, setCurrentSessionIdFromServer, setMessagesForSession])

  return (
    <ChatProvider>
      <ChatFullPage />
    </ChatProvider>
  )
}
