"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Trash2 } from "lucide-react";
import { deleteMeetings } from "../_lib/actions";
import { toast } from "sonner";

interface MeetingDeleteProps {
    meetingId: string;
}

export default function MeetingDelete({ meetingId }: MeetingDeleteProps) {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleFirstClick = () => {
        setShowConfirmation(true);
    };

    const handleCancel = () => {
        setShowConfirmation(false);
    };

    const handleConfirmDelete = async () => {
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
                setShowConfirmation(false);
            }
        } catch (error) {
            console.error("Error deleting meeting:", error);
            toast.error("Failed to delete meeting", {
                description: "An unexpected error occurred"
            });
            setShowConfirmation(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (showConfirmation) {
        return (
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCancel}
                    disabled={isDeleting}
                >
                    <ChevronLeft className="size-4" />
                </Button>
                <Button 
                    variant="red" 
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                >
                    <span className="flex items-center gap-2">
                        <Trash2 className="size-4 shrink-0"  />
                        <span className="font-extralight">{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
                    </span>
                </Button>
            </div>
        );
    }

    return (
        <div>
            <Button variant="outline" size="icon" onClick={handleFirstClick}>
                <Trash2 className="size-4 shrink-0 text-muted-foreground" />
            </Button>
        </div>
    );
}