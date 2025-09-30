# Chat API Tools

This directory contains the tool definitions and execution logic for the chat API. Tools are functions that the AI can call to perform specific actions.

## Structure

- `index.ts` - Exports all tools and executors
- `create-person.ts` - Tool for creating person contacts
- `search-persons.ts` - Tool for searching person contacts
- `create-meeting.ts` - Tool for creating new meetings
- `search-meetings.ts` - Tool for searching existing meetings
- `update-person.ts` - Tool for updating existing person contacts
- `update-meeting.ts` - Tool for updating existing meetings
- `get-meeting-outline.ts` - Tool for retrieving structured meeting outlines for meetings
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
Retrieves the structured outline for a specific meeting without returning the full transcript. Use this after locating the meeting via `search_meetings` when the user requests executive summaries, action items, decisions, or other outline sections.

**Parameters:**
- `meeting_id` (string) - The unique identifier of the meeting whose outline should be returned

**Response:** Returns the available outline sections (e.g., executive summary, discussion outline, action items) ordered for easy consumption, along with a direct link to the meeting. If the meeting does not yet have an outline, the response clearly indicates that the outline is unavailable.
