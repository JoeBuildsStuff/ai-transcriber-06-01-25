'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useChatStore } from '@/lib/chat/chat-store'
import { ChatFullPage } from '@/components/chat/chat-fullpage'
import { ChatProvider } from '@/components/chat/chat-provider'

export default function ChatPage() {
  const params = useParams()
  const chatId = params.id as string
  const { switchToSession, setLayoutMode } = useChatStore()

  useEffect(() => {
    // Switch to the specified session and set full page mode
    if (chatId) {
      switchToSession(chatId)
      setLayoutMode('fullpage')
    }
  }, [chatId, switchToSession, setLayoutMode])

  return (
    <ChatProvider>
      <ChatFullPage />
    </ChatProvider>
  )
}
