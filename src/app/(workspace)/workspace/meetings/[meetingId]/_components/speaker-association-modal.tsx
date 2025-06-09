"use client"

import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, X, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createContact, updateSpeakerContacts } from "@/actions/contacts"
import { FormattedTranscriptGroup } from "@/components/transcript"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// From speakers-management.tsx
interface Contact {
  id: string
  firstName: string
  lastName: string
  displayName: string
  primaryEmail: string
  company: string
  notes?: string
}

interface SpeakerAssociationModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: string
  speakerNumber: number | null
  currentContactId: string | null
  contacts: Contact[]
  speakerContacts: Record<number, string> | null
  onSpeakerContactsUpdate: (speakerContacts: Record<number, string>) => void
  formattedTranscript: FormattedTranscriptGroup[]
  onSeekAndPlay: (time: number) => void
  onContactsUpdate: () => void
}

export default function SpeakerAssociationModal({
  isOpen,
  onClose,
  meetingId,
  speakerNumber,
  currentContactId,
  contacts,
  speakerContacts,
  onSpeakerContactsUpdate,
  formattedTranscript,
  onSeekAndPlay,
  onContactsUpdate,
}: SpeakerAssociationModalProps) {
  const [isPending, startTransition] = useTransition()
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  if (speakerNumber === null) return null

  const handleCreateAndAssociateContact = async () => {
    if (!firstName && !lastName) {
      toast.error("Please enter at least a first or last name.")
      return
    }

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("first_name", firstName)
        formData.append("last_name", lastName)
        
        const result = await createContact(formData)
        
        if (result.error || !result.contact) {
          throw new Error(result.error || "Failed to create contact")
        }
        
        toast.success(`Contact "${firstName} ${lastName}".trim() created.`)
        
        // Now associate the new contact
        const newContactId = result.contact.id
        const updatedSpeakerContacts = { ...(speakerContacts || {}) }
        updatedSpeakerContacts[speakerNumber] = newContactId
        const associationResult = await updateSpeakerContacts(meetingId, updatedSpeakerContacts)
        
        onSpeakerContactsUpdate(associationResult)
        toast.success('Speaker association updated successfully')
        
        onContactsUpdate()
        onClose()

      } catch (error) {
        console.error('Error creating or associating contact:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        toast.error(errorMessage)
      }
    })
  }

  const handleAssociateContact = (contactId: string | null) => {
    startTransition(async () => {
      try {
        const updatedSpeakerContacts = { ...(speakerContacts || {}) }
        
        if (contactId) {
          updatedSpeakerContacts[speakerNumber] = contactId
        } else {
          delete updatedSpeakerContacts[speakerNumber]
        }

        const result = await updateSpeakerContacts(meetingId, updatedSpeakerContacts)
        
        onSpeakerContactsUpdate(result)
        toast.success('Speaker association updated successfully')
        onClose()
      } catch (error) {
        console.error('Error updating speaker association:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to update speaker association'
        toast.error(errorMessage)
      }
    })
  }

  const getContactDisplayName = (contact: Contact) => {
    return contact.displayName || `${contact.firstName} ${contact.lastName}`.trim() || contact.primaryEmail
  }

  const handleSegmentClick = (start: number) => {
    onSeekAndPlay(start);
  };

  const topSegments = speakerNumber !== null 
    ? formattedTranscript
        .filter(segment => segment.speaker === speakerNumber)
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 5)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Associate Contact with Speaker {speakerNumber}</DialogTitle>
          <DialogDescription>
            Select a contact to associate with this speaker. You can review their longest spoken segments below.
          </DialogDescription>
        </DialogHeader>

        {/* Current Association */}
        <div className="space-y-2 pt-2">
          <h4 className="font-medium text-sm">Current Association</h4>
          <div className="rounded-md border p-3 text-sm">
            {currentContactId ? (
              (() => {
                const currentContact = contacts.find(c => c.id === currentContactId);
                return currentContact ? (
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {getContactDisplayName(currentContact)}
                    </div>
                    {currentContact.company && (
                      <div className="text-sm text-muted-foreground">
                        {currentContact.company}
                      </div>
                    )}
                    {currentContact.primaryEmail && (
                      <div className="text-xs text-muted-foreground">
                        {currentContact.primaryEmail}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Contact not found</span>
                );
              })()
            ) : (
              <span className="text-muted-foreground">No contact associated</span>
            )}
          </div>
        </div>

        {topSegments.length > 0 && (
            <div className="space-y-3 pt-2">
                <h4 className="font-medium text-sm">1. Sample segements</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                    {topSegments.map((segment, index) => (
                      <>
                        <Button 
                            key={index} 
                            onClick={() => handleSegmentClick(segment.start)} 
                            variant="ghost" 
                            className="w-full justify-start text-left h-auto p-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <p className="whitespace-normal">&quot;{segment.text.length > 200 ? segment.text.slice(0, 100) + '...' : segment.text}&quot;</p>
                        </Button>
                        <Separator />
                        </>
                    ))}
                </div>
            </div>
        )}

        {showNewContactForm ? (
          <div className="space-y-4 pt-2">
            <h4 className="font-medium text-sm">Create New Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="First Name" 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isPending}
              />
              <Input 
                placeholder="Last Name" 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowNewContactForm(false)} disabled={isPending}>Cancel</Button>
              <Button onClick={handleCreateAndAssociateContact} disabled={isPending}>
                Create & Associate
              </Button>
            </div>
          </div>
        ) : (
        <>
        <h4 className="font-medium text-sm">2. Select Contact</h4>
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => setShowNewContactForm(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create new contact
              </CommandItem>
              {currentContactId && (
                <CommandItem
                  value="remove"
                  onSelect={() => handleAssociateContact(null)}
                  className="text-destructive"
                  disabled={isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove association
                </CommandItem>
              )}
              {contacts.map(contact => (
                <CommandItem
                  key={contact.id}
                  value={getContactDisplayName(contact)}
                  onSelect={() => handleAssociateContact(contact.id)}
                  disabled={isPending}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentContactId === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="font-medium">
                      {getContactDisplayName(contact)}
                    </div>
                    {contact.company && (
                      <div className="text-sm text-muted-foreground">
                        {contact.company}
                      </div>
                    )}
                    {contact.primaryEmail && (
                      <div className="text-xs text-muted-foreground">
                        {contact.primaryEmail}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 