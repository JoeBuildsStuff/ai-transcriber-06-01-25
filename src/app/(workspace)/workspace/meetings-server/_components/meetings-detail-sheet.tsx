"use client"

import { Button } from "@/components/ui/button"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { PencilRuler, Calendar, Clock } from "lucide-react"
import { MeetingsDetail, MeetingsList } from "../_lib/validations"
import { useEffect, useState } from "react"
import { getMeeting } from "../_lib/actions"
import { format, formatDistanceToNow } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import UserNotes from "@/app/(workspace)/workspace/meetings-server/[meetingId]/_components/user-notes"
import Summary from "@/components/summary"
import { Card, CardContent } from "@/components/ui/card"



export function MeetingsDetailSheet({ meeting }: { meeting: MeetingsList }) {
  const [fullMeetingData, setFullMeetingData] = useState<MeetingsDetail | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && !fullMeetingData) {
      getMeeting(meeting.id).then(({ data }) => {
        if (data) {
          setFullMeetingData(data)
        }
      })
    }
  }, [isOpen, meeting.id, fullMeetingData])

  const displayData = fullMeetingData || meeting

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilRuler className="size-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent className="pb-4">
        <Tabs defaultValue="summary" className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{displayData.title || "Meeting Details"}</SheetTitle>
            <SheetDescription>
              {displayData.meeting_at ? (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4" />
                  {format(new Date(displayData.meeting_at), 'EEE, MMM d')}
                  <Clock className="size-4 ml-2" />
                  {format(new Date(displayData.meeting_at), 'h:mm a')}
                  <span className="text-muted-foreground">
                    ({formatDistanceToNow(new Date(displayData.meeting_at), { addSuffix: true })})
                  </span>
                </div>
              ) : (
                "Details for the meeting."
              )}
            </SheetDescription>
          </SheetHeader>
          
          <div className="px-4">
            <TabsList>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-4">
              <TabsContent value="transcript">

              </TabsContent>

              <TabsContent value="summary">
                <Card className="h-full">
                  <CardContent className="">
                    {fullMeetingData ? (
                      fullMeetingData.summary_jsonb ? (
                        <Summary summary={fullMeetingData.summary_jsonb as Record<string, string>} />
                      ) : (
                        <p className="text-center text-muted-foreground p-4">No summary available for this meeting.</p>
                      )
                    ) : (
                      <div className="text-muted-foreground">Loading summary...</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
              {fullMeetingData ? (
                <UserNotes userNotes={fullMeetingData.user_notes} meetingId={fullMeetingData.id} />
              ) : (
                <div className="text-muted-foreground">Loading notes...</div>
              )}
              </TabsContent>
            </div>
          </div>
          
          {/* <SheetFooter className="">
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter> */}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
