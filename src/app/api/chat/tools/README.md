# Chat API Tools

This directory contains the tool definitions and execution logic for the chat API. Tools are functions that the AI can call to perform specific actions.

## Structure

- `index.ts` - Exports all tools and executors
- `create-person.ts` - Tool for creating person contacts
- `search-persons.ts` - Tool for searching person contacts
- `create-meeting.ts` - Tool for creating new meetings
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
  myTool // Add your tool here
]

export const toolExecutors: Record<string, (parameters: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>> = {
  create_person_contact: executeCreatePersonContact,
  search_persons: executeSearchPersons,
  create_meeting: executeCreateMeeting,
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
