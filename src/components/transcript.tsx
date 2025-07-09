"use client";

import React, { useState, useEffect, useRef } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import SpeakerAssociationModal from "../app/(workspace)/workspace/meetings/[meetingId]/_components/speaker-association-modal";
import { TranscriptProps, Contact } from "@/types";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "./ui/context-menu";
import { ContactSheet, ContactFormValues } from "./contact-sheet";

const Transcript: React.FC<TranscriptProps> = ({ 
  meetingId,
  formattedTranscript, 
  speakerContacts = null,
  contacts = null,
  onSpeakerContactsUpdate,
  onSeekAndPlay,
  onContactsUpdate,
  currentTime,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<number | null>(null);
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, formattedTranscript.length);
  }, [formattedTranscript]);

  useEffect(() => {
    // Find the currently active transcript item
    let activeIndex = -1;
    for (let i = formattedTranscript.length - 1; i >= 0; i--) {
        if (currentTime >= formattedTranscript[i].start) {
            activeIndex = i;
            break;
        }
    }

    if (activeIndex !== -1) {
        const itemRef = itemRefs.current[activeIndex];
        if (itemRef) {
            itemRef.scrollIntoView({
                behavior: 'smooth',
                block: 'center', 
            });
        }
    }
  }, [currentTime, formattedTranscript]);

  if (formattedTranscript.length === 0) return null;

  const handleOpenModal = (speakerNumber: number) => {
    setSelectedSpeaker(speakerNumber);
    setIsModalOpen(true);
  }

  const handleCloseModal = () => {
    setSelectedSpeaker(null);
    setIsModalOpen(false);
  }

  const handleEditContact = (speakerNumber: number) => {
    if (!speakerContacts || !contacts) {
      return;
    }
    const contactId = speakerContacts[speakerNumber];
    if (!contactId) {
      return;
    }
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setEditingContact(contact);
      setIsContactSheetOpen(true);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getSpeakerColor = (speakerNumber: number) => {
    const colors = [
      "bg-blue-400/20 border-blue-600 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      "bg-green-400/20 border-green-600 text-green-800 dark:bg-green-900 dark:text-green-100",
      "bg-yellow-400/20 border-yellow-600 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      "bg-red-400/20 border-red-600 text-red-800 dark:bg-red-900 dark:text-red-100",
      "bg-purple-400/20 border-purple-600 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      "bg-pink-400/20 border-pink-600 text-pink-800 dark:bg-pink-900 dark:text-pink-100",
      "bg-indigo-400/20 border-indigo-600 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
      "bg-teal-400/20 border-teal-600 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
    ];
    return colors[speakerNumber % colors.length];
  };

  const getSpeakerDisplayName = (speakerNumber: number) => {
    // If no speaker contacts or contacts data, fall back to default
    if (!speakerContacts || !contacts) {
      return `Speaker ${speakerNumber}`;
    }

    // Get the contact ID for this speaker
    const contactId = speakerContacts[speakerNumber];
    if (!contactId) {
      return `Speaker ${speakerNumber}`;
    }

    // Find the contact in the contacts array
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) {
      return `Speaker ${speakerNumber}`;
    }

    // Return the best available display name
    return contact.display_name || 
           `${contact.first_name} ${contact.last_name}`.trim() || 
           contact.primary_email || 
           `Speaker ${speakerNumber}`;
  };

  // Get unique speakers from the transcript
  const uniqueSpeakers = Array.from(new Set(formattedTranscript.map(group => group.speaker))).sort();

  return (
    <div className="mx-2 h-full">

      {/* Speaker badges row */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-1 border-border rounded-lg p-4 mb-4">
      <div className="text-sm font-medium mb-2">Speakers:</div>
        <div className="flex flex-wrap gap-2">
          {uniqueSpeakers.map((speakerNumber) => (
            <ContextMenu key={speakerNumber}>
  <ContextMenuTrigger>
            <button
              key={speakerNumber}
              onClick={() => handleOpenModal(speakerNumber)}
              className={`${getSpeakerColor(speakerNumber)} inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50`}
            >
              {getSpeakerDisplayName(speakerNumber)}
            </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem 
                onSelect={() => handleEditContact(speakerNumber)}
                disabled={!speakerContacts?.[speakerNumber]}
              >
                Edit Contact
              </ContextMenuItem>
            </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
        </div>

      <div className="p-2 rounded" ref={transcriptContainerRef}>
        {formattedTranscript.map((group, groupIndex) => {
          const isActive = currentTime >= group.start && (groupIndex === formattedTranscript.length - 1 || currentTime < formattedTranscript[groupIndex + 1].start);
          return (
          <div 
            key={groupIndex} 
            ref={(el) => {
              if (el) itemRefs.current[groupIndex] = el;
            }}
            className={`mb-2 p-3 rounded-lg transition-all duration-300 ${isActive ? 'border-1 border-border bg-secondary' : ''}`}
            >
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={`${getSpeakerColor(
                  group.speaker
                )} border font-medium rounded-md cursor-pointer`}
                onClick={() => handleOpenModal(group.speaker)}
                title={`Associate speaker for ${getSpeakerDisplayName(
                  group.speaker
                )}`}
              >
                {getSpeakerDisplayName(group.speaker)}
              </Badge>
              <Button
                variant="ghost"
                className="text-xs text-muted-foreground h-6"
                onClick={() => onSeekAndPlay(group.start)}
                title={`Jump to ${formatTime(group.start)} (will load audio if needed)`}
              >
                {formatTime(group.start)}
              </Button>
            </div>
            <p className="ml-4">{group.text}</p>
          </div>
        )})}
      </div>
      
      <SpeakerAssociationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        meetingId={meetingId}
        speakerNumber={selectedSpeaker}
        currentContactId={selectedSpeaker !== null ? speakerContacts?.[selectedSpeaker] || null : null}
        contacts={contacts || []}
        speakerContacts={speakerContacts || {}}
        onSpeakerContactsUpdate={onSpeakerContactsUpdate}
        formattedTranscript={formattedTranscript}
        onSeekAndPlay={onSeekAndPlay}
        onContactsUpdate={onContactsUpdate}
      />
      <ContactSheet
        open={isContactSheetOpen}
        onOpenChange={(open) => {
          setIsContactSheetOpen(open);
          if (!open) {
            setEditingContact(null);
          }
        }}
        contact={editingContact as unknown as ContactFormValues}
      />
    </div>
  );
};

export default Transcript;