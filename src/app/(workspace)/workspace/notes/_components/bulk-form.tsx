"use client";

import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { Users, Calendar, X, ArrowUpRight } from "lucide-react";
import { Contact, Meeting, NoteWithAssociations } from '../_lib/validations';
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import ComboboxSupabaseBulk from "@/components/supabase/_components/combobox-supabase-bulk";

export interface BulkNoteFormProps {
  /**
   * Array of note IDs to update
   */
  noteIds: string[];
  /**
   * List of available contacts for selection
   */
  availableContacts?: Contact[];
  /**
   * List of available meetings for selection
   */
  availableMeetings?: Meeting[];
  /**
   * Whether to use auto-save functionality
   */
  useAutoSave?: boolean;
  /**
   * Bulk update action function
   */
  updateActionMulti?: (ids: string[], data: Partial<NoteWithAssociations>) => Promise<{ success: boolean; error?: string; updatedCount?: number }>;
  /**
   * Callback fired when update succeeds
   */
  onSuccess?: () => void;
  /**
   * Custom CSS class name
   */
  className?: string;
}

export default function BulkNoteForm({
  noteIds = [],
  availableContacts = [],
  availableMeetings = [],
  useAutoSave = false,
  updateActionMulti,
  className
}: BulkNoteFormProps) {
  const router = useRouter();

  // For non-auto-save mode, we'd track form state here
  // For now, we're focusing on auto-save mode

  // Remove unused handleSuccess since auto-save handles success automatically

  // Create a wrapper function to handle type conversion for bulk update
  const wrappedUpdateAction = updateActionMulti ? async (ids: string[], data: { 
    contactIds?: string[]
    meetingIds?: string[]
    [key: string]: unknown
  }) => {
    // Convert the bulk update data format to match our action
    const convertedData: Partial<NoteWithAssociations> & { contactIds?: string[]; meetingIds?: string[] } = {};
    
    if (data.contactIds !== undefined) {
      convertedData.contactIds = data.contactIds;
    }
    if (data.meetingIds !== undefined) {
      convertedData.meetingIds = data.meetingIds;
    }
    
    // Add any other fields
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'contactIds' && key !== 'meetingIds') {
        (convertedData as Record<string, unknown>)[key] = value;
      }
    });
    
    return await updateActionMulti(ids, convertedData);
  } : undefined;

  if (!useAutoSave || !wrappedUpdateAction) {
    // Fallback for manual save mode - you could implement this later
    return (
      <div className={cn("@container flex flex-col gap-4 text-foreground w-full", className)}>
        <div className="text-center text-muted-foreground">
          <p>Manual bulk editing not implemented yet.</p>
          <p>Auto-save bulk editing is available when note IDs are provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("@container flex flex-col gap-4 text-foreground w-full", className)}>
      <div className="text-sm text-muted-foreground mb-4">
        Editing {noteIds.length} note{noteIds.length > 1 ? 's' : ''}. Changes are saved automatically.
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] text-muted-foreground">
          <Users className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Contacts</span>
        </div>
        <div className="w-full min-w-0">
          <ComboboxSupabaseBulk
            table="contact_notes"
            field="contact_id"
            noteIds={noteIds}
            initialValue={[]}
            options={availableContacts.map(contact => ({
              value: contact.id,
              label: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
              subLabel: contact.company?.name
            }))}
            placeholder="Add contacts to all selected notes..."
            searchPlaceholder="Search contacts..."
            emptyText="No contacts found."
            targetIdField="contact_id"
            bulkUpdateAction={wrappedUpdateAction!}
            renderBadge={(option, onRemove) => (
              <ContextMenu key={option.value}>
                <ContextMenuTrigger>
                  <Badge variant="blue" className="text-sm cursor-pointer">
                    {option.label}
                    <Button variant="ghost" size="icon" className="size-4" onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}>
                      <X className="size-4" />
                    </Button>
                  </Badge>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => router.push(`/workspace/contacts/${option.value}`)}>
                    View Contact
                    <ArrowUpRight className="size-4 shrink-0" />
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] text-muted-foreground">
          <Calendar className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Meetings</span>
        </div>
        <div className="w-full min-w-0">
          <ComboboxSupabaseBulk
            table="meeting_notes"
            field="meeting_id"
            noteIds={noteIds}
            initialValue={[]}
            options={availableMeetings.map(meeting => ({
              value: meeting.id,
              label: meeting.title || 'Untitled Meeting'
            }))}
            placeholder="Add meetings to all selected notes..."
            searchPlaceholder="Search meetings..."
            emptyText="No meetings found."
            targetIdField="meeting_id"
            bulkUpdateAction={wrappedUpdateAction!}
            renderBadge={(option, onRemove) => (
              <ContextMenu key={option.value}>
                <ContextMenuTrigger>
                  <Badge variant="green" className="text-sm cursor-pointer">
                    {option.label}
                    <Button variant="ghost" size="icon" className="size-4" onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}>
                      <X className="size-4" />
                    </Button>
                  </Badge>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => router.push(`/workspace/meetings/${option.value}`)}>
                    View Meeting
                    <ArrowUpRight className="size-4 shrink-0" />
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )}
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-md">
        <strong>Bulk Edit Behavior:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Selecting items will add them to ALL selected notes</li>
          <li>Removing items will remove them from ALL selected notes</li>
          <li>Changes are saved automatically</li>
          <li>Individual note associations may vary after bulk operations</li>
        </ul>
      </div>
    </div>
  );
} 