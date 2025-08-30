"use client";

import { MeetingSpeakerWithContact, FormattedTranscriptGroup } from "@/types";

import { useSpeakerUtils } from "@/hooks/use-speaker-utils";
import { getAllContacts } from "@/app/(workspace)/workspace/contacts/_lib/actions";
import { updateMeetingSpeaker } from "@/actions/contacts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useTransition } from "react";
import { Separator } from "@/components/ui/separator";
import { SearchIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SpeakerBadgeHeaderProps {
    meetingSpeakers: MeetingSpeakerWithContact[];
    meetingId: string;
    onSpeakersUpdate: (speakers: MeetingSpeakerWithContact[]) => void;
    formattedTranscript?: FormattedTranscriptGroup[];
    onSeekAndPlay?: (time: number) => void;
}

interface Contact {
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    primary_email: string;
    company: string;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
}

export default function SpeakerBadgeHeader({ 
    meetingSpeakers, 
    meetingId, 
    onSpeakersUpdate,
    formattedTranscript,
    onSeekAndPlay
}: SpeakerBadgeHeaderProps) {
    const { getSpeakerColor, getSpeakerDisplayName } = useSpeakerUtils(meetingSpeakers);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [, startTransition] = useTransition();

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    };

    const getSpeakerTimestamps = (speakerIndex: number) => {
        if (!formattedTranscript) return [];
        
        // Get all segments for this speaker
        const speakerSegments = formattedTranscript.filter(segment => segment.speaker === speakerIndex);
        
        // Calculate duration for each segment by finding the next segment in the full transcript
        const segmentsWithDuration = speakerSegments.map((segment) => {
            // Find the index of this segment in the full transcript
            const segmentIndex = formattedTranscript.findIndex(s => 
                s.speaker === segment.speaker && s.start === segment.start && s.text === segment.text
            );
            
            // Get the next segment in the full transcript (regardless of speaker)
            const nextSegment = formattedTranscript[segmentIndex + 1];
            const nextStartTime = nextSegment ? nextSegment.start : segment.start + 5; // Default 5 seconds if no next segment
            const duration = nextStartTime - segment.start;
            
            return {
                start: segment.start,
                duration: duration,
                text: segment.text
            };
        });
        
        // Sort by duration (longest first) and return segments with duration info
        return segmentsWithDuration
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10); // Limit to first 10 timestamps
    };

    useEffect(() => {
        const loadContacts = async () => {
            setIsLoading(true);
            try {
                const contactsData = await getAllContacts();
                setContacts(contactsData);
                setFilteredContacts(contactsData);
            } catch (error) {
                console.error('Error loading contacts:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadContacts();
    }, []);

    // Filter contacts based on search term
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredContacts(contacts);
        } else {
            const filtered = contacts.filter(contact => 
                contact.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.primary_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.company.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredContacts(filtered);
        }
    }, [searchTerm, contacts]);

    const handleAssociateContact = (speakerIndex: number, contactId: string | null) => {
        startTransition(async () => {
            try {
                await updateMeetingSpeaker(meetingId, speakerIndex, contactId);
                
                // Update the speakers list
                const updatedSpeakers = meetingSpeakers.map(speaker => {
                    if (speaker.speaker_index === speakerIndex) {
                        if (contactId) {
                            const contact = contacts.find(c => c.id === contactId);
                            return { 
                                ...speaker, 
                                contact_id: contactId, 
                                contact: contact ? {
                                    ...contact,
                                    created_at: contact.created_at || '',
                                    updated_at: contact.updated_at || '',
                                    user_id: contact.user_id || ''
                                } : null
                            };
                        } else {
                            return { ...speaker, contact_id: null, contact: null };
                        }
                    }
                    return speaker;
                });
                
                onSpeakersUpdate(updatedSpeakers);
                toast.success('Speaker association updated successfully');
            } catch (error) {
                console.error('Error updating speaker association:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to update speaker association';
                toast.error(errorMessage);
            }
        });
    };

    return (
        <div className="sticky top-0 z-10 flex flex-row gap-2 items-center bg-card/80 backdrop-blur-lg border-1 border-border rounded-lg p-3 font-extralight">
            <span className="text-sm font-extralight">Speakers:</span>
            <div className="flex flex-wrap gap-2">
                {meetingSpeakers.map((speaker) => (
                    <Popover key={speaker.speaker_index}>
                        <PopoverTrigger>
                            <Badge
                                className={`${getSpeakerColor(speaker.speaker_index)} inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 font-extralight`}
                            >
                                {getSpeakerDisplayName(speaker.speaker_index)}
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="rounded-2xl gap-2 flex flex-col w-[20rem] h-[29rem] p-2.5 relative">
                                <ScrollArea className="h-fit w-full">
                                    <div className="flex flex-row gap-2">
                                        {getSpeakerTimestamps(speaker.speaker_index).length > 0 ? (
                                            getSpeakerTimestamps(speaker.speaker_index).map((segment, index) => (
                                                <TooltipProvider key={index}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="cursor-pointer font-extralight"
                                                                onClick={() => onSeekAndPlay?.(segment.start)}
                                                            >
                                                                <Badge 
                                                                    variant="secondary"
                                                                    className="hover:bg-secondary/80 font-extralight"
                                                                >
                                                                    {formatTime(segment.start)}
                                                                </Badge>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="font-extralight">
                                                            <p className="font-extralight">Jump to {formatTime(segment.start)} ({segment.duration.toFixed(1)}s)</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))
                                        ) : (
                                            <div className="text-sm font-extralight">
                                                No speaking segments found
                                            </div>
                                        )}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                <div className="flex flex-col gap-2">
                                    <div className="relative">
                                        <Input
                                            placeholder="Search contacts..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="peer ps-9 pe-9 text-sm font-extralight"
                                        />
                                        <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                                            <SearchIcon size={16} />
                                        </div>
                                        {searchTerm && (
                                            <Button variant="ghost" size="icon" onClick={() => setSearchTerm("")} className="text-muted-foreground/80 absolute inset-y-0 end-0 flex items-center justify-center pe-3 peer-disabled:opacity-50">
                                                <X size={16} />
                                            </Button>
                                        )}
                                    </div>
                                    <ScrollArea className="h-[20rem] w-full">
                                        <div className="flex flex-col gap-2">
                                            {isLoading ? (
                                                <div className="text-sm text-muted-foreground">Loading contacts...</div>
                                            ) : filteredContacts.length > 0 ? (
                                                <>
                                                    {/* Remove association option if speaker has a contact */}
                                                    {speaker.contact_id && (
                                                        <div 
                                                            className="flex flex-col gap-1 p-2 rounded-md border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer transition-colors font-extralight"
                                                            onClick={() => handleAssociateContact(speaker.speaker_index, null)}
                                                        >
                                                            <div className="text-sm text-destructive flex items-center gap-2 font-extralight">
                                                                <X size={14} />
                                                                Remove association
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Contact list */}
                                                    {filteredContacts.map((contact) => {
                                                        const isSelected = speaker.contact_id === contact.id;
                                                        return (
                                                            <div 
                                                                key={contact.id} 
                                                                className={cn(
                                                                    "flex flex-col gap-1 p-2 rounded-md border cursor-pointer transition-colors font-extralight",
                                                                    isSelected 
                                                                        ? 'bg-secondary border-primary' 
                                                                        : 'hover:bg-secondary/50'
                                                                )}
                                                                onClick={() => handleAssociateContact(speaker.speaker_index, contact.id)}
                                                            >
                                                                <div className="text-sm font-extralight">
                                                                    {contact.display_name}
                                                                </div>
                                                                {contact.primary_email && (
                                                                    <div className="text-xs text-muted-foreground font-extralight">
                                                                        {contact.primary_email}
                                                                    </div>
                                                                )}
                                                                {contact.company && (
                                                                    <div className="text-xs text-muted-foreground font-extralight">
                                                                        {contact.company}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            ) : searchTerm ? (
                                                <div className="text-sm text-muted-foreground font-extralight">No contacts match your search</div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground font-extralight">No contacts found</div>
                                            )}
                                        </div>
                                        <ScrollBar orientation="vertical" />
                                    </ScrollArea>
                                </div>
                                <Separator className="absolute bottom-13.5 -mx-2.5"  />
                                {/* TODO: Enable this button to create a new contact */}
                                <Button variant="secondary" className="w-full rounded-t-none rounded-b-lg border border-border font-extralight mt-1">
                                    Add new contact
                                </Button>
                        </PopoverContent>
                    </Popover>
                ))}
            </div>
        </div>
    );
}
