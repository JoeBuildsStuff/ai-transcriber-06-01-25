import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, PageContext } from '@/types/chat'
import Anthropic from '@anthropic-ai/sdk'
import { createPerson } from '@/app/(workspace)/workspace/contacts/_lib/actions'

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
    type: 'filter' | 'sort' | 'navigate' | 'create' | 'function_call'
    label: string
    payload: Record<string, unknown>
  }>
  functionResult?: {
    success: boolean
    data?: unknown
    error?: string
  }
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
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        return NextResponse.json(
          { message: 'AI service is not configured. Please check the API key.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { message: `Error: ${error.message}` },
        { status: 500 }
      )
    }
    
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

// Define available functions for the LLM
const availableFunctions: Anthropic.Tool[] = [
  {
    name: 'create_person_contact',
    description: 'Create a new person contact in the database with their information including name, emails, phones, company, and other details',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: {
          type: 'string',
          description: 'First name of the person'
        },
        last_name: {
          type: 'string', 
          description: 'Last name of the person'
        },
        _emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of email addresses for the person'
        },
        _phones: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of phone numbers for the person'
        },
        company_name: {
          type: 'string',
          description: 'Name of the company the person works for (will be created if it doesn\'t exist)'
        },
        job_title: {
          type: 'string',
          description: 'Job title or position of the person'
        },
        city: {
          type: 'string',
          description: 'City where the person is located'
        },
        state: {
          type: 'string',
          description: 'State where the person is located'
        },
        linkedin: {
          type: 'string',
          description: 'LinkedIn profile URL'
        },
        description: {
          type: 'string',
          description: 'Additional notes or description about the person'
        }
      },
      required: []
    }
  }
]

async function executeFunctionCall(functionName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    console.log(`Executing function: ${functionName}`, parameters)
    
    switch (functionName) {
      case 'create_person_contact':
        // Validate required parameters
        if (!parameters.first_name && !parameters.last_name) {
          return { success: false, error: 'At least first name or last name is required' }
        }
        
        const result = await createPerson(parameters)
        console.log('Function result:', result)
        return result
      default:
        return { success: false, error: `Unknown function: ${functionName}` }
    }
  } catch (error) {
    console.error('Function execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

async function getLLMResponse(prompt: string): Promise<ChatAPIResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: availableFunctions,
      messages: [
        {
          role: 'user',
          content: `${prompt}

You are a helpful assistant for a contact management application. You can help users manage their contacts by filtering, sorting, navigating, and creating new person contacts.

When users ask to create or add a new person contact, use the create_person_contact function with the provided information. Extract as much relevant information as possible from the user's request.

For other requests, provide helpful responses and suggest specific actions when appropriate.

Guidelines:
- Use the create_person_contact function when users want to add new contacts
- Extract information like name, email, phone, company, job title, location from user requests
- For filters: suggest filter actions with columnId, operator, and value
- For sorting: suggest sort actions with columnId and direction  
- For navigation: suggest navigate actions with pathname
- Always provide helpful and contextual responses`
        }
      ],
    })

    // Handle function calls
    const toolUse = response.content.find(content => content.type === 'tool_use')
    if (toolUse && toolUse.type === 'tool_use') {
      const functionResult = await executeFunctionCall(toolUse.name, toolUse.input as Record<string, unknown>)
      
      // Get the follow-up response after function execution with proper tool_result
      const followUpResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          },
          {
            role: 'assistant',
            content: response.content
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: JSON.stringify(functionResult)
              }
            ]
          }
        ],
      })

      const followUpContent = followUpResponse.content[0]?.type === 'text' 
        ? followUpResponse.content[0].text 
        : ''

      return {
        message: followUpContent || (functionResult.success 
          ? 'Contact created successfully!' 
          : `Failed to create contact: ${functionResult.error}`),
        functionResult,
        actions: []
      }
    }

    // Handle regular text response
    const content = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : ''

    return {
      message: content || 'I apologize, but I encountered an error processing your request. Please try again.',
      actions: []
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error('Failed to get response from Anthropic API')
  }
} 