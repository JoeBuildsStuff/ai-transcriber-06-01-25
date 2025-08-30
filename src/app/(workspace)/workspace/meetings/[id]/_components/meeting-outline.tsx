"use client";

// TODO: this is a copy of the summary component when refactoring meeting/[id] to server component
// we dont need the original summary component anymore in the components folder
// TODO: but this is also using a hook for useSummaryAutoSave, but we need to make an agnostic saving tiptap component

import React, { useEffect } from "react";
import { marked } from "marked";
import Tiptap from "@/components/tiptap/tiptap";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSummaryAutoSave } from "@/hooks/use-summary-auto-save";
import UploadAudio from "./upload-audio";

interface OutlineProps {
  outline: Record<string, string>;
  meetingId: string;
  audioFilePath?: string;
  onUploadSuccess?: () => void;
}

const Outline: React.FC<OutlineProps> = ({ outline, meetingId, audioFilePath, onUploadSuccess }) => {
  const {
    summary: editableOutline,
    saveStatus,
    hasUnsavedChanges,
    handleSectionChange,
    handleManualSave,
    handleReset
  } = useSummaryAutoSave({
    meetingId,
    initialSummary: outline
  });

  const sectionOrder = [
    'participants',
    'executive_summary',
    'discussion_outline',
    'decisions',
    'questions_asked',
    'action_items',
    'next_meeting_open_items',
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleManualSave()
    }
    // Escape to discard changes
    if (e.key === 'Escape' && hasUnsavedChanges) {
      handleReset()
    }
  }

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Check if there's no audio file or outline data
  const hasNoAudioOrOutline = !audioFilePath && (!editableOutline || Object.keys(editableOutline).length === 0);

  // If no audio or outline, show upload component
  if (hasNoAudioOrOutline) {
    return (
      <Card className="h-full p-1 gap-2">
        <UploadAudio 
          meetingId={meetingId} 
          onUploadSuccess={() => {
            onUploadSuccess?.();
          }}
        />
      </Card>
    );
  }

  const sections = Object.entries(editableOutline).filter(
    ([key, value]) => key !== 'title' && key !== 'date' && value && value.toString().trim() !== ""
  );

  sections.sort(([keyA], [keyB]) => {
    const indexA = sectionOrder.indexOf(keyA);
    const indexB = sectionOrder.indexOf(keyB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  if (sections.length === 0) {
    return <p className="text-center text-muted-foreground p-4">Waiting for outline...</p>;
  }

  return (
    <div className="relative h-full overflow-y-auto" onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-4 h-full overflow-y-auto">
        {sections.map(([key, value]) => {
          const htmlContent = marked(String(value)) as string;
          return (
            <div key={key} className="relative">
              {/* <h3 className="text-lg font-semibold mb-2 pb-1 border-b">{formatTitle(key)}</h3> */}
              <div className="prose prose-md max-w-none dark:prose-invert overflow-y-auto">
                <Tiptap
                  content={htmlContent}
                  onChange={(newContent: string) => handleSectionChange(key, newContent)}
                  // showFixedMenu={false}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Save status badges */}
      <div className="fixed top-20 right-4 z-10 flex items-center gap-2">
        {hasUnsavedChanges && saveStatus === 'idle' && (
          <Badge variant="orange">
            Unsaved changes
          </Badge>
        )}
        {saveStatus === 'saving' && (
          <Badge variant="yellow">
            Auto-saving...
          </Badge>
        )}
        {saveStatus === 'saved' && (
          <Badge variant="blue">
            Auto-saved
          </Badge>
        )}
        {saveStatus === 'error' && (
          <Badge variant="red">
            Error saving
          </Badge>
        )}
      </div>
    </div>
  );
};

export default Outline;
