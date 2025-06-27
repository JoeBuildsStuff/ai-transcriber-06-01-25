"use client"

import { createClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Search, Calendar as CalendarIcon, Users, Copy, CheckCheck, X, Filter, FileText } from "lucide-react"
import { formatDistanceToNow, format, isWithinInterval, parseISO, isValid } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Json } from "@/types/supabase"

interface FormattedTranscript {
  text: string
  start: number
  speaker: number
}

interface Meeting {
  id: string
  summary: string | null
  speaker_names: Record<string, string> | null
  created_at: string
  title?: string | null
  summary_jsonb?: Json | null
  meeting_at?: string | null
  formatted_transcript?: FormattedTranscript[] | null
}

interface Contact {
  id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
}

interface MeetingWithContacts extends Meeting {
  contactNames: string[]
}

export default function RecentMeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingWithContacts[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingWithContacts[]>([])
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  // Utility function to get contact display name
  const getContactDisplayName = (contact: Contact): string => {
    return contact.display_name || 
           `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
           'Unknown Contact'
  }

  // Function to truncate summary text
  const truncateSummary = (summary: string | null, maxLength: number = 200): string => {
    if (!summary) return 'No summary available'
    if (summary.length <= maxLength) return summary
    return summary.substring(0, maxLength).trim() + '...'
  }

  // Function to get contact names for a meeting
  const getContactNamesForMeeting = (meeting: Meeting): string[] => {
    if (!meeting.speaker_names) return []
    
    const contactIds = Object.values(meeting.speaker_names)
    return contactIds
      .map(contactId => {
        const contact = contacts.find(c => c.id === contactId)
        return contact ? getContactDisplayName(contact) : null
      })
      .filter((name): name is string => name !== null)
  }

  // Function to check if meeting is within date range
  const isMeetingInDateRange = (meeting: Meeting): boolean => {
    if (!startDate && !endDate) return true
    if (!meeting.meeting_at) return !startDate && !endDate // If no meeting date, only show if no date filter is applied
    
    try {
      const meetingDate = parseISO(meeting.meeting_at)
      if (!isValid(meetingDate)) return !startDate && !endDate
      
      // If only start date is set
      if (startDate && !endDate) {
        return meetingDate >= startDate
      }
      
      // If only end date is set
      if (!startDate && endDate) {
        return meetingDate <= endDate
      }
      
      // If both dates are set
      if (startDate && endDate) {
        return isWithinInterval(meetingDate, { start: startDate, end: endDate })
      }
      
      return true
    } catch (error) {
      console.error('Error parsing meeting date:', error)
      return !startDate && !endDate
    }
  }

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  // Handle individual meeting selection
  const handleMeetingSelect = (meetingId: string, checked: boolean) => {
    const newSelection = new Set(selectedMeetings)
    if (checked) {
      newSelection.add(meetingId)
    } else {
      newSelection.delete(meetingId)
    }
    setSelectedMeetings(newSelection)
  }

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedMeetings.size === filteredMeetings.length) {
      setSelectedMeetings(new Set())
    } else {
      setSelectedMeetings(new Set(filteredMeetings.map(m => m.id)))
    }
  }

  // Copy selected meetings' summary JSON to clipboard
  const handleCopyToClipboard = async () => {
    const selectedMeetingData = filteredMeetings.filter(meeting => 
      selectedMeetings.has(meeting.id)
    )

    if (selectedMeetingData.length === 0) {
      toast.error("No meetings selected")
      return
    }

    try {
      const summariesData = selectedMeetingData.map(meeting => ({
        id: meeting.id,
        title: meeting.title || 'Untitled Meeting',
        created_at: meeting.created_at,
        meeting_at: meeting.meeting_at,
        summary_json: meeting.summary_jsonb || null
      }))

      const dataToClipboard = selectedMeetingData.length === 1 
        ? JSON.stringify(summariesData[0].summary_json, null, 2)
        : JSON.stringify(summariesData, null, 2)

      await navigator.clipboard.writeText(dataToClipboard)
      
      toast.success(
        selectedMeetingData.length === 1 
          ? "Summary JSON copied to clipboard"
          : `${selectedMeetingData.length} meeting summaries copied to clipboard`
      )
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      toast.error("Failed to copy to clipboard")
    }
  }

  // Copy selected meetings' transcript to clipboard
  const handleCopyTranscript = async () => {
    const selectedMeetingData = filteredMeetings.filter(meeting => 
      selectedMeetings.has(meeting.id)
    )

    if (selectedMeetingData.length === 0) {
      toast.error("No meetings selected")
      return
    }

    let fullTranscriptText = ""

    for (const meeting of selectedMeetingData) {
      if (meeting.formatted_transcript && Array.isArray(meeting.formatted_transcript) && meeting.formatted_transcript.length > 0) {
        if (selectedMeetingData.length > 1) {
          fullTranscriptText += `--- Transcript for: ${meeting.title || 'Untitled Meeting'} ---\n\n`
        }
        
        const transcriptWithSpeakers = (meeting.formatted_transcript as FormattedTranscript[]).map(segment => {
          const speakerId = meeting.speaker_names?.[segment.speaker.toString()]
          const contact = contacts.find(c => c.id === speakerId)
          const speakerName = contact ? getContactDisplayName(contact) : `Speaker ${segment.speaker}`
          return `${speakerName}: ${segment.text}`
        }).join('\n')
        
        fullTranscriptText += transcriptWithSpeakers + '\n\n'
      }
    }

    if (fullTranscriptText.trim() === "") {
      toast.error("No transcripts available for selected meetings.")
      return
    }

    try {
      await navigator.clipboard.writeText(fullTranscriptText.trim())
      toast.success(
        selectedMeetingData.length === 1
          ? "Transcript copied to clipboard"
          : `${selectedMeetingData.filter(m => m.formatted_transcript).length} transcripts copied to clipboard`
      )
    } catch (error) {
      console.error('Failed to copy transcript to clipboard:', error)
      toast.error("Failed to copy transcript to clipboard")
    }
  }

  // Load data on component mount
  useEffect(() => {
    async function loadData() {
      try {
        const supabase = await createClient()

        // Fetch meetings
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('id, summary, speaker_names, created_at, title, summary_jsonb, meeting_at, formatted_transcript')
          .order('created_at', { ascending: false })
          .limit(50) // Increased limit since we now have date filtering

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError)
          return
        }

        // Fetch contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('id, display_name, first_name, last_name')
          .order('created_at', { ascending: false })

        if (contactsError) {
          console.error('Error fetching contacts:', contactsError)
          return
        }

        setContacts(contactsData || [])
        
        // Process meetings with contact information
        const processedMeetings = (meetingsData || []).map(meeting => ({
          ...meeting,
          speaker_names: meeting.speaker_names as Record<string, string> | null,
          created_at: meeting.created_at || new Date().toISOString(),
          contactNames: [],
          formatted_transcript: meeting.formatted_transcript as FormattedTranscript[] | null
        }))
        
        setMeetings(processedMeetings)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Update contact names when contacts are loaded
  useEffect(() => {
    if (contacts.length > 0) {
      const updatedMeetings = meetings.map(meeting => ({
        ...meeting,
        contactNames: getContactNamesForMeeting(meeting)
      }))
      setMeetings(updatedMeetings)
    }
  }, [contacts])

  // Filter meetings based on search term and date range
  useEffect(() => {
    let filtered = meetings

    // Apply date range filter first
    filtered = filtered.filter(isMeetingInDateRange)

    // Then apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(meeting => {
        // Search in contact names
        const hasMatchingContact = meeting.contactNames.some(name => 
          name.toLowerCase().includes(searchLower)
        )
        
        // Search in summary
        const hasMatchingSummary = meeting.summary?.toLowerCase().includes(searchLower)
        
        // Search in title
        const hasMatchingTitle = meeting.title?.toLowerCase().includes(searchLower)
        
        return hasMatchingContact || hasMatchingSummary || hasMatchingTitle
      })
    }

    setFilteredMeetings(filtered)
  }, [searchTerm, meetings, startDate, endDate])

  // Clear selection when filtered meetings change
  useEffect(() => {
    setSelectedMeetings(new Set())
  }, [filteredMeetings])

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const hasSelection = selectedMeetings.size > 0
  const isAllSelected = selectedMeetings.size === filteredMeetings.length && filteredMeetings.length > 0
  const hasDateFilter = startDate || endDate
  
  const selectedWithTranscripts = filteredMeetings
    .filter(m => selectedMeetings.has(m.id) && m.formatted_transcript && m.formatted_transcript.length > 0)
    .length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Recent Meetings</h1>
        <p className="text-muted-foreground">
          Browse and search through your recent meeting summaries
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by contact name, summary, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by meeting date:</span>
          </div>
          
          {/* Start Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => endDate ? date > endDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* End Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => startDate ? date < startDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear Date Filters */}
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={clearDateFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear dates
            </Button>
          )}
        </div>

        {/* Selection Controls */}
        {filteredMeetings.length > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
              />
              <label 
                htmlFor="select-all" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Select All
              </label>
            </div>

            {hasSelection && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON ({selectedMeetings.size})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopyTranscript}
                  className="flex items-center gap-2"
                  disabled={selectedWithTranscripts === 0}
                >
                  <FileText className="h-4 w-4" />
                  Copy Transcript ({selectedWithTranscripts})
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMeetings(new Set())}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {searchTerm || hasDateFilter ? (
          <>Showing {filteredMeetings.length} of {meetings.length} meetings</>
        ) : (
          <>Showing {meetings.length} recent meetings</>
        )}
        {hasSelection && (
          <> • {selectedMeetings.size} selected</>
        )}
        {hasDateFilter && (
          <> • Filtered by date: {startDate ? format(startDate, "MMM d, yyyy") : "Start"} - {endDate ? format(endDate, "MMM d, yyyy") : "End"}</>
        )}
      </div>

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {searchTerm || hasDateFilter ? (
                  <>No meetings found matching your filters</>
                ) : (
                  <>No meetings found</>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => (
            <Card 
              key={meeting.id} 
              className={`hover:shadow-md transition-shadow ${
                selectedMeetings.has(meeting.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedMeetings.has(meeting.id)}
                    onCheckedChange={(checked) => handleMeetingSelect(meeting.id, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">
                        {meeting.title || 'Untitled Meeting'}
                      </CardTitle>
                      <div className="flex flex-col items-end text-sm text-muted-foreground">
                        {/* Created at */}
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })}
                        </div>
                        {/* Meeting date */}
                        {meeting.meeting_at && (
                          <div className="text-xs mt-1">
                            Meeting: {format(parseISO(meeting.meeting_at), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Contact Names */}
                    {meeting.contactNames.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {meeting.contactNames.map((name, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {/* Summary JSON indicator */}
                      {meeting.summary_jsonb && (
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCheck className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600">Summary JSON available</span>
                        </div>
                      )}

                      {/* Transcript available indicator */}
                      {meeting.formatted_transcript && meeting.formatted_transcript.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs text-indigo-600">Transcript available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 pl-12">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {truncateSummary(meeting.summary)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}