'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PencilRuler, SquareArrowOutUpRight, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

import { MeetingCardSummary } from "@/types"
import MeetingEditModal from "../[meetingId]/_components/meeting-edit-modal"
import Link from "next/link"

interface EditMeetingButtonsProps {
  meeting: MeetingCardSummary
  onMeetingUpdate: (meeting: Partial<MeetingCardSummary>) => void
  onMeetingDelete?: (meetingId: string) => void
}

export default function EditMeetingButtons({
  meeting,
  onMeetingUpdate,
  onMeetingDelete,
}: EditMeetingButtonsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDeleteMeeting = async () => {
    if (!meeting.id) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'DELETE',
      });
      const responseData = await response.json(); 

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete meeting');
      }

      toast.success('Meeting deleted successfully!');
      onMeetingDelete?.(meeting.id);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error("Error deleting meeting:", err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      toast.error('Failed to delete meeting', { description: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 ">
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <Link href={`/workspace/meetings/${meeting.id}`}>
          <SquareArrowOutUpRight className="w-4 h-4 shrink-0" />
        </Link>
      </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
        >
          <PencilRuler className="w-4 h-4 shrink-0" />
        </Button>

      {isEditModalOpen && (
        <MeetingEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          meeting={meeting}
          onSave={handleSaveMeeting}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting transcript, summary, and the original audio file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMeeting} disabled={isDeleting} className="bg-red-50 text-red-700 shadow-xs hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 focus-visible:ring-red-600/20 dark:focus-visible:ring-red-600/40 ring-1 ring-inset ring-red-600/10 dark:ring-red-600/30">
              {isDeleting ? 'Deleting...' : 'Yes, delete meeting'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        <Trash2 className="w-4 h-4 shrink-0" />
      </Button>
    </div>
  )
}