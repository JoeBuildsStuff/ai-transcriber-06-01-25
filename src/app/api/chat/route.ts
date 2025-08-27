import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, PageContext } from '@/types/chat'
import Anthropic from '@anthropic-ai/sdk'
import { availableTools, toolExecutors } from './tools'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface ChatAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string
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
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, unknown>
    result?: {
      success: boolean
      data?: unknown
      error?: string
    }
  }>
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
      const model = formData.get('model') as string
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
      
      body = { message, context, messages, model, attachments }
    } else {
      // Handle JSON request (backward compatibility)
      body = await request.json()
    }

    const { message, context, messages = [], model, attachments = [] } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    const response = await getLLMResponse(messages, message, context || null, attachments, model)

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

// Use imported tool definitions
const availableFunctions = availableTools

async function executeFunctionCall(functionName: string, parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const executor = toolExecutors[functionName]
    if (!executor) {
      return { success: false, error: `Unknown function: ${functionName}` }
    }
    
    return await executor(parameters)
  } catch (error) {
    console.error('Function execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

async function getLLMResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = [],
  model?: string
): Promise<ChatAPIResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }

    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant for a contact and meeting management application. You can help users manage their contacts and meetings by filtering, sorting, navigating, creating new person contacts, creating new meetings, and searching for existing meetings.
When users ask to create or add a new person contact, use the create_person_contact function with the provided information. Extract as much relevant information as possible from the user's request.
When users ask to create a new meeting, use the create_meeting function. This creates a meeting that can be populated with audio files, notes, and other details later.
When users ask about meetings they have had with specific people or during specific time periods, use the search_meetings function to find relevant meetings.

Guidelines:
- Use the create_person_contact function when users want to add new contacts
- Use the create_meeting function when users want to create a new meeting
- Use the search_meetings function when users ask about existing meetings (e.g., "what meetings have I had with Joe Taylor in the past week?")
- Extract information like name, email, phone, company, job title, location from user requests for contacts
- Extract information like title, meeting date/time, location, description from user requests for meetings
- For meeting searches, extract participant names, date ranges, and titles from user queries

Meeting Creation Guidelines:
- When processing meeting invitations or calendar events from images:
  - Extract the meeting title from the title field
  - Extract the meeting date and time, converting to ISO format WITH timezone information. If the invitation shows a specific timezone (like "Pacific Time"), convert the time to that timezone's ISO format (e.g., "2025-08-26T09:30:00-07:00" for Pacific Time). If no timezone is specified, assume the user's local timezone.
  - Extract the location (including Zoom Meeting IDs, room numbers, addresses, etc.)
  - Extract the meeting description/body content - this should include the actual meeting content, personal messages, agenda items, or notes that appear in the meeting body/description area, not just logistical details
  - For recurring meetings, include recurrence information in the description
  - Include any personal messages, agenda items, or meeting notes from the invitation body

if a tool responds with a url to the record, please include the url in the response for quick navigation for the user.  use markdown to format the url.`
    
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

    // 4. Iterative tool calling with maximum of 5 iterations
    let maxIterations = 5;
    const currentMessages = [...messagesForAPI];
    let finalResponse = null;
    const allToolResults: Array<{ success: boolean; data?: unknown; error?: string }> = [];
    const allToolCalls: Array<{
      id: string
      name: string
      arguments: Record<string, unknown>
      result?: {
        success: boolean
        data?: unknown
        error?: string
      }
    }> = [];

    while (maxIterations > 0) {
      const response = await anthropic.messages.create({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: availableFunctions,
        messages: currentMessages,
      });

      // Check for tool use blocks
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        // No more tools to execute, this is our final response
        finalResponse = response;
        break;
      }

      // Execute all tools in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUseBlock) => {
          if (toolUseBlock.type === 'tool_use') {
            const functionResult = await executeFunctionCall(toolUseBlock.name, toolUseBlock.input as Record<string, unknown>);
            allToolResults.push(functionResult);
            
            // Store tool call information
            allToolCalls.push({
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              arguments: toolUseBlock.input as Record<string, unknown>,
              result: functionResult
            });
            
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
      currentMessages.push({ role: 'assistant', content: response.content });
      
      // Append tool results to messages
      currentMessages.push({
        role: 'user',
        content: validToolResults
      });

      maxIterations--;
    }

    // Handle the final response
    if (finalResponse) {
      const content = finalResponse.content[0]?.type === 'text' 
        ? finalResponse.content[0].text 
        : ''

      // Get the first successful result for legacy response format
      const firstSuccessfulResult = allToolResults.find(result => result.success);

      return {
        message: content || 'Tools executed successfully!',
        functionResult: firstSuccessfulResult ? { success: true, data: firstSuccessfulResult.data } : { success: false, error: 'All tools failed' },
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        actions: []
      }
    }

    // Fallback response if no tools were executed
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      actions: []
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    throw new Error('Failed to get response from Anthropic API')
  }
} 