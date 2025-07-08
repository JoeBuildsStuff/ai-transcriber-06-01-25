"use client"

import { useEffect, useState, useCallback } from "react"
import {  X, Copy, Check, PlusIcon, Users, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion"
import { MeetingEditModalProps, Contact, MeetingAttendeeWithContact } from "@/types"
import MultipleSelector, { Option } from "@/components/ui/multiselect"
// TODO: Align approach for actions as either @/actions or @/app/(workspace)/workspace/contacts/_lib/actions
import { getAllContacts } from "../../../contacts/_lib/queries"
import { getMeetingAttendees, addMeetingAttendees, removeMeetingAttendees } from "@/actions/meetings"
import { toast } from "sonner"

function formatDate(date: Date | undefined) {
  if (!date) {
    return ""
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false
  }
  return !isNaN(date.getTime())
}

export default function MeetingEditModal({ isOpen, onClose, meeting, onSave, onRefresh }: MeetingEditModalProps) {
  const [title, setTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [month, setMonth] = useState<Date | undefined>()
  const [dateValue, setDateValue] = useState("")
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Attendee management state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [currentAttendees, setCurrentAttendees] = useState<MeetingAttendeeWithContact[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<Option[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [, setIsLoadingAttendees] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [attendeesKey, setAttendeesKey] = useState(0)

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || meeting.original_file_name || "");
      const meetingDate = new Date(meeting.meeting_at || "");
      setSelectedDate(meetingDate);
      setMonth(meetingDate);
      setDateValue(formatDate(meetingDate));
      setSelectedTime(format(meetingDate, "HH:mm:ss"));
    }
  }, [meeting]);

  const loadContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const contactsData = await getAllContacts()
      setContacts(contactsData as Contact[])
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Failed to load contacts')
    } finally {
      setIsLoadingContacts(false)
    }
  }

  const loadCurrentAttendees = useCallback(async () => {
    if (!meeting) return
    
    setIsLoadingAttendees(true)
    try {
      const result = await getMeetingAttendees(meeting.id)
      if (result.error) {
        throw new Error(result.error)
      }
      
      const attendees = result.data as MeetingAttendeeWithContact[]
      setCurrentAttendees(attendees)
      
      // Convert current attendees to selected options
      const attendeeOptions = attendees.map(attendee => ({
        value: attendee.contact_id,
        label: getContactDisplayName(attendee.contacts),
        fixed: false
      }))
      setSelectedAttendees(attendeeOptions)
      // Force re-render of MultipleSelector to fix badge layout
      setAttendeesKey(prev => prev + 1)
    } catch (error) {
      console.error('Error loading attendees:', error)
      toast.error('Failed to load current attendees')
    } finally {
      setIsLoadingAttendees(false)
    }
  }, [meeting])

  // Load contacts and current attendees when modal opens
  useEffect(() => {
    if (isOpen && meeting) {
      loadContacts()
      loadCurrentAttendees()
    }
  }, [isOpen, meeting, loadCurrentAttendees])

  const getContactDisplayName = (contact: Contact): string => {
    return contact.display_name || 
           `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
           contact.primary_email || 
           'Unknown Contact'
  }

  const getContactOptions = (): Option[] => {
    return contacts.map(contact => ({
      value: contact.id,
      label: getContactDisplayName(contact),
      company: contact.company || undefined,
    }))
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time')
      return
    }

    setIsSaving(true)
    try {
      const [hours, minutes, seconds] = selectedTime.split(':').map(Number);
      const meetingAt = new Date(selectedDate);
      meetingAt.setHours(hours, minutes, seconds);

      // Determine which attendees to add/remove
      const currentAttendeeContactIds = currentAttendees.map(a => a.contact_id)
      const selectedAttendeeIds = selectedAttendees.map(a => a.value)
      
      const attendeesToAdd = selectedAttendeeIds.filter(id => !currentAttendeeContactIds.includes(id))
      const attendeesToRemove = currentAttendees
        .filter(attendee => !selectedAttendeeIds.includes(attendee.contact_id))
        .map(attendee => attendee.id)

      // Add new attendees
      if (attendeesToAdd.length > 0) {
        const addResult = await addMeetingAttendees(meeting!.id, attendeesToAdd)
        if (addResult.error) {
          throw new Error(addResult.error)
        }
      }

      // Remove attendees
      if (attendeesToRemove.length > 0) {
        const removeResult = await removeMeetingAttendees(meeting!.id, attendeesToRemove)
        if (removeResult.error) {
          throw new Error(removeResult.error)
        }
      }

      // Refresh attendees and parent meeting data after attendee changes
      await loadCurrentAttendees();
      if (onRefresh) {
        await onRefresh();
      }

      // Save meeting details (attendees are handled separately above)
      onSave({
        title,
        meeting_at: meetingAt.toISOString()
      });
       
       toast.success('Meeting updated successfully')
    } catch (error) {
      console.error('Error saving meeting:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      toast.error(`Failed to save meeting: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }
  
  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col relative">
        <CardHeader className="">
   
            <CardTitle>Edit Meeting Details</CardTitle>
            <CardDescription className="">
              Modify the details for your meeting. Click save when you&apos;re
              done.
            </CardDescription>
 
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <div className="flex-1 overflow-y-auto">
          <CardContent className="space-y-6">
            {/* Editable Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Meeting Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-base"
                  placeholder="Enter meeting title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">
                    Meeting Date
                  </Label>
                  <div className="relative flex">
                    <Input
                      id="date"
                      value={dateValue}
                      placeholder="today"
                      className="bg-background pr-10"
                      onChange={(e) => {
                        const date = new Date(e.target.value)
                        setDateValue(e.target.value)
                        if (isValidDate(date)) {
                          setSelectedDate(date)
                          setMonth(date)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowDown") {
                          e.preventDefault()
                          setDatePickerOpen(true)
                        }
                      }}
                    />
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                        >
                          <CalendarIcon className="size-3.5" />
                          <span className="sr-only">Select date</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="end"
                        alignOffset={-8}
                        sideOffset={10}
                      >
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          captionLayout="dropdown"
                          month={month}
                          onMonthChange={setMonth}
                          onSelect={(date) => {
                            setSelectedDate(date)
                            setDateValue(formatDate(date))
                            setDatePickerOpen(false)
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium">
                    Meeting Time
                  </Label>
                  <Input
                    type="time"
                    id="time"
                    step="1"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Attendees Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Meeting Attendees
                </Label>
                <MultipleSelector
                  key={attendeesKey}
                  value={selectedAttendees}
                  onChange={setSelectedAttendees}
                  options={getContactOptions()}
                  placeholder="Select attendees..."
                  className="[&_[data-state=open]]:z-[60]"
                  badgeClassName="!pe-7"
                  emptyIndicator={
                    isLoadingContacts ? (
                      <p className="text-center text-gray-600">Loading contacts...</p>
                    ) : (
                      <p className="text-center text-gray-600">No contacts found.</p>
                    )
                  }
                  maxSelected={50}
                  onMaxSelected={(maxLimit) => {
                    toast.error(`You can only select up to ${maxLimit} attendees.`)
                  }}
                  groupBy="company"
                  commandProps={{
                    filter: (value, search) => {
                      // Find the option by value (contact ID)
                      const option = getContactOptions().find(opt => opt.value === value)
                      if (!option) return 0
                      
                      // Search in the label (contact name) instead of value (contact ID)
                      const searchTerm = search.toLowerCase()
                      const label = option.label.toLowerCase()
                      
                      // Also search in company name if available
                      const company = (typeof option.company === 'string' ? option.company : '').toLowerCase()
                      
                      if (label.includes(searchTerm) || company.includes(searchTerm)) {
                        return 1
                      }
                      
                      return 0
                    }
                  }}
                />
                {selectedAttendees.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedAttendees.length} attendee(s) selected
                  </p>
                )}
              </div>
            </div>

            {/* Meeting Details */}
            <Accordion type="single" collapsible className="w-full border border-border rounded-md p-4">
              <AccordionItem
                value="item-1"
              >
                <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger className="ocus-visible:ring-0 flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none [&>svg>path:last-child]:origin-center [&>svg>path:last-child]:transition-all [&>svg>path:last-child]:duration-200 [&[data-state=open]>svg]:rotate-180 [&[data-state=open]>svg>path:last-child]:rotate-90 [&[data-state=open]>svg>path:last-child]:opacity-0">
                <span>Additional Details</span>
                <PlusIcon
                  size={16}
                  className="pointer-events-none shrink-0 opacity-60 transition-transform duration-200"
                  aria-hidden="true"
                />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionContent className="text-muted-foreground pb-2">
                  <div className="grid gap-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Meeting ID
                        </Label>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                            {meeting.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(meeting.id, "id")}
                            className="h-6 w-6 p-0"
                          >
                            {copiedField === "id" ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Original File
                      </Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {meeting.original_file_name}
                        </Badge>
                      </div>
                    </div>

                    {/* Current Attendees Display */}
                    {currentAttendees.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Current Attendees ({currentAttendees.length})
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {currentAttendees.map((attendee) => (
                            <Badge 
                              key={attendee.id} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {getContactDisplayName(attendee.contacts)}
                              {attendee.role === 'organizer' && (
                                <span className="ml-1 text-blue-600">👑</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </div>
        <CardFooter className="flex justify-end gap-3 border-t h-10">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
