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
// TODO: Align approach for actions as either @/actions or @/app/(workspace)/workspace/contacts/_lib/actions
import { updateMeetingSpeaker } from "@/actions/contacts"
import { createContact } from "../../../contacts/_lib/actions"

import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Contact, SpeakerAssociationModalProps } from "@/types"

export default function SpeakerAssociationModal({
  isOpen,
  onClose,
  meetingId,
  speakerNumber,
  currentContactId,
  contacts,
  meetingSpeakers,
  onSpeakersUpdate,
  formattedTranscript,
  onSeekAndPlay,
  onContactsUpdate,
}: SpeakerAssociationModalProps) {
  const [isPending, startTransition] = useTransition()
  const [showNewContactForm, setShowNewContactForm] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [notes, setNotes] = useState("")

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
        if (notes) {
          formData.append("notes", notes)
        }
        
        const result = await createContact(formData)
        
        if (result.error || !result.contact) {
          throw new Error(result.error || "Failed to create contact")
        }
        
        toast.success(`Contact "${firstName} ${lastName}".trim() created.`)
        
        // Now associate the new contact
        const newContactId = result.contact.id
        await updateMeetingSpeaker(meetingId, speakerNumber, newContactId)
        
        // Update the speakers list
        const updatedSpeakers = meetingSpeakers.map(speaker => 
          speaker.speaker_index === speakerNumber 
            ? { ...speaker, contact_id: newContactId, contact: { ...result.contact, created_at: '', updated_at: '', user_id: '' } }
            : speaker
        )
        onSpeakersUpdate(updatedSpeakers)
        toast.success('Speaker association updated successfully')
        
        onContactsUpdate()
        
        // Reset form and return to contact list
        setFirstName("")
        setLastName("")
        setNotes("")
        setShowNewContactForm(false)

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
        await updateMeetingSpeaker(meetingId, speakerNumber, contactId)
        
        // Update the speakers list
        const updatedSpeakers = meetingSpeakers.map(speaker => {
          if (speaker.speaker_index === speakerNumber) {
            if (contactId) {
              const contact = contacts.find(c => c.id === contactId)
              return { 
                ...speaker, 
                contact_id: contactId, 
                contact: contact ? {
                  ...contact,
                  created_at: contact.created_at || '',
                  updated_at: contact.updated_at || '',
                  user_id: contact.user_id || ''
                } : null
              }
            } else {
              return { ...speaker, contact_id: null, contact: null }
            }
          }
          return speaker
        })
        
        onSpeakersUpdate(updatedSpeakers)
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
    return contact.display_name || `${contact.first_name} ${contact.last_name}`.trim() || contact.primary_email
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
                    {currentContact.primary_email && (
                      <div className="text-xs text-muted-foreground">
                        {currentContact.primary_email}
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
                            title="Click to play this segment (will load audio if needed)"
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
            <Textarea
              placeholder="Notes (e.g., role in meeting, key points to remember)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              className="min-h-[80px]"
            />
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
                  value={getContactDisplayName(contact) || ''}
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
                    {contact.primary_email && (
                      <div className="text-xs text-muted-foreground">
                        {contact.primary_email}
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