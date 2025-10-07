import type { Anthropic } from '@anthropic-ai/sdk'
import { createPersonContactTool, executeCreatePersonContact } from './create-person'
import { updatePersonTool, executeUpdatePersonContact } from './update-person'
import { deletePersonTool, executeDeletePersonContact } from './delete-person'
import { searchPersonsTool, executeSearchPersons } from './search-persons'
import { createMeetingTool, executeCreateMeeting } from './create-meeting'
import { updateMeetingTool, executeUpdateMeeting } from './update-meeting'
import { deleteMeetingTool, executeDeleteMeeting } from './delete-meeting'
import { searchMeetingsTool, executeSearchMeetings } from './search-meetings'
import { getMeetingOutlineTool, executeGetMeetingOutline } from './get-meeting-outline'
import { createTaskTool, executeCreateTask } from './create-task'
import { updateTaskTool, executeUpdateTask } from './update-task'
import { deleteTaskTool, executeDeleteTask } from './delete-task'
import { searchTasksTool, executeSearchTasks } from './search-tasks'

// Export all tool definitions
export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  updatePersonTool,
  deletePersonTool,
  searchPersonsTool,
  createMeetingTool,
  updateMeetingTool,
  deleteMeetingTool,
  searchMeetingsTool,
  getMeetingOutlineTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  searchTasksTool
]

// Export all execution functions
export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  update_person_contact: executeUpdatePersonContact,
  delete_person_contact: executeDeletePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
  update_meeting: executeUpdateMeeting,
  delete_meeting: executeDeleteMeeting,
  search_meetings: executeSearchMeetings,
  get_meeting_outline: executeGetMeetingOutline,
  create_task: executeCreateTask,
  update_task: executeUpdateTask,
  delete_task: executeDeleteTask,
  search_tasks: executeSearchTasks
}

// Re-export individual tools for direct access
export { 
  createPersonContactTool, 
  executeCreatePersonContact, 
  updatePersonTool,
  executeUpdatePersonContact,
  deletePersonTool,
  executeDeletePersonContact,
  searchPersonsTool, 
  executeSearchPersons, 
  createMeetingTool, 
  executeCreateMeeting, 
  updateMeetingTool,
  executeUpdateMeeting,
  deleteMeetingTool,
  executeDeleteMeeting,
  searchMeetingsTool, 
  executeSearchMeetings,
  getMeetingOutlineTool,
  executeGetMeetingOutline,
  createTaskTool,
  executeCreateTask,
  updateTaskTool,
  executeUpdateTask,
  deleteTaskTool,
  executeDeleteTask,
  searchTasksTool,
  executeSearchTasks
}
