'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PencilRuler } from "lucide-react"

import { toast } from "sonner"

import { MeetingCardSummary } from "@/types"
import MeetingEditModal from "../[meetingId]/_components/meeting-edit-modal"

interface EditMeetingButtonsProps {
  meeting: MeetingCardSummary
  onMeetingUpdate: (meeting: Partial<MeetingCardSummary>) => void
}

export default function EditMeetingButtons({
  meeting,
  onMeetingUpdate,
}: EditMeetingButtonsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)


  const handleSaveMeeting = async (details: {
    title: string
    meeting_at: string
  }) => {
    const response = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    })

    if (response.ok) {
      const { meeting: updatedMeeting } = await response.json()
      onMeetingUpdate(updatedMeeting)
      toast.success("Meeting details updated successfully.")
      setIsEditModalOpen(false)
    } else {
      const { error } = await response.json()
      toast.error("Failed to update meeting", { description: error })
    }
  }

  return (
    <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
        >
          <PencilRuler className="w-4 h-4" />
        </Button>

      {isEditModalOpen && (
        <MeetingEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          meeting={meeting}
          onSave={handleSaveMeeting}
        />
      )}
    </>
  )
}