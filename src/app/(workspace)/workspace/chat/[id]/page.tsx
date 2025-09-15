'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useChatStore } from '@/lib/chat/chat-store'
import { ChatFullPage } from '@/components/chat/chat-fullpage'
import { ChatProvider } from '@/components/chat/chat-provider'
import { getChatMessages } from '@/actions/chat'

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
        const msgs = await Promise.all(rows.map(async (m: any) => {
          const attachments = Array.isArray(m.chat_attachments) ? await Promise.all(m.chat_attachments.map(async (att: any) => {
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
            context: m.context || undefined,
            suggestedActions: Array.isArray(m.chat_suggested_actions) ? m.chat_suggested_actions.map((a: any) => ({ type: a.type, label: a.label, payload: a.payload })) : undefined,
            functionResult: m.function_result || undefined,
            toolCalls: Array.isArray(m.chat_tool_calls) ? m.chat_tool_calls.map((t: any) => ({ id: t.id, name: t.name, arguments: t.arguments, result: t.result || undefined, reasoning: t.reasoning || undefined })) : undefined,
            citations: m.citations || undefined,
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
