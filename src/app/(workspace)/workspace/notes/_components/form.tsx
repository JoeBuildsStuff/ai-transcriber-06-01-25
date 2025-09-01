"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { File, Users, Calendar, Type, X, ArrowUpRight } from "lucide-react";
import { Contact, Meeting } from '../_lib/validations';
import { Button } from "@/components/ui/button";
import PersonForm from "../../contacts/_components/form";
import { createPerson } from "../../contacts/_lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotesContent from "../../notes/[id]/_components/notes-content";
import InputSupabase from "@/components/supabase/_components/input-supabase";
import ComboboxSupabase from "@/components/supabase/_components/combobox-supabase";
import { deleteNotes } from "../_lib/actions";
import { DeleteButton } from "@/components/ui/delete-button";

export interface NoteFormProps {
  /**
   * Initial note ID (can be temporary for new notes)
   */
  initialNoteId?: string;
  /**
   * Initial title value
   */
  initialTitle?: string;
  /**
   * Initial content value
   */
  initialContent?: string;
  /**
   * Initial contact IDs
   */
  initialContactIds?: string[];
  /**
   * Initial meeting IDs
   */
  initialMeetingIds?: string[];
  /**
   * List of available contacts for selection
   */
  availableContacts?: Contact[];
  /**
   * List of available meetings for selection
   */
  availableMeetings?: Meeting[];
  /**
   * Callback fired when form data changes
   */
  onChange?: (data: {
    title: string;
    content: string;
    contactIds: string[];
    meetingIds: string[];
  }) => void;
  /**
   * Callback fired when a new contact is created
   */
  onContactCreated?: (contactId: string) => void;
  /**
   * Callback fired when a note is created via InputSupabase
   */
  onNoteCreated?: (noteId: string) => void;
  /**
   * Custom CSS class name
   */
  className?: string;
}

export default function NoteForm({
  initialNoteId,
  initialTitle = "",
  initialContent = "",
  initialContactIds = [],
  initialMeetingIds = [],
  availableContacts = [],
  availableMeetings = [],
  onChange,
  onContactCreated,
  onNoteCreated,
  className
}: NoteFormProps = {}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content] = useState(initialContent);
  const [contactIds] = useState<string[]>(initialContactIds);
  const [meetingIds] = useState<string[]>(initialMeetingIds);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [isCreatingContact, setIsCreatingContact] = useState(false);
  const [contactFormData, setContactFormData] = useState<{
    firstName: string;
    lastName: string;
    emails: string[];
    phones: string[];
    city: string;
    state: string;
    company: string;
    description: string;
    linkedin: string;
    jobTitle: string;
  } | null>(null);

  // Generate a temporary ID for new notes if none provided
  const noteId = initialNoteId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Call onChange callback when form data changes
  useEffect(() => {
    if (onChange) {
      onChange({
        title,
        content,
        contactIds,
        meetingIds
      });
    }
  }, [title, content, contactIds, meetingIds, onChange]);

  // Update title when initialTitle changes
  useEffect(() => {
    if (initialTitle !== title) {
      setTitle(initialTitle);
    }
  }, [initialTitle, title]);

  const handleCreateContact = async () => {
    if (!contactFormData) return;

    setIsCreatingContact(true);
    try {
      // Transform the form data to match the expected format for createPerson
      const contactData = {
        first_name: contactFormData.firstName,
        last_name: contactFormData.lastName,
        city: contactFormData.city,
        state: contactFormData.state,
        description: contactFormData.description,
        linkedin: contactFormData.linkedin,
        job_title: contactFormData.jobTitle,
        company_name: contactFormData.company,
        _emails: contactFormData.emails.filter(email => email.trim() !== ''),
        _phones: contactFormData.phones.filter(phone => phone.trim() !== '')
      };

      const result = await createPerson(contactData);
      
      if (result.success && result.data) {
        // Close the dialog and reset form
        setAddContactDialogOpen(false);
        setContactFormData(null);
        toast.success("Contact created successfully!");
        
        // Notify parent component about the new contact
        onContactCreated?.(result.data.id);
        
        // The ComboboxSupabase will handle adding the new contact to selected items
        // when the availableContacts prop is updated
      } else {
        toast.error("Failed to create contact", { description: result.error });
      }
    } catch (error) {
      console.error("Error creating contact:", error);
      toast.error("An unexpected error occurred while creating the contact.");
    } finally {
      setIsCreatingContact(false);
    }
  };

  return (
    <div className={cn("@container flex flex-col text-foreground w-full", className)}>

      <div className="flex flex-col gap-3 grid-rows-[auto_1fr] h-[calc(100vh-5.5rem)]">
        <div className="flex flex-col gap-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[6rem] text-muted-foreground">
              <Type className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="whitespace-nowrap @max-sm:hidden">Title</span>
            </div>
            <div className="flex-1 min-w-0">
              <InputSupabase
                table="notes"
                field="title"
                id={noteId}
                initialValue={initialTitle}
                placeholder="Add note title..."
                onNoteCreated={onNoteCreated}
                className="border-none"
              />
            </div>
            <div className="shrink-0">
              <DeleteButton 
                onDelete={async () => {
                  const result = await deleteNotes([noteId]);
                  if (!result.success) throw new Error(result.error);
                }}
                redirectTo="/workspace/notes"
              />
            </div>
          </div>

          {/* Contacts */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[6rem] text-muted-foreground">
              <Users className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="whitespace-nowrap @max-sm:hidden">Contacts</span>
            </div>
            <div className="flex-1 min-w-0">
              <ComboboxSupabase
                table="contact_notes"
                field="contact_id"
                id={noteId}
                initialValue={contactIds}
                options={availableContacts.map(contact => ({
                  value: contact.id,
                  label: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact',
                  subLabel: contact.company?.name
                }))}
                placeholder="Associate with contacts..."
                searchPlaceholder="Search contacts..."
                emptyText="No contacts found."
                onNoteCreated={onNoteCreated}
                noteIdField="note_id"
                targetIdField="contact_id"
                actionButton={{
                  label: "Add Contact",
                  onClick: () => setAddContactDialogOpen(true)
                }}
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

          {/* Meetings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[6rem] text-muted-foreground">
              <Calendar className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="whitespace-nowrap @max-sm:hidden">Meetings</span>
            </div>
            <div className="flex-1 min-w-0">
              <ComboboxSupabase
                table="meeting_notes"
                field="meeting_id"
                id={noteId}
                initialValue={meetingIds}
                options={availableMeetings.map(meeting => ({
                  value: meeting.id,
                  label: meeting.title || 'Untitled Meeting'
                }))}
                placeholder="Associate with meetings..."
                searchPlaceholder="Search meetings..."
                emptyText="No meetings found."
                onNoteCreated={onNoteCreated}
                noteIdField="note_id"
                targetIdField="meeting_id"
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
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto">
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[6rem] pt-3 text-muted-foreground">
              <File className="size-4 shrink-0" strokeWidth={1.5} />
              <span className="whitespace-nowrap @max-sm:hidden">Content</span>
            </div>
            <div className="flex-1 min-w-0 h-full ">
              <NotesContent
                noteId={initialNoteId || ""}
                noteContent={content}
                onNoteIdChange={onNoteCreated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <PersonForm
              onChange={setContactFormData}
              className="p-0"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddContactDialogOpen(false);
                setContactFormData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateContact}
              disabled={isCreatingContact || !contactFormData}
            >
              {isCreatingContact ? "Creating..." : "Create Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}