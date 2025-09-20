"use client";

import { MeetingAttendeeViewData } from "@/types";
import MultipleSelector, { Option } from "@/components/ui/multiselect";
import { getAllContacts } from "@/app/(workspace)/workspace/contacts/_lib/actions";
import { addMeetingAttendees, removeMeetingAttendees } from "@/actions/meetings";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface AttendeesSelectorProps {
    meetingId: string;
    meetingAttendees: MeetingAttendeeViewData[];
}

export default function AttendeesSelector({ meetingId, meetingAttendees }: AttendeesSelectorProps) {
    const [allContacts, setAllContacts] = useState<Option[]>([]);
    const [selectedAttendees, setSelectedAttendees] = useState<Option[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load all contacts for the dropdown
    useEffect(() => {
        const loadContacts = async () => {
            try {
                const contacts = await getAllContacts();
                const contactOptions: Option[] = contacts.map(contact => ({
                    value: contact.id,
                    label: contact.display_name || contact.first_name + ' ' + contact.last_name
                }));
                setAllContacts(contactOptions);
            } catch (error) {
                console.error('Error loading contacts:', error);
                toast.error('Failed to load contacts');
            }
        };
        loadContacts();
    }, []);

    // Convert meeting attendees to Option format for MultipleSelector and update selected attendees
    useEffect(() => {
        const currentAttendeeOptions: Option[] = meetingAttendees.map(attendee => ({
            value: attendee.contact_id || '',
            label: `${attendee.first_name} ${attendee.last_name}`.trim() || 
                   attendee.primary_email || 
                   'Unknown Attendee'
        }));
        setSelectedAttendees(currentAttendeeOptions);
    }, [meetingAttendees]);

    const handleAttendeeChange = async (newSelected: Option[]) => {
        setIsLoading(true);
        
        try {
            const currentAttendeeOptions: Option[] = meetingAttendees.map(attendee => ({
                value: attendee.contact_id || '',
                label: `${attendee.first_name} ${attendee.last_name}`.trim() || 
                       attendee.primary_email || 
                       'Unknown Attendee'
            }));
            
            const currentIds = new Set(currentAttendeeOptions.map((opt: Option) => opt.value));
            const newIds = new Set(newSelected.map((opt: Option) => opt.value));
            
            // Find attendees to add (in new but not in current)
            const attendeesToAdd = newSelected.filter((opt: Option) => !currentIds.has(opt.value));
            const contactIdsToAdd = attendeesToAdd.map((opt: Option) => opt.value);
            
            // Find attendees to remove (in current but not in new)
            const attendeesToRemove = currentAttendeeOptions.filter((opt: Option) => !newIds.has(opt.value));
            const attendeeIdsToRemove = attendeesToRemove.map((opt: Option) => {
                const attendee = meetingAttendees.find(a => a.contact_id === opt.value);
                return attendee?.id || '';
            }).filter((id: string) => id);

            // Add new attendees
            if (contactIdsToAdd.length > 0) {
                const addResult = await addMeetingAttendees(meetingId, contactIdsToAdd);
                if (addResult.error) {
                    toast.error(addResult.error);
                    return;
                }
                if (addResult.message) {
                    toast.success(addResult.message);
                }
            }

            // Remove attendees
            if (attendeeIdsToRemove.length > 0) {
                const removeResult = await removeMeetingAttendees(meetingId, attendeeIdsToRemove);
                if (removeResult.error) {
                    toast.error(removeResult.error);
                    return;
                }
                if (removeResult.message) {
                    toast.success(removeResult.message);
                }
            }

            setSelectedAttendees(newSelected);
        } catch (error) {
            console.error('Error updating attendees:', error);
            toast.error('Failed to update attendees');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-row gap-2 items-start font-extralight">
            <Users className="size-4 shrink-0 text-muted-foreground mt-2" />
            <div className="flex-1">
                <MultipleSelector
                    commandProps={{
                        label: "Manage attendees",
                    }}
                    value={selectedAttendees}
                    options={allContacts}
                    placeholder="Select attendees..."
                    className="font-extralight border-none bg-input/30"
                    hideClearAllButton
                    hidePlaceholderWhenSelected
                    emptyIndicator={<p className="text-center text-sm font-extralight">No contacts found</p>}
                    onChange={handleAttendeeChange}
                    disabled={isLoading}
                />
            </div>
        </div>
    );
}
