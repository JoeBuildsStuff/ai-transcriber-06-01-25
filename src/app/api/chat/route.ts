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
  clientTz?: string
  clientOffset?: string
  clientNowIso?: string
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
  citations?: Array<{
    url: string
    title: string
    cited_text: string
  }>
  rawResponse?: unknown
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
      // Client locale/timezone hints
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
      
      body = { message, context, messages, model, attachments, clientTz, clientOffset, clientNowIso } as unknown as ChatAPIRequest
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

    const response = await getLLMResponse(messages, message, context || null, attachments, model, clientTz, clientOffset, clientNowIso)

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
  model?: string,
  clientTz: string = '',
  clientOffset: string = '',
  clientNowIso: string = ''
): Promise<ChatAPIResponse> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }

    // Web search is always enabled
    
    // 1. System Prompt
    let systemPrompt = `You are a helpful assistant for a contact and meeting management application. You can help users manage their contacts and meetings by filtering, sorting, navigating, creating new person contacts, creating new meetings, and searching for existing meetings.
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
- Extract information like name, email, phone, company, job title, location from user requests for contacts
- Extract information like title, meeting date/time, location, description from user requests for meetings
- For meeting searches, extract participant names, date ranges, and titles from user queries

Web Search Capabilities:
- You have access to real-time web search for up-to-date information about companies, people, news, and business topics
- Use web search when users ask about current information not in your knowledge base (company news, recent events, stock prices, etc.)
- When researching companies or people for contact creation, web search can provide additional context like company size, recent news, or professional background
- Always cite sources from web search results in your responses
- Focus on business and professional sources for reliable information
Meeting Creation Guidelines:
- When processing meeting invitations or calendar events from images:
  - Extract the meeting title from the title field
  - Extract the meeting date and time, converting to ISO format WITH timezone information. If the invitation shows a specific timezone (like "Pacific Time"), convert the time to that timezone's ISO format (e.g., "2025-08-26T09:30:00-07:00" for Pacific Time). If no timezone is specified, assume the user's local timezone.
  - Extract the location (including Zoom Meeting IDs, room numbers, addresses, etc.)
  - Extract the meeting description/body content - this should include the actual meeting content, personal messages, agenda items, or notes that appear in the meeting body/description area, not just logistical details
  - For recurring meetings, include recurrence information in the description
  - Include any personal messages, agenda items, or meeting notes from the invitation body

if a tool responds with a url to the record, please include the url in the response for quick navigation for the user.  use markdown to format the url.`
    
    // Provide user locale/timezone context to the model
    if (clientTz || clientOffset || clientNowIso) {
      systemPrompt += `\n\nUser Locale Context:\n- Timezone: ${clientTz || 'unknown'}\n- UTC offset (at request): ${clientOffset || 'unknown'}\n- Local time at request: ${clientNowIso || 'unknown'}`
    }
    
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

    // 4. Prepare tools (custom tools + web search)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [...availableFunctions];
    
    // Add web search tool (always enabled)
    tools.push({
      type: "web_search_20250305",
      name: "web_search",
      max_uses: parseInt(process.env.WEB_SEARCH_MAX_USES || '5'),
      // Add domain filtering for business/professional sources
      // allowed_domains: [
      //   "linkedin.com", "crunchbase.com", "bloomberg.com", 
      //   "reuters.com", "techcrunch.com", "sec.gov", "nasdaq.com"
      // ]
    });

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
      const response = await anthropic.messages.create({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools: tools,
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
            const augmentedInput = {
              ...(toolUseBlock.input as Record<string, unknown>),
              client_tz: clientTz,
              client_utc_offset: clientOffset,
              client_now_iso: clientNowIso,
            };
            const functionResult = await executeFunctionCall(toolUseBlock.name, augmentedInput);
            allToolResults.push(functionResult);
            
            // Store tool call information
            allToolCalls.push({
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              arguments: augmentedInput,
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

      // Extract web search tool calls from the final response
      const webSearchToolCalls: Array<{
        id: string
        name: string
        arguments: Record<string, unknown>
        result?: {
          success: boolean
          data?: unknown
          error?: string
        }
      }> = [];

      // Find server_tool_use blocks (web search queries)
      const serverToolUseBlocks = finalResponse.content.filter(block => block.type === 'server_tool_use');
      const webSearchResultBlocks = finalResponse.content.filter(block => block.type === 'web_search_tool_result');

      // Match tool uses with their results
      serverToolUseBlocks.forEach(toolUse => {
        if (toolUse.name === 'web_search') {
          const correspondingResult = webSearchResultBlocks.find(result => result.tool_use_id === toolUse.id);
          
          webSearchToolCalls.push({
            id: toolUse.id,
            name: toolUse.name,
            arguments: (toolUse.input as Record<string, unknown>) || {},
            result: correspondingResult ? {
              success: true,
              data: correspondingResult.content || []
            } : undefined
          });
        }
      });

      // Add web search tool calls to the existing allToolCalls array
      allToolCalls.push(...webSearchToolCalls);
      
      // Process all content blocks to build the complete response with inline citations
      let fullContent = '';
      const citations: Array<{url: string, title: string, cited_text: string}> = [];
      let citationCounter = 1;
      
      const textBlocks = finalResponse.content.filter(block => block.type === 'text');
      
      if (textBlocks.length > 0) {
        // Process each text block and add inline citations
        fullContent = textBlocks.map(block => {
          let blockText = block.text;
          
          // If this block has citations, add them to our citations array and append citation numbers
          if (block.citations && Array.isArray(block.citations)) {
            const blockCitations: number[] = [];
            
            block.citations.forEach(citation => {
              if (citation.type === 'web_search_result_location') {
                citations.push({
                  url: citation.url || '',
                  title: citation.title || '',
                  cited_text: citation.cited_text || ''
                });
                blockCitations.push(citationCounter);
                citationCounter++;
              }
            });
            
            // Add citation numbers at the end of the text block if it has citations
            if (blockCitations.length > 0) {
              const citationNumbers = blockCitations.map(num => `[${num}]`).join('');
              blockText += citationNumbers;
            }
          }
          
          return blockText;
        }).join('');
      } else {
        // Fallback: look for any content that can be converted to text
        const hasToolUse = finalResponse.content.some(block => 
          block.type === 'server_tool_use' || block.type === 'web_search_tool_result'
        );
        fullContent = hasToolUse ? 'I executed a search to help answer your question.' : '';
      }

      // Get the first successful result for legacy response format
      const firstSuccessfulResult = allToolResults.find(result => result.success);

      return {
        message: fullContent || 'Tools executed successfully!',
        functionResult: firstSuccessfulResult ? { success: true, data: firstSuccessfulResult.data } : { success: false, error: 'All tools failed' },
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        citations: citations.length > 0 ? citations : undefined,
        actions: [],
        rawResponse: finalResponse // Include the raw response for debugging/future use
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
