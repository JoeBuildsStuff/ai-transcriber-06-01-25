import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, PageContext } from '@/types/chat'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ChatAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
}

interface ChatAPIResponse {
  message: string
  actions?: Array<{
    type: 'filter' | 'sort' | 'navigate' | 'create'
    label: string
    payload: Record<string, unknown>
  }>
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatAPIResponse>> {
  try {
    const body: ChatAPIRequest = await request.json()
    const { message, context, messages = [] } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    // Build context-aware prompt
    const prompt = buildContextualPrompt(message, context || null, messages)

    const response = await getLLMResponse(prompt)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { message: 'I apologize, but I encountered an error processing your request. Please try again.' },
      { status: 500 }
    )
  }
}

function buildContextualPrompt(
  message: string, 
  context: PageContext | null, 
  messages: ChatMessage[]
): string {
  let prompt = `You are a helpful assistant for a contact management application. 
The user is asking: "${message}"

`

  if (context) {
    prompt += `Current context:
- Total items: ${context.totalCount}
- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}
- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}
- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}

`

  } else {
    prompt += `No current page context available.

`
  }

  if (messages.length > 0) {
    prompt += `Recent conversation:
${messages.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

`
  }

  prompt += `Please provide a helpful response. If you can suggest specific filters, sorts, or actions based on the context, include them in your response. Focus on helping the user work with their data.`

  return prompt
}

async function getLLMResponse(prompt: string): Promise<ChatAPIResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${prompt}

You are a helpful assistant for a contact management application. Based on the user's request and the current page context, provide a helpful response and suggest specific actions when appropriate.

Please respond with a JSON object in the following format:
{
  "message": "Your helpful response to the user",
  "actions": [
    {
      "type": "filter|sort|navigate|create",
      "label": "Human readable label for the action button",
      "payload": { "specific": "action data" }
    }
  ]
}

Guidelines:
- Always include a helpful "message" field
- Only include "actions" if you have specific actionable suggestions
- For filters: use type "filter" with payload containing columnId, operator, and value
- For sorting: use type "sort" with payload containing columnId and direction
- For navigation: use type "navigate" with payload containing pathname and optional clearFilters
- For creating new items: use type "create" with payload containing action and type

Valid filter operators: 'iLike', 'equals', 'isEmpty', 'isNotEmpty', 'greaterThan', 'lessThan'
Valid sort directions: 'asc', 'desc'`
        }
      ],
    })

    const content = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : ''

      // TODO: is this needed?
    // Clean the response by removing markdown code blocks if present
    const cleanedContent = content
      .replace(/^```json\s*/, '')  // Remove opening ```json
      .replace(/\s*```$/, '')      // Remove closing ```
      .trim()

    // Parse the JSON response
    let parsedResponse: ChatAPIResponse
    try {
      parsedResponse = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('Failed to parse LLM JSON response:', parseError)
      console.error('Raw content:', content)
      console.error('Cleaned content:', cleanedContent)
      // Fallback to a basic response if JSON parsing fails
      return {
        message: content || 'I apologize, but I encountered an error processing your request. Please try again.',
        actions: []
      }
    }

    // Validate the response structure
    if (typeof parsedResponse.message !== 'string') {
      parsedResponse.message = 'I apologize, but I encountered an error processing your request. Please try again.'
    }

    // Validate actions array if present
    if (parsedResponse.actions && Array.isArray(parsedResponse.actions)) {
      parsedResponse.actions = parsedResponse.actions.filter((action: unknown): action is NonNullable<ChatAPIResponse['actions']>[0] => {
        return (
          action !== null &&
          typeof action === 'object' &&
          action !== undefined &&
          'type' in action &&
          'label' in action &&
          'payload' in action &&
          typeof action.type === 'string' &&
          typeof action.label === 'string' &&
          typeof action.payload === 'object' &&
          ['filter', 'sort', 'navigate', 'create'].includes(action.type)
        )
      })
    } else {
      parsedResponse.actions = []
    }

    return parsedResponse
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error('Failed to get response from Anthropic API')
  }
} 