import type { Anthropic } from '@anthropic-ai/sdk'
import { createPersonContactTool, executeCreatePersonContact } from './create-person'
import { searchPersonsTool, executeSearchPersons } from './search-persons'
import { createMeetingTool, executeCreateMeeting } from './create-meeting'
import { searchMeetingsTool, executeSearchMeetings } from './search-meetings'
import { updatePersonTool, executeUpdatePersonContact } from './update-person'
import { updateMeetingTool, executeUpdateMeeting } from './update-meeting'

// Export all tool definitions
export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  searchPersonsTool,
  createMeetingTool,
  searchMeetingsTool,
  updatePersonTool,
  updateMeetingTool
]

// Export all execution functions
export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
  search_meetings: executeSearchMeetings,
  update_person_contact: executeUpdatePersonContact,
  update_meeting: executeUpdateMeeting
}

// Re-export individual tools for direct access
export { 
  createPersonContactTool, 
  executeCreatePersonContact, 
  searchPersonsTool, 
  executeSearchPersons, 
  createMeetingTool, 
  executeCreateMeeting, 
  searchMeetingsTool, 
  executeSearchMeetings,
  updatePersonTool,
  executeUpdatePersonContact,
  updateMeetingTool,
  executeUpdateMeeting
}
