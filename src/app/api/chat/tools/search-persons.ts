import type { Anthropic } from '@anthropic-ai/sdk'
import { searchPersons, searchPersonsByFields } from '@/app/(workspace)/workspace/contacts/_lib/queries'

// Tool definition for searching persons
export const searchPersonsTool: Anthropic.Tool = {
  name: 'search_persons',
  description: 'Search for persons by name, company, email, or phone number',
  input_schema: {
    type: 'object' as const,
    properties: {
      searchTerm: {
        type: 'string',
        description: 'General search term to search across first name, last name, and company name'
      },
      firstName: {
        type: 'string',
        description: 'Search specifically by first name'
      },
      lastName: {
        type: 'string',
        description: 'Search specifically by last name'
      },
      companyName: {
        type: 'string',
        description: 'Search specifically by company name'
      },
      email: {
        type: 'string',
        description: 'Search specifically by email address'
      },
      phone: {
        type: 'string',
        description: 'Search specifically by phone number'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)'
      }
    },
    required: []
  }
}

// Function execution logic for the search_persons tool
export async function executeSearchPersons(parameters: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const { searchTerm, firstName, lastName, companyName, email, phone, limit } = parameters
    
    // If a general search term is provided, use the simple search
    if (searchTerm && typeof searchTerm === 'string') {
      const result = await searchPersons(searchTerm, limit as number || 10)
      return {
        success: !result.error,
        data: result.data,
        error: result.error?.message
      }
    }
    
    // If specific fields are provided, use the field-specific search
    const searchCriteria: {
      firstName?: string,
      lastName?: string,
      companyName?: string,
      email?: string,
      phone?: string
    } = {}
    
    if (firstName && typeof firstName === 'string') searchCriteria.firstName = firstName
    if (lastName && typeof lastName === 'string') searchCriteria.lastName = lastName
    if (companyName && typeof companyName === 'string') searchCriteria.companyName = companyName
    if (email && typeof email === 'string') searchCriteria.email = email
    if (phone && typeof phone === 'string') searchCriteria.phone = phone
    
    // Check if any specific criteria were provided
    if (Object.keys(searchCriteria).length === 0) {
      return { 
        success: false, 
        error: 'Please provide either a searchTerm or at least one specific search field (firstName, lastName, companyName, email, phone)' 
      }
    }
    
    const result = await searchPersonsByFields(searchCriteria, limit as number || 10)
    return {
      success: !result.error,
      data: result.data,
      error: result.error?.message
    }
  } catch (error) {
    console.error('Search persons execution error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
