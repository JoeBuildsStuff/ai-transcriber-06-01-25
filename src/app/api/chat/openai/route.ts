import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatMessage, PageContext } from '@/types/chat'
import { availableTools, toolExecutors } from '../tools'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

interface OpenAIAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string
  reasoningEffort?: 'low' | 'medium' | 'high'
  attachments?: Array<{
    file: File
    name: string
    type: string
    size: number
  }>
  clientTz?: string
  clientOffset?: string
  clientNowIso?: string
}

interface OpenAIAPIResponse {
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
  citations?: Array<{
    url: string
    title: string
    cited_text: string
  }>
  rawResponse?: unknown
}

export async function POST(request: NextRequest): Promise<NextResponse<OpenAIAPIResponse>> {
  try {
    let body: OpenAIAPIRequest

    // Check if the request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const message = formData.get('message') as string
      const contextStr = formData.get('context') as string
      const messagesStr = formData.get('messages') as string
      const model = formData.get('model') as string
      const reasoningEffort = formData.get('reasoning_effort') as 'low' | 'medium' | 'high'
      const clientTz = (formData.get('client_tz') as string) || ''
      const clientOffset = (formData.get('client_utc_offset') as string) || ''
      const clientNowIso = (formData.get('client_now_iso') as string) || ''
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
      
      body = { message, context, messages, model, reasoningEffort, attachments, clientTz, clientOffset, clientNowIso } as unknown as OpenAIAPIRequest
    } else {
      // Handle JSON request (backward compatibility)
      body = await request.json()
    }

    const { message, context, messages = [], model, attachments = [], clientTz = '', clientOffset = '', clientNowIso = '' } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { message: 'OpenAI API key is not configured' },
        { status: 500 }
      )
    }

    const response = await getOpenAIResponse(messages, message, context || null, attachments, model, clientTz, clientOffset, clientNowIso)

    return NextResponse.json(response)
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
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

// Convert Anthropic tools to OpenAI function format
function convertToolsToOpenAI() {
  return availableTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema
    }
  }))
}

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

async function getOpenAIResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = [],
  model?: string,
  clientTz: string = '',
  clientOffset: string = '',
  clientNowIso: string = ''
): Promise<OpenAIAPIResponse> {
  try {
    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant for a contact and meeting management application. You can help users manage their contacts and meetings by filtering, sorting, navigating, creating new person contacts, creating new meetings, and searching for existing meetings.
When users ask to create or add a new person contact, use the create_person_contact function with the provided information. Extract as much relevant information as possible from the user's request.
When users ask to update an existing person contact, use the update_person_contact function with the contact ID and the fields to update.
When users ask to create a new meeting, use the create_meeting function. This creates a meeting that can be populated with audio files, notes, and other details later.
When users ask about meetings they have had with specific people or during specific time periods, use the search_meetings function to find relevant meetings.

Guidelines:
- Use the create_person_contact function when users want to add new contacts
- Use the update_person_contact function when users want to modify existing contacts (e.g., "update Joe Smith's email to joe.smith@newcompany.com")
- Use the create_meeting function when users want to create a new meeting
- Use the search_meetings function when users ask about existing meetings (e.g., "what meetings have I had with Joe Taylor in the past week?")
- Extract information like name, email, phone, company, job title, location from user requests for contacts
- Extract information like title, meeting date/time, location, description from user requests for meetings
- For meeting searches, extract participant names, date ranges, and titles from user queries

Image Processing Capabilities:
- You can analyze and understand images that users upload
- When processing meeting invitations, business cards, or other documents from images, extract all relevant information
- For business cards, extract contact information like name, title, company, email, phone, address
- For meeting invitations or calendar screenshots, extract meeting details like title, date/time, location, participants, agenda

Meeting Creation Guidelines:
- When processing meeting invitations or calendar events from images:
  - Extract the meeting title from the title field
  - Extract the meeting date and time, converting to ISO format WITH timezone information. If the invitation shows a specific timezone (like "Pacific Time"), convert the time to that timezone's ISO format (e.g., "2025-08-26T09:30:00-07:00" for Pacific Time). If no timezone is specified, assume the user's local timezone.
  - Extract the location (including Zoom Meeting IDs, room numbers, addresses, etc.)
  - Extract the meeting description/body content - this should include the actual meeting content, personal messages, agenda items, or notes that appear in the meeting body/description area, not just logistical details
  - For recurring meetings, include recurrence information in the description
  - Include any personal messages, agenda items, or meeting notes from the invitation body

if a tool responds with a url to the record, please include the url in the response for quick navigation for the user. use markdown to format the url.`
    
    // Provide user locale/timezone context to the model
    if (clientTz || clientOffset || clientNowIso) {
      systemPrompt += `\n\nUser Locale Context:\n- Timezone: ${clientTz || 'unknown'}\n- UTC offset (at request): ${clientOffset || 'unknown'}\n- Local time at request: ${clientNowIso || 'unknown'}`
    }
    
    if (context) {
      systemPrompt += `\n\n## Current Page Context:\n- Total items: ${context.totalCount}\n- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}\n- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}\n- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}`
    }

    // 2. Map history to OpenAI's format (filter out system messages)
    const openaiHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // 3. Construct the new user message with attachments
    const newUserContent: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'user',
      content: newUserMessage
    };

    // Process attachments - OpenAI supports images via base64 data URLs
    if (attachments.length > 0) {
      const contentBlocks: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: 'text', text: newUserMessage }
      ];

      for (const attachment of attachments) {
        if (attachment.type.startsWith('image/')) {
          // Convert image to base64 data URL
          const arrayBuffer = await attachment.file.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${attachment.type};base64,${base64}`;
          
          contentBlocks.push({
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'auto' // Let the model decide detail level
            }
          });
        } else {
          // Non-image files as text description
          contentBlocks.push({
            type: 'text',
            text: `\n\nFile attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`
          });
        }
      }

      newUserContent.content = contentBlocks;
    }
    
    const messagesForAPI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...openaiHistory,
        newUserContent
    ];

    // 4. Prepare tools
    const tools = convertToolsToOpenAI();

    // 5. Iterative tool calling with maximum of 5 iterations
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
      const response = await openai.chat.completions.create({
        model: model || 'gpt-5',
        messages: currentMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        // max_completion_tokens: 2048,
      });

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) {
        break;
      }

      // Check for tool calls
      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No more tools to execute, this is our final response
        finalResponse = response;
        break;
      }

      // Execute all tools in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          // Parse arguments if they're a string, otherwise use as-is
          let parsedArgs: Record<string, unknown>;
          if (typeof toolCall.function.arguments === 'string') {
            try {
              parsedArgs = JSON.parse(toolCall.function.arguments);
            } catch (error) {
              console.error('Failed to parse tool arguments:', error);
              parsedArgs = {};
            }
          } else {
            parsedArgs = toolCall.function.arguments as Record<string, unknown>;
          }
          
          const augmentedArgs = {
            ...parsedArgs,
            client_tz: clientTz,
            client_utc_offset: clientOffset,
            client_now_iso: clientNowIso,
          };
          const functionResult = await executeFunctionCall(toolCall.function.name, augmentedArgs);
          allToolResults.push(functionResult);
          
          // Store tool call information
          allToolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: augmentedArgs,
            result: functionResult
          });
          
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: functionResult.success ? JSON.stringify(functionResult.data) : functionResult.error || 'Unknown error',
          };
        })
      );

      // Append assistant's response to messages
      currentMessages.push(assistantMessage);
      
      // Append tool results to messages
      currentMessages.push(...toolResults);

      maxIterations--;
    }

    // Handle the final response
    if (finalResponse) {
      const assistantMessage = finalResponse.choices[0]?.message;
      const content = assistantMessage?.content || 'No response generated';

      // Get the first successful result for legacy response format
      const firstSuccessfulResult = allToolResults.find(result => result.success);

      return {
        message: content,
        functionResult: firstSuccessfulResult ? { success: true, data: firstSuccessfulResult.data } : { success: false, error: 'All tools failed' },
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        citations: [], // OpenAI doesn't provide citations like Anthropic
        actions: [],
        rawResponse: finalResponse
      }
    }

    // Fallback response if no tools were executed
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
      actions: []
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to get response from OpenAI API')
  }
}
