# Chat API Tools

This directory contains the tool definitions and execution logic for the chat API. Tools are functions that the AI can call to perform specific actions.

## Structure

- `index.ts` - Exports all tools and executors
- `create-person.ts` - Tool for creating person contacts
- `update-person.ts` - Tool for updating existing person contacts
- `delete-person.ts` - Tool for deleting person contacts
- `search-persons.ts` - Tool for searching person contacts
- `create-meeting.ts` - Tool for creating new meetings
- `update-meeting.ts` - Tool for updating existing meetings
- `delete-meeting.ts` - Tool for deleting meetings
- `search-meetings.ts` - Tool for searching existing meetings
- `create-note.ts` - Tool for creating notes with optional associations
- `get-note.ts` - Tool for retrieving a single note with associations
- `update-note.ts` - Tool for updating note content and associations
- `delete-note.ts` - Tool for deleting notes
- `create-task.ts` - Tool for creating new tasks with optional associations
- `update-task.ts` - Tool for updating existing tasks
- `delete-task.ts` - Tool for deleting tasks
- `search-tasks.ts` - Tool for querying tasks by status, priority, due dates, and owner
- `get-meeting-outline.ts` - Tool for retrieving structured meeting outlines for meetings
- `get-meeting-transcript.ts` - Tool for retrieving meeting transcripts with resolved speaker names
- `README.md` - This documentation file

## Adding a New Tool

To add a new tool, follow these steps:

1. Create a new file in this directory (e.g., `my-tool.ts`)
2. Define the tool schema and execution function:

```typescript
import type { Anthropic } from '@anthropic-ai/sdk'

// Tool definition
export const myTool: Anthropic.Tool = {
  name: 'my_tool_name',
  description: 'Description of what this tool does',
  input_schema: {
    type: 'object' as const,
    properties: {
      // Define your parameters here
      param1: {
        type: 'string',
        description: 'Description of parameter 1'
      }
    },
    required: ['param1'] // List required parameters
  }
}

// Execution function
export async function executeMyTool(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Your tool logic here
    const result = await someFunction(parameters)
    return { success: true, data: result }
  } catch (error) {
    console.error('My tool execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
```

3. Update `index.ts` to include your new tool:

```typescript
import { myTool, executeMyTool } from './my-tool'

export const availableTools: Anthropic.Tool[] = [
  createPersonContactTool,
  searchPersonsTool,
  createMeetingTool,
  searchMeetingsTool,
  myTool // Add your tool here
]

export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
  search_meetings: executeSearchMeetings,
  my_tool_name: executeMyTool // Add your executor here
}

export { myTool, executeMyTool }
```

## Current Tools

### create_person_contact
Creates a new person contact in the database with their information including name, emails, phones, company, and other details.

**Parameters:**
- `first_name` (string) - First name of the person
- `last_name` (string) - Last name of the person  
- `_emails` (array of strings) - Array of email addresses
- `_phones` (array of strings) - Array of phone numbers
- `company_name` (string) - Name of the company
- `job_title` (string) - Job title or position
- `city` (string) - City where the person is located
- `state` (string) - State where the person is located
- `linkedin` (string) - LinkedIn profile URL
- `description` (string) - Additional notes or description

**Required:** At least `first_name` or `last_name`

### update_person_contact
Updates an existing person contact with new information. Use this when users want to modify contact details like name, email, phone, company, job title, location, or other information.

**Parameters:**
- `id` (string) - The unique identifier of the person contact to update
- `first_name` (string, optional) - Updated first name of the person
- `last_name` (string, optional) - Updated last name of the person
- `_emails` (array of strings, optional) - Updated array of email addresses for the person
- `_phones` (array of strings, optional) - Updated array of phone numbers for the person
- `company_name` (string, optional) - Updated company name where the person works
- `job_title` (string, optional) - Updated job title or position of the person
- `city` (string, optional) - Updated city where the person is located
- `state` (string, optional) - Updated state where the person is located
- `linkedin` (string, optional) - Updated LinkedIn profile URL
- `description` (string, optional) - Updated additional notes or description about the person

**Required:** `id` - All other fields are optional and will only update if provided

### delete_person_contact
Deletes one or more person contacts that are no longer needed.

**Parameters:**
- `id` (string, optional) - ID of the person contact to delete
- `ids` (array of strings, optional) - IDs of multiple contacts to delete in a single call

**Usage:** Provide either `id` for a single contact or `ids` when removing multiple contacts. The tool returns the number of deleted contacts and a link back to the contacts workspace.

### search_persons
Search for persons by name, company, email, or phone number.

**Parameters:**
- `searchTerm` (string) - General search term to search across first name, last name, and company name
- `firstName` (string) - Search specifically by first name
- `lastName` (string) - Search specifically by last name
- `companyName` (string) - Search specifically by company name
- `email` (string) - Search specifically by email address
- `phone` (string) - Search specifically by phone number
- `limit` (number) - Maximum number of results to return (default: 10)

**Usage:** Provide either a `searchTerm` for general search or specific fields for targeted search

### create_meeting
Creates a new meeting with title, meeting date/time, location, and description. When processing meeting invitations or calendar events from images, extracts the meeting body/description content as the description parameter. This creates a meeting that can be populated with audio files, attendees, and other details later.

**Parameters:**
- `title` (string, optional) - Title for the meeting (defaults to "Untitled Meeting")
- `meeting_at` (string, optional) - Date and time for the meeting in ISO format (defaults to current time)
- `location` (string, optional) - Location of the meeting (e.g., "Conference Room A", "Zoom Meeting", "123 Main St", "Zoom Meeting ID: 123 456 7890")
- `description` (string, optional) - The meeting description, body content, or notes from the meeting invitation. This should include the actual meeting content, agenda, or notes that appear in the meeting body/description area of calendar invitations, not just logistical details. For example, if the meeting invitation contains personal messages, agenda items, or meeting notes, include those here.

**Usage:** All parameters are optional. The tool creates a meeting with the specified details and automatically creates an associated note for meeting notes. The description parameter is stored as the initial content of the meeting note. When processing meeting invitations from images, the AI will extract the meeting body content (personal messages, agenda items, etc.) as the description rather than just logistical details.

### update_meeting
Updates an existing meeting with new information such as title, meeting date/time, location, review status, or summary.

**Parameters:**
- `id` (string) - The unique identifier of the meeting to update
- `title` (string, optional) - Updated title of the meeting
- `meeting_at` (string, optional) - Updated meeting date/time in ISO format. If timezone offset is missing, the API augments with client UTC offset when available.
- `location` (string, optional) - Updated location (e.g., room, Zoom, address)
- `meeting_reviewed` (boolean, optional) - Whether the meeting has been reviewed
- `summary` (string, optional) - Updated plain-text summary for the meeting

**Required:** `id` - All other fields are optional and only applied if provided

### delete_meeting
Deletes one or more meetings from the workspace after confirming they are no longer required.

**Parameters:**
- `id` (string, optional) - ID of the meeting to delete
- `ids` (array of strings, optional) - IDs of multiple meetings to delete together

**Usage:** Supply either `id` or `ids`. The tool returns how many meetings were deleted along with the meetings workspace URL.

### search_meetings
Search for meetings by participant name, date range, title, or other criteria. Use this when users ask about meetings they have had with specific people or during specific time periods.

**Parameters:**
- `participantName` (string, optional) - Name of a meeting participant to search for (e.g., "Joe Taylor", "john smith")
- `dateFrom` (string, optional) - Start date for the search range in ISO format (e.g., "2025-01-01")
- `dateTo` (string, optional) - End date for the search range in ISO format (e.g., "2025-01-31")
- `title` (string, optional) - Search for meetings with a specific title or title containing certain words
- `limit` (number, optional) - Maximum number of results to return (default: 10)

**Usage:** All parameters are optional. The tool searches for meetings based on the provided criteria and returns formatted results with meeting details and navigation URLs. Results are sorted by meeting date (most recent first). When users ask questions like "what meetings have I had with Joe Taylor in the past week?", the AI will extract the participant name and date range to perform the search.

### get_meeting_outline
Retrieves the structured outline for a specific meeting without returning the full transcript.

**Parameters:**
- `meeting_id` (string) - The unique identifier of the meeting whose outline should be returned

**Usage:** Use this after locating the meeting via `search_meetings` when users need executive summaries, action items, or other outline sections.

**Response:** Returns the available outline sections (e.g., executive summary, discussion outline, action items) ordered for easy consumption, along with a direct link to the meeting. If the meeting does not yet have an outline, the response clearly indicates that the outline is unavailable.

### get_meeting_transcript
Returns the formatted transcript for a meeting with speaker names resolved from linked contacts when available. Use this when you need to read or quote specific dialogue from the meeting after locating it via search.

**Parameters:**
- `meeting_id` (string) - The unique identifier of the meeting whose transcript should be returned

**Usage:** The response includes per-segment speaker names, timestamps, and text, along with an aggregated transcript string that mirrors the copy-to-clipboard version in the workspace UI.

**Response:** Provides segment-level entries with speaker names and timestamps, a preformatted transcript string, the associated meeting URL, and an explicit flag when no transcript data is available yet.

### create_note
Creates a new note with required text content and optional title, contact associations, or meeting associations.

**Parameters:**
- `content` (string) - The main body of the note. Provide the full text that should be stored.
- `title` (string, optional) - Optional note title to make the note easier to reference later.
- `contact_ids` (array of strings, optional) - Contact IDs to link to the note. When supplied, the note is associated with each contact.
- `meeting_ids` (array of strings, optional) - Meeting IDs to link to the note. When supplied, the note is associated with each meeting.

**Usage:** Always include meaningful `content`. Associations are optional and can be provided as arrays or omitted.

### get_note
Retrieves a single note by ID, returning its content along with associated contacts and meetings.

**Parameters:**
- `note_id` (string) - ID of the note to retrieve.

**Response:** Returns the note ID, title, content, timestamps, associated contacts (with basic details), associated meetings (with title and scheduled time), and a workspace URL for navigation.

### update_note
Updates an existing note. Use this to modify the title or content, or to replace the linked contacts or meetings.

**Parameters:**
- `note_id` (string) - ID of the note to update.
- `title` (string, optional) - New title. Provide an empty string or `null` to clear the existing title.
- `content` (string, optional) - New body content. Provide an empty string or `null` to clear the existing content.
- `contact_ids` (array of strings, optional) - Replace contact associations. Use an empty array to remove all contacts.
- `meeting_ids` (array of strings, optional) - Replace meeting associations. Use an empty array to remove all meetings.

**Usage:** Only include the fields that should change. Associations are replaced entirely when provided.

### delete_note
Deletes one or more notes once they are no longer needed.

**Parameters:**
- `note_id` (string, optional) - Single note ID to delete.
- `note_ids` (array of strings, optional) - Multiple note IDs to delete in batch.

**Usage:** Supply either `note_id` or `note_ids`. The response includes how many notes were deleted and a link back to the notes workspace.

### create_task
Creates a new task with status, priority, optional dates, and associations to contacts, meetings, and tags. Defaults to `todo` status and `medium` priority when not provided.

**Parameters:**
- `title` (string, required) - Title for the task
- `description` (string, optional) - Detailed description of the task
- `status` (string, optional) - Task status (`todo`, `in_progress`, `blocked`, `completed`, `cancelled`)
- `priority` (string, optional) - Task priority (`low`, `medium`, `high`, `urgent`)
- `start_at` (string, optional) - Start date/time in ISO format (timezone preferred)
- `due_at` (string, optional) - Due date/time in ISO format (timezone preferred)
- `owner_contact_id` (string, optional) - Contact ID to assign as task owner
- `contact_ids` (array of strings, optional) - Contact IDs to associate with the task
- `meeting_ids` (array of strings, optional) - Meeting IDs to associate with the task
- `tag_ids` (array of strings, optional) - Tag IDs to associate with the task

**Response:** Returns the created task ID, status/priority used, and a workspace URL for quick navigation.

### update_task
Updates an existing task. Provide only the fields that should change—omitted fields remain untouched. Arrays replace existing associations when supplied (empty arrays clear them).

**Parameters:**
- `id` (string, required) - ID of the task to update
- `title` (string, optional) - New task title
- `description` (string, optional) - Updated description
- `status` (string, optional) - Updated status (`todo`, `in_progress`, `blocked`, `completed`, `cancelled`)
- `priority` (string, optional) - Updated priority (`low`, `medium`, `high`, `urgent`)
- `start_at` (string, optional) - Updated start date/time in ISO format
- `due_at` (string, optional) - Updated due date/time in ISO format
- `owner_contact_id` (string, optional) - Contact ID for the task owner; send empty string or `null` to clear
- `contact_ids` (array of strings, optional) - Replace contact associations (empty array clears)
- `meeting_ids` (array of strings, optional) - Replace meeting associations (empty array clears)
- `tag_ids` (array of strings, optional) - Replace tag associations (empty array clears)

**Response:** Returns the updated task metadata and workspace URL.

### delete_task
Deletes one or more tasks that are no longer relevant.

**Parameters:**
- `id` (string, optional) - ID of the task to delete
- `ids` (array of strings, optional) - IDs of multiple tasks to delete in one request

**Usage:** Provide either `id` or `ids`. When multiple IDs are included, the tool deletes them in bulk and reports the total removed alongside a link to the tasks workspace.

### search_tasks
Searches tasks by keywords, status, priority, due date ranges, and owner. Results include related contacts, meetings, and tags when available.

**Parameters:**
- `search_term` (string, optional) - Keyword match against the task title
- `title` (string, optional) - Explicit title keyword filter (overrides `search_term` when both provided)
- `status` (string, optional) - Filter by task status
- `priority` (string, optional) - Filter by task priority
- `owner_contact_id` (string, optional) - Filter tasks assigned to a specific contact
- `due_after` (string, optional) - ISO date/time or `YYYY-MM-DD` for minimum due date (inclusive)
- `due_before` (string, optional) - ISO date/time or `YYYY-MM-DD` for maximum due date (inclusive)
- `limit` (number, optional) - Maximum number of results (default 10, max 50)
- `sort_by` (string, optional) - Sort column (`due_at`, `created_at`, `updated_at`, `priority`, `status`)
- `sort_direction` (string, optional) - Sort direction (`asc` or `desc`)

**Response:** Returns the filtered tasks with their metadata and workspace URLs, plus a summary of applied filters.
