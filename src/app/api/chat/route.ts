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
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
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
    let body: ChatAPIRequest

    // Check if the request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const message = formData.get('message') as string
      const contextStr = formData.get('context') as string
      const messagesStr = formData.get('messages') as string
      const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0')
      
      const context = contextStr && contextStr !== 'null' ? JSON.parse(contextStr) : null
      const messages = messagesStr ? JSON.parse(messagesStr) : []
      
      const attachments: Array<{ file: File; name: string; type: string; size: number }> = []
      
      // Process attachments
      for (let i = 0; i < attachmentCount; i++) {
        const file = formData.get(`attachment-${i}`) as File
        const name = formData.get(`attachment-${i}-name`) as string
        const type = formData.get(`attachment-${i}-type`) as string
        const size = parseInt(formData.get(`attachment-${i}-size`) as string || '0')
        
        if (file) {
          attachments.push({ file, name, type, size })
        }
      }
      
      body = { message, context, messages, attachments }
    } else {
      // Handle JSON request (backward compatibility)
      body = await request.json()
    }

    const { message, context, messages = [], attachments = [] } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    const response = await getLLMResponse(messages, message, context || null, attachments)

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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

    switch (functionName) {
      case 'create_person_contact':
        // Validate required parameters
        if (!parameters.first_name && !parameters.last_name) {
          return { success: false, error: 'At least first name or last name is required' }
        }
        const result = await createPerson(parameters)
        return result
      default:
        return { success: false, error: `Unknown function: ${functionName}` }
    }
  } catch (error) {
    console.error('Function execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

async function getLLMResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = []
): Promise<ChatAPIResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }

    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant for a contact management application. You can help users manage their contacts by filtering, sorting, navigating, and creating new person contacts.
When users ask to create or add a new person contact, use the create_person_contact function with the provided information. Extract as much relevant information as possible from the user's request.
For other requests, provide helpful responses and suggest specific actions when appropriate.
Guidelines:
- Use the create_person_contact function when users want to add new contacts
- Extract information like name, email, phone, company, job title, location from user requests
- For filters: suggest filter actions with columnId, operator, and value
- For sorting: suggest sort actions with columnId and direction  
- For navigation: suggest navigate actions with pathname
- Always provide helpful and contextual responses.`
    
    if (context) {
      systemPrompt += `\n\n## Current Page Context:\n- Total items: ${context.totalCount}\n- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}\n- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}\n- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}`
    }

    // 2. Map history to Anthropic's format (filter out system messages)
    const anthropicHistory: Anthropic.MessageParam[] = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // 3. Construct the new user message with attachments
    const newUserContentBlocks: Anthropic.ContentBlockParam[] = [{ type: 'text', text: newUserMessage }];

    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        const arrayBuffer = await attachment.file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Validate and map media type to supported formats
        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        switch (attachment.type) {
          case 'image/jpeg':
          case 'image/jpg':
            mediaType = 'image/jpeg';
            break;
          case 'image/png':
            mediaType = 'image/png';
            break;
          case 'image/gif':
            mediaType = 'image/gif';
            break;
          case 'image/webp':
            mediaType = 'image/webp';
            break;
          default:
            // Skip unsupported image types
            newUserContentBlocks.push({
              type: 'text',
              text: `\n\nUnsupported image format: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`
            });
            continue;
        }
        
        newUserContentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        });
      } else {
          newUserContentBlocks.push({
              type: 'text',
              text: `\n\nFile attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`
          });
      }
    }
    
    const messagesForAPI: Anthropic.MessageParam[] = [
        ...anthropicHistory,
        {
            role: 'user',
            content: newUserContentBlocks
        }
    ];

    // 4. First API call
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      tools: availableFunctions,
      messages: messagesForAPI,
    });
    
    // 5. Tool use handling - handle multiple parallel tool calls
    const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

    if (toolUseBlocks.length > 0) {
        // Execute all tools in parallel
        const toolResults = await Promise.all(
            toolUseBlocks.map(async (toolUseBlock) => {
                if (toolUseBlock.type === 'tool_use') {
                    const functionResult = await executeFunctionCall(toolUseBlock.name, toolUseBlock.input as Record<string, unknown>);
                    return {
                        type: 'tool_result' as const,
                        tool_use_id: toolUseBlock.id,
                        content: functionResult.success ? JSON.stringify(functionResult.data) : functionResult.error || 'Unknown error',
                    };
                }
                return null;
            })
        );

        // Filter out any null results
        const validToolResults = toolResults.filter(result => result !== null) as Anthropic.ToolResultBlockParam[];

        // Append assistant's response to messages
        messagesForAPI.push({ role: 'assistant', content: response.content });
        
        // Append ALL tool results to messages in a single user message
        messagesForAPI.push({
            role: 'user',
            content: validToolResults
        });

        // 6. Second API call
        const followUpResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            tools: availableFunctions,
            messages: messagesForAPI, // <-- send the updated history
        });
        
        const followUpContent = followUpResponse.content[0]?.type === 'text' 
          ? followUpResponse.content[0].text 
          : ''

        // Get the first successful result for legacy response format
        const firstSuccessfulResult = toolResults.find(result => 
            result && result.content !== 'Unknown error'
        );

        return {
          message: followUpContent || 'Tools executed successfully!',
          functionResult: firstSuccessfulResult ? { success: true, data: firstSuccessfulResult.content } : { success: false, error: 'All tools failed' },
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