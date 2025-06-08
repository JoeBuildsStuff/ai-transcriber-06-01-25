// Updated src/components/speakers-management.tsx

"use client"

import { useState, useEffect, useTransition } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown, UserPlus, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormattedTranscriptGroup } from "@/components/transcript"
import { toast } from "sonner"
import { getAllContacts, updateSpeakerContacts } from "@/actions/contacts"

interface Contact {
  id: string
  firstName: string
  lastName: string
  displayName: string
  primaryEmail: string
  company: string
}

interface SpeakerContact {
  speakerNumber: number
  contactId: string | null
  contact: Contact | null
}

interface SpeakersManagementProps {
  meetingId: string
  formattedTranscript: FormattedTranscriptGroup[]
  speakerContacts: Record<number, string> | null
  onSpeakerContactsUpdate: (speakerContacts: Record<number, string>) => void
}

export default function SpeakersManagement({
  meetingId,
  formattedTranscript,
  speakerContacts,
  onSpeakerContactsUpdate
}: SpeakersManagementProps) {
  const [speakers, setSpeakers] = useState<SpeakerContact[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [openPopovers, setOpenPopovers] = useState<Record<number, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const getSpeakerColor = (speakerNumber: number) => {
    const colors = [
      "bg-blue-400/20 border-blue-600 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      "bg-green-400/20 border-green-600 text-green-800 dark:bg-green-900 dark:text-green-100",
      "bg-yellow-400/20 border-yellow-600 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      "bg-red-400/20 border-red-600 text-red-800 dark:bg-red-900 dark:text-red-100",
      "bg-purple-400/20 border-purple-600 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      "bg-pink-400/20 border-pink-600 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
      "bg-indigo-400/20 border-indigo-600 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
      "bg-teal-400/20 border-teal-600 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
    ]
    return colors[speakerNumber % colors.length]
  }

  // Extract unique speakers from transcript
  useEffect(() => {
    const uniqueSpeakers = Array.from(
      new Set(formattedTranscript.map(group => group.speaker))
    ).sort((a, b) => a - b)

    const speakerData = uniqueSpeakers.map(speakerNumber => ({
      speakerNumber,
      contactId: speakerContacts?.[speakerNumber] || null,
      contact: null
    }))

    setSpeakers(speakerData)
  }, [formattedTranscript, speakerContacts])

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactsData = await getAllContacts()
        setContacts(contactsData)
        
        // Update speaker contacts with full contact data
        setSpeakers(prevSpeakers => 
          prevSpeakers.map(speaker => ({
            ...speaker,
            contact: speaker.contactId 
              ? contactsData.find(c => c.id === speaker.contactId) || null
              : null
          }))
        )
      } catch (error) {
        console.error('Error fetching contacts:', error)
        toast.error('Failed to load contacts')
      }
    }

    fetchContacts()
  }, [])

  const handleAssociateContact = async (speakerNumber: number, contactId: string | null) => {
    startTransition(async () => {
      try {
        const updatedSpeakerContacts = { ...speakerContacts }
        
        if (contactId) {
          updatedSpeakerContacts[speakerNumber] = contactId
        } else {
          delete updatedSpeakerContacts[speakerNumber]
        }

        const result = await updateSpeakerContacts(meetingId, updatedSpeakerContacts)
        
        onSpeakerContactsUpdate(result)
        
        // Update local state
        setSpeakers(prevSpeakers =>
          prevSpeakers.map(speaker => {
            if (speaker.speakerNumber === speakerNumber) {
              return {
                ...speaker,
                contactId,
                contact: contactId ? contacts.find(c => c.id === contactId) || null : null
              }
            }
            return speaker
          })
        )

        // Close popover
        setOpenPopovers(prev => ({ ...prev, [speakerNumber]: false }))
        
        toast.success('Speaker association updated successfully')
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

  const getSpeakerWordCount = (speakerNumber: number) => {
    return formattedTranscript
      .filter(group => group.speaker === speakerNumber)
      .reduce((count, group) => count + group.text.split(' ').length, 0)
  }

  if (speakers.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p>No speakers detected in this meeting transcript.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {speakers.map(speaker => (
        <div 
          key={speaker.speakerNumber} 
          className="flex items-start justify-between p-4 border rounded-lg"
        >
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={`${getSpeakerColor(speaker.speakerNumber)} border font-medium`}
            >
              Speaker {speaker.speakerNumber}
            </Badge>
            
            <div className="flex flex-col">
              {speaker.contact ? (
                <>
                  <div className="font-medium">
                    {getContactDisplayName(speaker.contact)}
                  </div>
                  {speaker.contact.company && (
                    <div className="text-sm text-muted-foreground">
                      {speaker.contact.company}
                    </div>
                  )}
                  {speaker.contact.primaryEmail && (
                    <div className="text-xs text-muted-foreground">
                      {speaker.contact.primaryEmail}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">
                  No contact associated
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {getSpeakerWordCount(speaker.speakerNumber)} words spoken
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Popover 
              open={openPopovers[speaker.speakerNumber] || false}
              onOpenChange={(open) => 
                setOpenPopovers(prev => ({ ...prev, [speaker.speakerNumber]: open }))
              }
            >
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {speaker.contact ? 'Change' : 'Associate'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search contacts..." />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {speaker.contact && (
                        <CommandItem
                          value="remove"
                          onSelect={() => handleAssociateContact(speaker.speakerNumber, null)}
                          className="text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove association
                        </CommandItem>
                      )}
                      {contacts.map(contact => (
                        <CommandItem
                          key={contact.id}
                          value={getContactDisplayName(contact)}
                          onSelect={() => handleAssociateContact(speaker.speakerNumber, contact.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              speaker.contactId === contact.id ? "opacity-100" : "opacity-0"
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
              </PopoverContent>
            </Popover>
          </div>
        </div>
      ))}
    </div>
  )
}