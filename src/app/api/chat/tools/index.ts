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
import { createNoteTool, executeCreateNote } from './create-note'
import { getNoteTool, executeGetNote } from './get-note'
import { updateNoteTool, executeUpdateNote } from './update-note'
import { deleteNoteTool, executeDeleteNote } from './delete-note'
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
  createNoteTool,
  getNoteTool,
  updateNoteTool,
  deleteNoteTool,
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
  create_note: executeCreateNote,
  get_note: executeGetNote,
  update_note: executeUpdateNote,
  delete_note: executeDeleteNote,
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
  createNoteTool,
  executeCreateNote,
  getNoteTool,
  executeGetNote,
  updateNoteTool,
  executeUpdateNote,
  deleteNoteTool,
  executeDeleteNote,
  createTaskTool,
  executeCreateTask,
  updateTaskTool,
  executeUpdateTask,
  deleteTaskTool,
  executeDeleteTask,
  searchTasksTool,
  executeSearchTasks
}
