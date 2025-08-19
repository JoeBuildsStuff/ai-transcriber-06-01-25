"use client";

import React, { useEffect } from "react";
import { marked } from "marked";
import Tiptap from "./tiptap/tiptap";
import { Badge } from "@/components/ui/badge";
import { useSummaryAutoSave } from "@/hooks/use-summary-auto-save";

interface SummaryProps {
  summary: Record<string, string>;
  meetingId: string;
}

// const formatTitle = (key: string): string => {
//     if (!key) return "";
//     return key
//         .replace(/_/g, ' ')
//         .split(' ')
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(' ');
// };

const Summary: React.FC<SummaryProps> = ({ summary, meetingId }) => {
  const {
    summary: editableSummary,
    saveStatus,
    hasUnsavedChanges,
    handleSectionChange,
    handleManualSave,
    handleReset
  } = useSummaryAutoSave({
    meetingId,
    initialSummary: summary
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

  const sections = Object.entries(editableSummary).filter(
    ([key, value]) => key !== 'title' && key !== 'date' && value && value.trim() !== ""
  );

  sections.sort(([keyA], [keyB]) => {
    const indexA = sectionOrder.indexOf(keyA);
    const indexB = sectionOrder.indexOf(keyB);

    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

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

  if (sections.length === 0) {
    return <p className="text-center text-muted-foreground p-4">Waiting for summary...</p>;
  }

  return (
    <div className="relative h-full" onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-4 h-full">
        {sections.map(([key, value]) => {
          const htmlContent = marked(value) as string;
          return (
            <div key={key} className="relative">
              {/* <h3 className="text-lg font-semibold mb-2 pb-1 border-b">{formatTitle(key)}</h3> */}
              <div className="prose prose-md max-w-none dark:prose-invert">
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

export default Summary;
