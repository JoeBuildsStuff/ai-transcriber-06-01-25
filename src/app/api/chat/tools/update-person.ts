import type { Anthropic } from '@anthropic-ai/sdk'
import { updatePerson } from '@/app/(workspace)/workspace/contacts/_lib/actions'

// Tool definition for updating person contacts
export const updatePersonTool: Anthropic.Tool = {
  name: 'update_person_contact',
  description: 'Update an existing person contact with new information. Use this when users want to modify contact details like name, email, phone, company, job title, location, or other information.',
  input_schema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'The unique identifier of the person contact to update'
      },
      first_name: {
        type: 'string',
        description: 'Updated first name of the person'
      },
      last_name: {
        type: 'string',
        description: 'Updated last name of the person'
      },
      _emails: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated array of email addresses for the person'
      },
      _phones: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated array of phone numbers for the person'
      },
      company_name: {
        type: 'string',
        description: 'Updated company name where the person works'
      },
      job_title: {
        type: 'string',
        description: 'Updated job title or position of the person'
      },
      city: {
        type: 'string',
        description: 'Updated city where the person is located'
      },
      state: {
        type: 'string',
        description: 'Updated state where the person is located'
      },
      linkedin: {
        type: 'string',
        description: 'Updated LinkedIn profile URL'
      },
      description: {
        type: 'string',
        description: 'Updated additional notes or description about the person'
      }
    },
    required: ['id'] // Only the ID is required, all other fields are optional
  }
}

// Execution function for updating person contacts
export async function executeUpdatePersonContact(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { id, ...updateData } = parameters
    
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Contact ID is required' }
    }

    // Filter out undefined values and client-specific parameters to only update provided fields
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => 
        value !== undefined && 
        !['client_tz', 'client_utc_offset', 'client_now_iso'].includes(key)
      )
    )

    if (Object.keys(filteredData).length === 0) {
      return { success: false, error: 'No fields provided to update' }
    }

    const result = await updatePerson(id, filteredData)
    
    if (result.success) {
      return { 
        success: true, 
        data: {
          message: 'Contact updated successfully',
          contact: result.data,
          url: `/workspace/contacts/${id}`
        }
      }
    } else {
      return { success: false, error: result.error || 'Failed to update contact' }
    }
  } catch (error) {
    console.error('Update person contact execution error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}
