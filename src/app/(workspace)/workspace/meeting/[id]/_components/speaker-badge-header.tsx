"use client";

import { MeetingSpeakerWithContact } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useSpeakerUtils } from "@/hooks/use-speaker-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateMeetingSpeaker } from "@/actions/contacts";

interface SpeakerBadgeHeaderProps {
    meetingSpeakers: MeetingSpeakerWithContact[];
}

export default function SpeakerBadgeHeader({ meetingSpeakers }: SpeakerBadgeHeaderProps) {
    const { getSpeakerColor, getSpeakerDisplayName } = useSpeakerUtils(meetingSpeakers);
    const meetingId = meetingSpeakers[0]?.meeting_id;
    const [isPending, startTransition] = useTransition();
    
    // Fetch contacts when any popover opens (lazy-load per popover is fine, cached in state)
    const [contacts, setContacts] = useState<
        { id: string; first_name: string | null; last_name: string | null; display_name: string | null; primary_email: string | null; company: string | null }[]
    >([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);

    const loadContacts = async () => {
        if (loaded || loading) return;
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("new_contacts")
                .select("id, first_name, last_name, display_name, primary_email, company")
                .order("updated_at", { ascending: false });
            if (!error && data) {
                setContacts(data);
                setLoaded(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const getContactDisplayName = (c: { display_name: string | null; first_name: string | null; last_name: string | null; primary_email: string | null }) =>
        c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.primary_email || "Unknown Contact";

    return (
        <div className="sticky top-0 z-10 flex flex-row gap-2 items-center bg-card/80 backdrop-blur-lg border-1 border-border rounded-lg p-3">
            <span className="text-sm">Speakers:</span>
            <div className="flex flex-wrap gap-2">
                {meetingSpeakers.map((speaker) => (
                    <Popover key={speaker.speaker_index} onOpenChange={(open) => { if (open) loadContacts(); }}>
                        <PopoverTrigger>
                            <Badge
                                className={`${getSpeakerColor(speaker.speaker_index)} inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50`}
                            >
                                {getSpeakerDisplayName(speaker.speaker_index)}
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="rounded-xl">
                            <div className="flex flex-col gap-2">
                                {/* <Label className="text-sm">Joe</Label> */}
                                <ScrollArea className="h-fit w-full">
                                    <div className="flex flex-row gap-2">
                                        {Array.from({ length: 10 }, (_, index) => (
                                            <Badge key={index} variant="secondary">
                                                {`${((index + 1) * 0.09).toFixed(2)}s`}
                                            </Badge>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                            {/* Contact selection with search */}
                            <div className="mt-2">
                                <Command>
                                    <CommandInput placeholder="Search contacts..." />
                                    <CommandList>
                                        <CommandEmpty>{loading ? "Loading contacts..." : "No contacts found."}</CommandEmpty>
                                        <CommandGroup>
                                            {speaker.contact_id && (
                                                <CommandItem
                                                    value="remove"
                                                    className="text-destructive"
                                                    onSelect={() => {
                                                        if (!meetingId) return;
                                                        startTransition(async () => {
                                                            await updateMeetingSpeaker(meetingId, speaker.speaker_index, null);
                                                        });
                                                    }}
                                                >
                                                    <X className="mr-2 h-4 w-4" />
                                                    Remove association
                                                </CommandItem>
                                            )}
                                            {contacts.map((c) => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={`${getContactDisplayName(c)} ${c.company || ""}`.trim()}
                                                    onSelect={() => {
                                                        if (!meetingId) return;
                                                        startTransition(async () => {
                                                            await updateMeetingSpeaker(meetingId, speaker.speaker_index, c.id);
                                                        });
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            speaker.contact_id === c.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <div className="font-medium">{getContactDisplayName(c)}</div>
                                                        {c.company && (
                                                            <div className="text-xs text-muted-foreground">{c.company}</div>
                                                        )}
                                                        {c.primary_email && (
                                                            <div className="text-xs text-muted-foreground">{c.primary_email}</div>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </div>
                        </PopoverContent>
                    </Popover>
                ))}
            </div>
        </div>
    );
}
