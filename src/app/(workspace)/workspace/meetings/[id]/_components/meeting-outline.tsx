"use client";

// TODO: this is a copy of the summary component when refactoring meeting/[id] to server component
// we dont need the original summary component anymore in the components folder
// TODO: but this is also using a hook for useSummaryAutoSave, but we need to make an agnostic saving tiptap component

import React, { useEffect } from "react";
import { marked } from "marked";
import Tiptap from "@/components/tiptap/tiptap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSummaryAutoSave } from "@/hooks/use-summary-auto-save";
import UploadAudio from "./upload-audio";
import { FormattedTranscriptGroup } from "@/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface OutlineProps {
  outline: Record<string, string>;
  meetingId: string;
  audioFilePath?: string;
  formattedTranscript?: FormattedTranscriptGroup[] | null;
  speakerDetails?: Record<string, string>;
  onUploadSuccess?: () => void;
}

const Outline: React.FC<OutlineProps> = ({
  outline,
  meetingId,
  audioFilePath,
  formattedTranscript,
  speakerDetails,
  onUploadSuccess
}) => {
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
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

  const transcript = Array.isArray(formattedTranscript) ? formattedTranscript : [];
  const hasTranscript = transcript.length > 0;

  const handleGenerateOutline = async () => {
    if (!hasTranscript) {
      toast.error("No transcript available to summarize yet.");
      return;
    }

    setIsGeneratingOutline(true);
    setGenerationStatus("Starting outline generation...");

    try {
      const summarizeResponse = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          meetingId,
          speakerDetails,
        }),
      });

      if (!summarizeResponse.ok || !summarizeResponse.body) {
        const errorBody = await summarizeResponse.text();
        throw new Error(`Summarization API request failed: ${errorBody}`);
      }

      const summaryReader = summarizeResponse.body.getReader();
      const decoder = new TextDecoder();
      let summaryAccumulatedData = '';
      let completed = false;

      while (true) {
        const { value, done } = await summaryReader.read();
        if (done) {
          break;
        }

        summaryAccumulatedData += decoder.decode(value, { stream: true });

        let eventSeparatorIndex;
        while ((eventSeparatorIndex = summaryAccumulatedData.indexOf('\n\n')) !== -1) {
          const eventDataString = summaryAccumulatedData.substring(0, eventSeparatorIndex);
          summaryAccumulatedData = summaryAccumulatedData.substring(eventSeparatorIndex + 2);

          if (!eventDataString.startsWith('data:')) {
            continue;
          }

          const jsonString = eventDataString.substring(5).trim();
          if (!jsonString) {
            continue;
          }

          const eventData = JSON.parse(jsonString) as {
            message?: string;
            status?: string;
            error?: string;
          };

          if (eventData.error) {
            throw new Error(eventData.error);
          }

          if (eventData.message) {
            setGenerationStatus(eventData.message);
          }

          if (eventData.status === 'Processing completed') {
            completed = true;
            setGenerationStatus("Outline generated.");
          }
        }
      }

      if (!completed) {
        setGenerationStatus("Outline generation finished.");
      }
      toast.success("Outline generated successfully.");
      onUploadSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate outline";
      toast.error(errorMessage);
      setGenerationStatus(errorMessage);
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  if (sections.length === 0) {
    return (
      <Card className="h-full p-6">
        <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-muted-foreground font-light">
            {hasTranscript
              ? "No outline has been generated for this meeting yet."
              : "No transcript available yet. Upload and transcribe audio first."}
          </p>
          {hasTranscript && (
            <Button onClick={handleGenerateOutline} disabled={isGeneratingOutline}>
              {isGeneratingOutline && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isGeneratingOutline ? "Generating outline..." : "Generate outline"}
            </Button>
          )}
          {generationStatus && (
            <p className="text-xs text-muted-foreground">{generationStatus}</p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full relative" onKeyDown={handleKeyDown}>
      <div className="flex flex-col gap-4 h-full">
        {sections.map(([key, value]) => {
          const htmlContent = marked(String(value)) as string;
          return (
            <div key={key} className="h-full">
                <Tiptap
                  content={htmlContent}
                  onChange={(newContent: string) => handleSectionChange(key, newContent)}
                />
            </div>
          );
        })}
      </div>
      
      {/* Save status badges */}
      <div className="absolute top-10 right-4 z-20 flex items-center gap-2">
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
