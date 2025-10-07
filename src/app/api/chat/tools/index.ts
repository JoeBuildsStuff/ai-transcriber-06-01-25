import type { Anthropic } from '@anthropic-ai/sdk'
import { createPersonContactTool, executeCreatePersonContact } from './create-person'
import { searchPersonsTool, executeSearchPersons } from './search-persons'
import { createMeetingTool, executeCreateMeeting } from './create-meeting'
import { searchMeetingsTool, executeSearchMeetings } from './search-meetings'
import { updatePersonTool, executeUpdatePersonContact } from './update-person'
import { updateMeetingTool, executeUpdateMeeting } from './update-meeting'
import { getMeetingOutlineTool, executeGetMeetingOutline } from './get-meeting-outline'
import { createTaskTool, executeCreateTask } from './create-task'
import { updateTaskTool, executeUpdateTask } from './update-task'
import { searchTasksTool, executeSearchTasks } from './search-tasks'

// Export all tool definitions
export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  searchPersonsTool,
  createMeetingTool,
  searchMeetingsTool,
  updatePersonTool,
  updateMeetingTool,
  getMeetingOutlineTool,
  createTaskTool,
  updateTaskTool,
  searchTasksTool
]

// Export all execution functions
export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
  search_meetings: executeSearchMeetings,
  update_person_contact: executeUpdatePersonContact,
  update_meeting: executeUpdateMeeting,
  get_meeting_outline: executeGetMeetingOutline,
  create_task: executeCreateTask,
  update_task: executeUpdateTask,
  search_tasks: executeSearchTasks
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
  executeUpdateMeeting,
  getMeetingOutlineTool,
  executeGetMeetingOutline,
  createTaskTool,
  executeCreateTask,
  updateTaskTool,
  executeUpdateTask,
  searchTasksTool,
  executeSearchTasks
}
