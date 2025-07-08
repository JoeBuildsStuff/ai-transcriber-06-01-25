"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import PersonForm from "./form"
import { PersonWithRelations, Company } from "../_lib/validations"
import { Button } from "@/components/ui/button"
import { X, Plus, Save } from "lucide-react"
import { toast } from "sonner"
import { getCompanies } from "../_lib/actions"

interface PersonFormData {
  firstName: string
  lastName: string
  emails: string[]
  phones: string[]
  city: string
  state: string
  company: string
  description: string
  linkedin: string
  jobTitle: string
}

// Helper function to transform form data to database format
function transformFormDataToContact(formData: PersonFormData): Partial<PersonWithRelations> & { _emails?: string[]; _phones?: string[], company_name?: string } {
  const contactData: Partial<PersonWithRelations> & { _emails?: string[]; _phones?: string[], company_name?: string } = {
    first_name: formData.firstName,
    last_name: formData.lastName,
    city: formData.city,
    state: formData.state,
    description: formData.description,
    linkedin: formData.linkedin,
    job_title: formData.jobTitle,
    company_name: formData.company,
  }

  // Handle company (would need to lookup company ID or create new company)
  // For now, we'll just set company_id to null
  // In a real implementation, you'd need to find or create the company
  // contactData.company_id = null

  // Handle emails and phones (these would be handled separately through related tables)
  // For the MVP, we'll store them in the onChange callback and handle them in the action
  contactData._emails = formData.emails.filter(email => email.trim() !== '')
  contactData._phones = formData.phones.filter(phone => phone.trim() !== '')

  return contactData
}

// Add Form Wrapper
export function ContactAddForm({
  onSuccess,
  onCancel,
  createAction
}: {
  onSuccess?: () => void
  onCancel?: () => void
  createAction?: (data: Partial<PersonWithRelations>) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PersonFormData | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    async function fetchCompanies() {
      const { data, error } = await getCompanies()
      if (error) {
        toast.error("Could not fetch companies.")
        console.error(error)
      } else if (data) {
        setCompanies(data)
      }
    }
    fetchCompanies()
  }, [])

  const handleFormDataChange = useCallback((data: PersonFormData) => {
    setFormData(data)
  }, [])

  const handleSubmit = async () => {
    if (!formData || !createAction) return

    setIsSubmitting(true)
    try {
      const contactData = transformFormDataToContact(formData)
      const result = await createAction(contactData)
      
      if (result.success) {
        router.refresh()
        onSuccess?.()
      } else {
        console.error("Failed to create contact:", result.error)
        toast.error("Failed to create contact", { description: result.error })
      }
    } catch (error) {
      console.error("Error creating contact:", error)
      toast.error("An unexpected error occurred while creating the contact.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <PersonForm
          onChange={handleFormDataChange}
          availableCompanies={companies}
        />
      </div>
      
      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData}
          className="w-1/2"
        >
          <Plus className="size-4 shrink-0" />
          {isSubmitting ? "Adding..." : "Add Contact"}
        </Button>
      </div>
    </div>
  )
}

// Edit Form Wrapper
export function ContactEditForm({
  data,
  onSuccess,
  onCancel,
  updateAction
}: {
  data: PersonWithRelations
  onSuccess?: () => void
  onCancel?: () => void
  updateAction?: (id: string, data: Partial<PersonWithRelations>) => Promise<{ success: boolean; error?: string }>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PersonFormData | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    async function fetchCompanies() {
      const { data, error } = await getCompanies()
      if (error) {
        toast.error("Could not fetch companies.")
        console.error(error)
      } else if (data) {
        setCompanies(data)
      }
    }
    fetchCompanies()
  }, [])

  // Extract initial values from the contact data
  const initialEmails = data.emails?.map(e => e.email) || []
  const initialPhones = data.phones?.map(p => p.phone) || []

  const handleFormDataChange = useCallback((formData: PersonFormData) => {
    setFormData(formData)
  }, [])

  const handleSubmit = async () => {
    if (!formData || !updateAction) return

    setIsSubmitting(true)
    try {
      const contactData = transformFormDataToContact(formData)
      const result = await updateAction(data.id, contactData)
      
      if (result.success) {
        router.refresh()
        onSuccess?.()
      } else {
        console.error("Failed to update contact:", result.error)
        toast.error("Failed to update contact", { description: result.error })
      }
    } catch (error) {
      console.error("Error updating contact:", error)
      toast.error("An unexpected error occurred while updating the contact.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <PersonForm
          initialFirstName={data.first_name || ""}
          initialLastName={data.last_name || ""}
          initialEmails={initialEmails}
          initialPhones={initialPhones}
          initialCity={data.city || ""}
          initialState={data.state || ""}
          initialCompany={data.company?.name || ""}
          initialDescription={data.description || ""}
          initialLinkedin={data.linkedin || ""}
          initialJobTitle={data.job_title || ""}
          onChange={handleFormDataChange}
          availableCompanies={companies}
        />
      </div>
      
      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData}
          className="w-1/2"
        >
          <Save className="size-4 shrink-0" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

// multi Edit Form Wrapper
export function ContactMultiEditForm({
  selectedCount,
  onSuccess,
  onCancel,
  updateActionMulti
}: {
  selectedCount: number
  onSuccess?: () => void
  onCancel?: () => void
  updateActionMulti?: (ids: string[], data: Partial<PersonWithRelations>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PersonFormData | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    async function fetchCompanies() {
      const { data, error } = await getCompanies()
      if (error) {
        toast.error("Could not fetch companies.")
        console.error(error)
      } else if (data) {
        setCompanies(data)
      }
    }
    fetchCompanies()
  }, [])

  const handleFormDataChange = useCallback((data: PersonFormData) => {
    setFormData(data)
  }, [])

  const handleSubmit = async () => {
    if (!formData || !updateActionMulti) return

    setIsSubmitting(true)
    try {
      const contactData = transformFormDataToContact(formData)
      
      // Filter out undefined values for multi edit - only update fields that were actually modified
      const filteredData = Object.fromEntries(
        Object.entries(contactData).filter(([, value]) => {
          if (value === undefined || value === null) return false
          if (typeof value === 'string' && value.trim() === '') return false
          if (Array.isArray(value) && value.length === 0) return false
          return true
        })
      )
      
      // The updateActionMulti function will be called with the selected contact IDs
      // by the DataTableRowEditMulti component
      const result = await updateActionMulti([], filteredData)
      
      if (result.success) {
        router.refresh()
        onSuccess?.()
        toast.success("Contacts updated successfully", {
          description: `${result.updatedCount || selectedCount} contact${(result.updatedCount || selectedCount) > 1 ? 's' : ''} updated.`
        })
      } else {
        console.error("Failed to update contacts:", result.error)
        toast.error("Failed to update contacts", { description: result.error })
      }
    } catch (error) {
      console.error("Error updating contacts:", error)
      toast.error("An unexpected error occurred while updating the contacts.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-4">

        <PersonForm
          onChange={handleFormDataChange}
          availableCompanies={companies}
          // Start with empty values for multi edit
          initialFirstName=""
          initialLastName=""
          initialEmails={[]}
          initialPhones={[]}
          initialCity=""
          initialState=""
          initialCompany=""
          initialDescription=""
          initialLinkedin=""
          initialJobTitle=""
        />
      </div>
      
      <div className="flex justify-between gap-2 p-4 border-t bg-background">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-1/2"
        >
          <X className="size-4 shrink-0" /> Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData}
          className="w-1/2"
        >
          <Save className="size-4 shrink-0" />
          {isSubmitting ? "Updating..." : `Update ${selectedCount} Contact${selectedCount > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}