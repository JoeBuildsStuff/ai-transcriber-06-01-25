import type { Anthropic } from '@anthropic-ai/sdk'
import { createPerson } from '@/app/(workspace)/workspace/contacts/_lib/actions'

// Tool definition for creating person contacts
export const createPersonContactTool: Anthropic.Tool = {
  name: 'create_person_contact',
  description: 'Create a new person contact in the database with their information including name, emails, phones, company, and other details',
  input_schema: {
    type: 'object' as const,
    properties: {
      first_name: {
        type: 'string',
        description: 'First name of the person'
      },
      last_name: {
        type: 'string', 
        description: 'Last name of the person'
      },
      _emails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of email addresses for the person'
      },
      _phones: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of phone numbers for the person'
      },
      company_name: {
        type: 'string',
        description: 'Name of the company the person works for (will be created if it doesn\'t exist)'
      },
      job_title: {
        type: 'string',
        description: 'Job title or position of the person'
      },
      city: {
        type: 'string',
        description: 'City where the person is located'
      },
      state: {
        type: 'string',
        description: 'State where the person is located'
      },
      linkedin: {
        type: 'string',
        description: 'LinkedIn profile URL'
      },
      description: {
        type: 'string',
        description: 'Additional notes or description about the person'
      }
    },
    required: []
  }
}

// Function execution logic for the create_person_contact tool
export async function executeCreatePersonContact(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // Validate required parameters
    if (!parameters.first_name && !parameters.last_name) {
      return { success: false, error: 'At least first name or last name is required' }
    }
    
    const result = await createPerson(parameters)
    return result
  } catch (error) {
    console.error('Create person contact execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
