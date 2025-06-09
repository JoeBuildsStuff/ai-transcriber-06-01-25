"use client"

import { useEffect, useState } from "react"
import {  X, Copy, Check, ChevronDownIcon, PlusIcon } from "lucide-react"
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
import { MeetingEditModalProps } from "@/types"

export default function MeetingEditModal({ isOpen, onClose, meeting, onSave }: MeetingEditModalProps) {
  const [title, setTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || meeting.original_file_name || "");
      const meetingDate = new Date(meeting.meeting_at);
      setSelectedDate(meetingDate);
      setSelectedTime(format(meetingDate, "HH:mm:ss"));
    }
  }, [meeting]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleSave = () => {
    if (selectedDate && selectedTime) {
      const [hours, minutes, seconds] = selectedTime.split(':').map(Number);
      const meetingAt = new Date(selectedDate);
      meetingAt.setHours(hours, minutes, seconds);
      onSave({
        title,
        meeting_at: meetingAt.toISOString(),
      });
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
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={setDatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date"
                        className="w-full justify-between font-normal"
                      >
                        {selectedDate
                          ? selectedDate.toLocaleDateString()
                          : "Select date"}
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date)
                          setDatePickerOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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

                    {/* <div className="space-y-1">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Audio File Path
                      </Label>
                      <div className="flex items-center gap-2">
                        <code className="max-w-md truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                          {meeting.audio_file_path}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(meeting.audio_file_path, "path")
                          }
                          className="h-6 w-6 flex-shrink-0 p-0"
                        >
                          {copiedField === "path" ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Created
                        </Label>
                        <p className="text-sm">
                          {format(new Date(meeting.created_at), "PPP p")}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">
                          Last Updated
                        </Label>
                        <p className="text-sm">
                          {format(new Date(meeting.updated_at), "PPP p")}
                        </p>
                      </div>
                    </div> */}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </div>
        <CardFooter className="flex justify-end gap-3 border-t h-10">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
