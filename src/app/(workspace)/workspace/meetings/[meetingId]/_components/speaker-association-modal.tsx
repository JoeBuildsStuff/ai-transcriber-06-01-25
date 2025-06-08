"use client"

import { useTransition } from "react"
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
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { updateSpeakerContacts } from "@/actions/contacts"

// From speakers-management.tsx
interface Contact {
  id: string
  firstName: string
  lastName: string
  displayName: string
  primaryEmail: string
  company: string
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
}: SpeakerAssociationModalProps) {
  const [isPending, startTransition] = useTransition()

  if (speakerNumber === null) return null

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Associate Contact with Speaker {speakerNumber}</DialogTitle>
          <DialogDescription>
            Select a contact from your list to associate with this speaker.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search contacts..." />
          <CommandList>
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 