"use client";

import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, File, Users, Calendar, Type, X, Plus, ArrowUpRight } from "lucide-react";
import { Contact, Meeting } from '../_lib/validations';
import { Button } from "@/components/ui/button";
import PersonForm from "../../contacts/_components/form";
import { createPerson } from "../../contacts/_lib/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Tiptap from "@/components/tiptap/tiptap";

export interface NoteFormProps {
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
   * Custom CSS class name
   */
  className?: string;
}

export default function NoteForm({
  initialTitle = "",
  initialContent = "",
  initialContactIds = [],
  initialMeetingIds = [],
  availableContacts = [],
  availableMeetings = [],
  onChange,
  onContactCreated,
  className
}: NoteFormProps = {}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [contactIds, setContactIds] = useState<string[]>(initialContactIds);
  const [meetingIds, setMeetingIds] = useState<string[]>(initialMeetingIds);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [meetingsOpen, setMeetingsOpen] = useState(false);
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

  const getDisplayContacts = () => {
    if (contactIds.length === 0) return "Associate with contacts...";
    const selectedContacts = availableContacts.filter(contact => contactIds.includes(contact.id));
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedContacts.map((contact) => {
          const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact';
          return (
            <ContextMenu key={contact.id}>
              <ContextMenuTrigger>
                <Badge variant="blue" className="text-sm cursor-pointer">
                  {name}
                  <Button variant="ghost" size="icon" className="size-4" onClick={(e) => {
                    e.stopPropagation();
                    toggleContact(contact.id);
                  }}>
                    <X className="size-4" />
                  </Button>
                </Badge>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => router.push(`/workspace/contacts/${contact.id}`)}>
                  View Contact
                  <ArrowUpRight className="size-4 shrink-0" />
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    );
  };

  const getDisplayMeetings = () => {
    if (meetingIds.length === 0) return "Associate with meetings...";
    const selectedMeetings = availableMeetings.filter(meeting => meetingIds.includes(meeting.id));
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {selectedMeetings.map((meeting) => {
          const title = meeting.title || 'Untitled Meeting';
          return (
            <ContextMenu key={meeting.id}>
              <ContextMenuTrigger>
                <Badge variant="green" className="text-sm cursor-pointer">
                  {title}
                  <Button variant="ghost" size="icon" className="size-4" onClick={(e) => {
                    e.stopPropagation();
                    toggleMeeting(meeting.id);
                  }}>
                    <X className="size-4" />
                  </Button>
                </Badge>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => router.push(`/workspace/meetings/${meeting.id}`)}>
                  View Meeting
                  <ArrowUpRight className="size-4 shrink-0" />
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
    );
  };

  const toggleContact = (contactId: string) => {
    setContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const toggleMeeting = (meetingId: string) => {
    setMeetingIds(prev => 
      prev.includes(meetingId) 
        ? prev.filter(id => id !== meetingId)
        : [...prev, meetingId]
    );
  };

  const handlePopoverKeyDown = (e: React.KeyboardEvent, closePopover: () => void) => {
    if (e.key === "Enter") {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === "BUTTON") {
        // If a button is focused, click it
        (activeElement as HTMLButtonElement).click();
      } else {
        // Otherwise, close the popover
        closePopover();
      }
    }
  };

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
        // Add the newly created contact to the selected contacts
        setContactIds(prev => [...prev, result.data.id]);
        setAddContactDialogOpen(false);
        setContactFormData(null);
        toast.success("Contact created successfully!");
        
        // Notify parent component about the new contact
        onContactCreated?.(result.data.id);
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
    <div className={cn("@container flex flex-col gap-1 text-foreground w-full", className)}>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] text-muted-foreground">
          <Type className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Title</span>
        </div>
        <input 
          className="w-full min-w-0 text-left hover:bg-secondary rounded-md py-2 px-2 truncate" 
          placeholder="Add note title..." 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] text-muted-foreground">
          <Users className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Contacts</span>
        </div>
        <div className="w-full min-w-0">
          <Popover open={contactsOpen} onOpenChange={setContactsOpen}>
            <PopoverTrigger className={cn(
              "w-full text-left hover:bg-secondary rounded-md py-2 px-2 truncate",
              contactIds.length === 0 && "text-muted-foreground/80"
            )}>
              {getDisplayContacts()}
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 rounded-xl" 
              align="start"
              onKeyDown={(e) => handlePopoverKeyDown(e, () => setContactsOpen(false))}
            >
              <Command className="w-full rounded-xl">
                <CommandInput placeholder="Search contacts..." />
                <CommandList className="max-h-60">
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    {availableContacts.map((contact) => {
                      const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown Contact';
                      const isSelected = contactIds.includes(contact.id);
                      return (
                        <CommandItem
                          key={contact.id}
                          value={name}
                          onSelect={() => toggleContact(contact.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {name}
                          {contact.company && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({contact.company.name})
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
                <CommandSeparator />
                <div className="p-1 h-9">
                  <Button 
                      variant="secondary" 
                      size="sm"
                      className="w-full h-full justify-start rounded-t-none text-muted-foreground"
                      onClick={() => {
                          setContactsOpen(false);
                          setAddContactDialogOpen(true);
                      }}
                  >
                      <Plus className="size-4 shrink-0" strokeWidth={1.5} />
                      <span className="text-xs">Add Contact</span>
                  </Button>
                </div>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] text-muted-foreground">
          <Calendar className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Meetings</span>
        </div>
        <div className="w-full min-w-0">
          <Popover open={meetingsOpen} onOpenChange={setMeetingsOpen}>
            <PopoverTrigger className={cn(
              "w-full text-left hover:bg-secondary rounded-md py-2 px-2 truncate",
              meetingIds.length === 0 && "text-muted-foreground/80"
            )}>
              {getDisplayMeetings()}
            </PopoverTrigger>
            <PopoverContent 
              className="p-0 rounded-xl" 
              align="start"
              onKeyDown={(e) => handlePopoverKeyDown(e, () => setMeetingsOpen(false))}
            >
              <Command className="w-full rounded-xl">
                <CommandInput placeholder="Search meetings..." />
                <CommandList className="max-h-60">
                  <CommandEmpty>No meetings found.</CommandEmpty>
                  <CommandGroup>
                    {availableMeetings.map((meeting) => {
                      const title = meeting.title || 'Untitled Meeting';
                      const isSelected = meetingIds.includes(meeting.id);
                      return (
                        <CommandItem
                          key={meeting.id}
                          value={title}
                          onSelect={() => toggleMeeting(meeting.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {title}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-start gap-2 justify-between">
        <div className="flex items-center gap-2 text-sm @max-sm:w-8 w-[10rem] pt-3 text-muted-foreground">
          <File className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="whitespace-nowrap @max-sm:hidden">Content</span>
        </div>
        {/* <textarea 
          className={cn(
            "w-full min-w-0 text-left hover:bg-secondary rounded-md py-2 px-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-20",
            "overflow-hidden"
          )}
          placeholder="Add note content..."
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            height: 'auto',
            minHeight: '80px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.max(80, target.scrollHeight) + 'px';
          }}
        /> */}
        <div className="w-full min-w-0">
        <Tiptap
          content={content}
          onChange={setContent}
          showFixedMenu={true}
          showBubbleMenu={true}
          editable={true}
        />
        </div>
      </div>

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