import type { Anthropic } from '@anthropic-ai/sdk'
import { createPersonContactTool, executeCreatePersonContact } from './create-person'
import { searchPersonsTool, executeSearchPersons } from './search-persons'
import { createMeetingTool, executeCreateMeeting } from './create-meeting'

// Export all tool definitions
export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  searchPersonsTool,
  createMeetingTool
]

// Export all execution functions
export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting
}

// Re-export individual tools for direct access
export { createPersonContactTool, executeCreatePersonContact, searchPersonsTool, executeSearchPersons, createMeetingTool, executeCreateMeeting }
