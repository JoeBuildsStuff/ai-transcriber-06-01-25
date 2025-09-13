import { NextRequest, NextResponse } from 'next/server'
import type { ChatMessage, PageContext } from '@/types/chat'
import Cerebras from '@cerebras/cerebras_cloud_sdk'
import { availableTools, toolExecutors } from '../tools'

// Initialize Cerebras client
const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY || '',
})

interface CerebrasAPIRequest {
  message: string
  context?: PageContext | null
  messages?: ChatMessage[]
  model?: string
  reasoning_effort?: 'low' | 'medium' | 'high'
  stream?: boolean
  max_completion_tokens?: number
  temperature?: number
  top_p?: number
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

interface CerebrasAPIResponse {
  message: string
  stream?: ReadableStream
  rawResponse?: unknown
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
}

// Cerebras response type interfaces
interface CerebrasStreamingChunk {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

interface CerebrasResponse {
  choices?: Array<{
    message?: {
      content?: string
      tool_calls?: Array<{
        id: string
        function: {
          name: string
          arguments: string
        }
      }>
    }
  }>
}



// Convert Anthropic tool format to Cerebras tool format
function convertToolsToCerebrasFormat(tools: Array<{ name: string; description?: string; input_schema: Record<string, unknown> }>) {
  return tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || `Tool for ${tool.name}`,
      parameters: tool.input_schema
    }
  }))
}

// Execute function calls for Cerebras
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

export async function POST(request: NextRequest): Promise<NextResponse<CerebrasAPIResponse>> {
  try {
    let body: CerebrasAPIRequest

    // Check if the request is multipart/form-data (file upload)
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const message = formData.get('message') as string
      const contextStr = formData.get('context') as string
      const messagesStr = formData.get('messages') as string
      const model = formData.get('model') as string
      const reasoningEffort = formData.get('reasoning_effort') as 'low' | 'medium' | 'high'
      const stream = formData.get('stream') === 'true'
      const maxCompletionTokens = parseInt(formData.get('max_completion_tokens') as string || '65536')
      const temperature = parseFloat(formData.get('temperature') as string || '1')
      const topP = parseFloat(formData.get('top_p') as string || '1')
      const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0')
      const clientTz = (formData.get('client_tz') as string) || ''
      const clientOffset = (formData.get('client_utc_offset') as string) || ''
      const clientNowIso = (formData.get('client_now_iso') as string) || ''
      
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
      
      body = { 
        message, 
        context, 
        messages, 
        model, 
        reasoning_effort: reasoningEffort,
        stream,
        max_completion_tokens: maxCompletionTokens,
        temperature,
        top_p: topP,
        attachments,
        clientTz,
        clientOffset,
        clientNowIso 
      }
    } else {
      // Handle JSON request
      body = await request.json()
    }

    const { 
      message, 
      context, 
      messages = [], 
      model = 'gpt-oss-120b',
      reasoning_effort = 'low',
      stream = false,
      max_completion_tokens = 65536,
      temperature = 1,
      top_p = 1,
      attachments = [],
      clientTz = '',
      clientOffset = '',
      clientNowIso = '' 
    } = body

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { message: 'Invalid message content' },
        { status: 400 }
      )
    }

    if (!process.env.CEREBRAS_API_KEY) {
      return NextResponse.json(
        { message: 'Cerebras API key is not configured' },
        { status: 500 }
      )
    }

    const response = await getCerebrasResponse(
      messages, 
      message, 
      context || null, 
      attachments, 
      model,
      reasoning_effort,
      stream,
      max_completion_tokens,
      temperature,
      top_p,
      clientTz,
      clientOffset,
      clientNowIso
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('Cerebras API error:', error)
    
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('CEREBRAS_API_KEY')) {
        return NextResponse.json(
          { message: 'Cerebras service is not configured. Please check the API key.' },
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

async function getCerebrasResponse(
  history: ChatMessage[],
  newUserMessage: string,
  context: PageContext | null,
  attachments: Array<{ file: File; name: string; type: string; size: number }> = [],
  model: string = 'gpt-oss-120b',
  reasoning_effort: 'low' | 'medium' | 'high' = 'low',
  stream: boolean = false,
  max_completion_tokens: number = 65536,
  temperature: number = 1,
  top_p: number = 1,
  clientTz: string = '',
  clientOffset: string = '',
  clientNowIso: string = ''
): Promise<CerebrasAPIResponse> {
  try {
    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant for a contact and meeting management application. You can help users manage their contacts and meetings by filtering, sorting, navigating, creating new person contacts, creating new meetings, and searching for existing meetings.

Guidelines:
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

When users ask to create or add a new person contact, use the create_person_contact function with the provided information. Extract as much relevant information as possible from the user's request.
When users ask to update an existing person contact, use the update_person_contact function with the contact ID and the fields to update.
When users ask to create a new meeting, use the create_meeting function. This creates a meeting that can be populated with audio files, notes, and other details later.
When users ask to update an existing meeting, use the update_meeting function with the meeting ID and the fields to update (title, date/time, location, reviewed status, summary).
When users ask about meetings they have had with specific people or during specific time periods, use the search_meetings function to find relevant meetings.

Guidelines:
- Use the create_person_contact function when users want to add new contacts
- Use the update_person_contact function when users want to modify existing contacts (e.g., "update Joe Smith's email to joe.smith@newcompany.com")
- Use the create_meeting function when users want to create a new meeting
- Use the update_meeting function when users want to modify existing meetings
- Use the search_meetings function when users ask about existing meetings (e.g., "what meetings have I had with Joe Taylor in the past week?")
- Use the search_persons function when users want to find existing contacts

if a tool responds with a url to the record, please include the url in the response for quick navigation for the user. use markdown to format the url.`

    // Provide user locale/timezone context to the model
    if (clientTz || clientOffset || clientNowIso) {
      systemPrompt += `\n\nUser Locale Context:\n- Timezone: ${clientTz || 'unknown'}\n- UTC offset (at request): ${clientOffset || 'unknown'}\n- Local time at request: ${clientNowIso || 'unknown'}`
    }
    
    if (context) {
      systemPrompt += `\n\n## Current Page Context:\n- Total items: ${context.totalCount}\n- Current filters: ${JSON.stringify(context.currentFilters, null, 2)}\n- Current sorting: ${JSON.stringify(context.currentSort, null, 2)}\n- Visible data sample: ${JSON.stringify(context.visibleData.slice(0, 3), null, 2)}`
    }

    // 2. Convert tools to Cerebras format
    const cerebrasTools = convertToolsToCerebrasFormat(availableTools)

    // 3. Map history to Cerebras format (filter out system messages)
    type CerebrasMessage = 
      | { role: 'system'; content: string }
      | { role: 'user'; content: string }
      | { role: 'assistant'; content: string; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }
      | { role: 'tool'; content: string; tool_call_id: string };

    const cerebrasHistory: CerebrasMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history - only include user messages and final assistant responses
    // Tool calls and their results should be handled in the current conversation flow, not from history
    history
      .filter(msg => msg.role !== 'system')
      .forEach(msg => {
        if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
          // Skip assistant messages with tool calls from history
          // These will be handled in the current conversation flow
          return;
        } else {
          cerebrasHistory.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      });

    // 4. Construct the new user message with attachments
    let userContent = newUserMessage;

    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        const arrayBuffer = await attachment.file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        // Add image description to the message
        userContent += `\n\nImage attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})\nBase64 data: ${base64}`;
      } else {
        userContent += `\n\nFile attachment: ${attachment.name} (${attachment.type}, ${formatFileSize(attachment.size)})`;
      }
    }

    // Add the new user message
    cerebrasHistory.push({
      role: 'user',
      content: userContent
    });

    // 5. Multi-turn tool calling with maximum of 5 iterations
    let maxIterations = 5;
    const currentMessages = [...cerebrasHistory];
    let finalResponse = null;
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
      // 6. Make the API call
      if (stream) {
        // Handle streaming response (simplified - no tool calls in streaming mode)
        const streamResponse = await cerebras.chat.completions.create({
          messages: currentMessages,
          model: model,
          stream: true,
          max_completion_tokens: max_completion_tokens,
          temperature: temperature,
          top_p: top_p,
          reasoning_effort: reasoning_effort
        });

        // Create a ReadableStream for the response
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              // Handle streaming response properly
              if (Symbol.asyncIterator in streamResponse) {
                for await (const chunk of streamResponse) {
                  // Type assertion for Cerebras streaming response
                  const typedChunk = chunk as CerebrasStreamingChunk;
                  const content = typedChunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return {
          message: 'Streaming response initiated',
          stream: readableStream,
          rawResponse: streamResponse
        };
      } else {
        // Handle non-streaming response with tool calling
        const response = await cerebras.chat.completions.create({
          messages: currentMessages,
          model: model,
          stream: false,
          max_completion_tokens: max_completion_tokens,
          temperature: temperature,
          top_p: top_p,
          reasoning_effort: reasoning_effort,
          tools: cerebrasTools,
          // parallel_tool_calls: false // Disable parallel tool calls for compatibility
        });

        // Type assertion for Cerebras response
        const typedResponse = response as CerebrasResponse;
        const message = typedResponse.choices?.[0]?.message;
        
        if (!message) {
          throw new Error('No message in response');
        }

        // Check for tool calls
        if (message.tool_calls && message.tool_calls.length > 0) {
          // Save the assistant's message exactly as returned (including tool_calls)
          currentMessages.push({
            role: 'assistant',
            content: message.content || '',
            tool_calls: message.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: tc.function
            }))
          });

          // Execute all tools in parallel
          const toolResults = await Promise.all(
            message.tool_calls.map(async (toolCall) => {
              const baseArgs = JSON.parse(toolCall.function.arguments);
              const augmentedArgs = {
                ...baseArgs,
                client_tz: clientTz,
                client_utc_offset: clientOffset,
                client_now_iso: clientNowIso,
              };
              const functionResult = await executeFunctionCall(
                toolCall.function.name, 
                augmentedArgs
              );
              
              // Store tool call information
              allToolCalls.push({
                id: toolCall.id,
                name: toolCall.function.name,
                arguments: augmentedArgs,
                result: functionResult
              });
              
              return {
                role: 'tool' as const,
                content: functionResult.success ? JSON.stringify(functionResult.data) : functionResult.error || 'Unknown error',
                tool_call_id: toolCall.id
              };
            })
          );
          
          // Append tool results to messages
          currentMessages.push(...toolResults);

          maxIterations--;
        } else {
          // No more tools to execute, this is our final response
          finalResponse = response;
          break;
        }
      }
    }

    // Handle the final response
    if (finalResponse) {
      const typedResponse = finalResponse as CerebrasResponse;
      const content = typedResponse.choices?.[0]?.message?.content || 'No response generated';

      return {
        message: content,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        rawResponse: finalResponse
      };
    }

    // Fallback response if no tools were executed
    return {
      message: 'I apologize, but I encountered an error processing your request. Please try again.',
    }
  } catch (error) {
    console.error('Cerebras API error:', error)
    throw new Error('Failed to get response from Cerebras API')
  }
}
