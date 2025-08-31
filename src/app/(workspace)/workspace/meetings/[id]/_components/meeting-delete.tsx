"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMeetings } from "../_lib/actions";
import { toast } from "sonner";
import DeleteButton from "@/components/ui/delete-button";

interface MeetingDeleteProps {
    meetingId: string;
}

export default function MeetingDelete({ meetingId }: MeetingDeleteProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        
        try {
            const result = await deleteMeetings([meetingId]);
            
            if (result.success) {
                toast.success("Meeting deleted successfully!", {
                    description: `${result.deletedCount} meeting has been removed.`
                });
                
                // Navigate back to meetings list after successful deletion
                router.push("/workspace/meetings");
            } else {
                toast.error("Failed to delete meeting", {
                    description: result.error
                });
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Error deleting meeting:", error);
            toast.error("Failed to delete meeting", {
                description: "An unexpected error occurred"
            });
            throw error; // Re-throw to let DeleteButton handle the confirmation state
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <DeleteButton 
            onDelete={handleDelete}
            isLoading={isDeleting}
            confirmText="Confirm Delete"
            size="icon"
        />
    );
}