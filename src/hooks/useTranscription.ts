/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Define the WordDetail and FormattedTranscriptGroup interfaces
// These were originally in the page.tsx file
interface WordDetail {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  speaker_confidence: number;
  punctuated_word: string;
}

export interface FormattedTranscriptGroup {
  speaker: number;
  start: number;
  text: string;
}

export interface TranscriptionHook {
  isTranscribing: boolean;
  transcriptionResult: WordDetail[] | null;
  formattedTranscript: FormattedTranscriptGroup[];
  summaryStatus: string;
  initiateTranscription: (filePath: string) => Promise<void>;
  resetTranscription: () => void;
  summary: string | null;
  isSummarizing: boolean;
  summaryError: string | null;
  // generateSummary: (transcript: FormattedTranscriptGroup[]) => Promise<void>; // exposing this if manual trigger is desired later
}

export function useTranscription(): TranscriptionHook {
  const [transcriptionResult, setTranscriptionResult] = useState<WordDetail[] | null>(null);
  const [formattedTranscript, setFormattedTranscript] = useState<FormattedTranscriptGroup[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<string>("");

  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const generateSummary = useCallback(async (transcript: FormattedTranscriptGroup[]) => {
    if (!transcript || transcript.length === 0) {
      setSummaryError("Cannot generate summary from empty transcript.");
      return;
    }
    console.log('Initiating summary generation...');
    setIsSummarizing(true);
    setSummary(null);
    setSummaryError(null);
    setSummaryStatus("Generating summary..."); // Update overall status

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }), // Send formatted transcript
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Summarization API request failed with status ${response.status}: ${errorBody}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        let currentSummary = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('Summary stream finished.');
            // Ensure final summary is set if currentSummary has content
            if (currentSummary) setSummary(currentSummary);
            setSummaryStatus("Summary generated.");
            setIsSummarizing(false);
            break;
          }
          accumulatedData += decoder.decode(value, { stream: true });
          
          // Using a more robust SSE parsing approach
          let eventSeparatorIndex;
          while ((eventSeparatorIndex = accumulatedData.indexOf('\n\n')) !== -1) {
            const eventDataString = accumulatedData.substring(0, eventSeparatorIndex);
            accumulatedData = accumulatedData.substring(eventSeparatorIndex + 2);

            if (eventDataString.startsWith('data:')) {
              const jsonString = eventDataString.substring(5).trim();
              if (jsonString) {
                try {
                  const eventData = JSON.parse(jsonString);
                  // console.log('Parsed Summary SSE Event:', eventData);

                  if (eventData.message && typeof eventData.message === 'string' && eventData.message.startsWith("Processing...")) {
                     setSummaryStatus(eventData.message);
                  } else if (eventData.summary && typeof eventData.summary === 'string') {
                    currentSummary = eventData.summary; // Assuming the full summary comes in one 'summary' field now based on previous implementation.
                                                 // If it's incremental, it should be: currentSummary += eventData.summary;
                    setSummary(currentSummary);
                    setSummaryStatus("Receiving summary...");
                  } else if (eventData.status === 'Processing completed') {
                    setSummaryStatus("Summary processing complete.");
                    setIsSummarizing(false);
                     // Ensure final summary is set on completion
                    if (currentSummary) setSummary(currentSummary);
                  }
                } catch (e) {
                  console.error('Error parsing summary SSE event data:', e, 'Original message:', eventDataString);
                  setSummaryError("Error parsing summary data.");
                  // setIsSummarizing(false); // Decide if this should stop summarization
                }
              }
            }
          }
        }
      } else {
        console.error('Summarization API response body is null');
        setSummaryError("Error: Empty API response from summarizer.");
        setIsSummarizing(false);
      }
    } catch (error) {
      console.error('Error initiating summarization:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Summarization Error", { description: errorMessage });
      setSummaryError(`Error: ${errorMessage}`);
      setIsSummarizing(false);
      setSummary(null);
    }
  }, []);

  const initiateTranscription = useCallback(async (filePath: string) => {
    console.log('Initiating transcription for:', filePath);
    setTranscriptionResult(null);
    setFormattedTranscript([]);
    setIsTranscribing(true);
    setSummaryStatus("Initiating transcription...");
    setSummary(null); // Reset summary
    setSummaryError(null);
    setIsSummarizing(false);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Transcription API request failed with status ${response.status}: ${errorBody}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        let rawTranscriptionResult: WordDetail[] = []; 

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('Transcription stream finished.');
            if (rawTranscriptionResult.length > 0) {
                setTranscriptionResult(currentResults => currentResults && currentResults.length > 0 ? currentResults : rawTranscriptionResult);
            }
            setSummaryStatus(prev => prev === "Processing transcription..." ? "Transcription data stream ended." : "Transcription stream finished.");
            if (isTranscribing && !rawTranscriptionResult.length) { 
                setSummaryStatus("Stream finished, but no transcription data received from stream.");
            }
            // setIsTranscribing(false); // Moved to be set explicitly on "Processing completed" or error
            break;
          }
          accumulatedData += decoder.decode(value, { stream: true });
          
          let eventSeparatorIndex;
          while ((eventSeparatorIndex = accumulatedData.indexOf('\n\n')) !== -1) {
            const eventDataString = accumulatedData.substring(0, eventSeparatorIndex);
            accumulatedData = accumulatedData.substring(eventSeparatorIndex + 2);

            if (eventDataString.startsWith('data:')) {
              const jsonString = eventDataString.substring(5).trim();
              if (jsonString) {
                try {
                  const eventData = JSON.parse(jsonString) as any;
                  // console.log('Parsed Transcription SSE Event:', eventData);

                  if (eventData.status === 'Processing started') {
                    console.log('Transcription status: Processing started');
                    setSummaryStatus("Processing transcription...");
                  } else if (eventData.results && eventData.results.channels && eventData.results.channels[0].alternatives[0].words) {
                    rawTranscriptionResult = eventData.results.channels[0].alternatives[0].words;
                    // Update state with current raw results for immediate feedback if desired, or wait for completion
                    setTranscriptionResult(rawTranscriptionResult); 
                  } else if (eventData.status === 'Processing completed') {
                    console.log('Transcription status: Processing completed by API');
                    setSummaryStatus("Transcription complete. Ready for formatting.");
                     if (rawTranscriptionResult.length > 0) {
                       // Ensure the final set is based on the accumulated raw results
                        setTranscriptionResult(rawTranscriptionResult);
                    }
                    setIsTranscribing(false); 
                  } else if (eventData.error) {
                    console.error("Error from transcription API:", eventData.error);
                    setSummaryStatus(`Transcription API Error: ${eventData.error}`);
                    setIsTranscribing(false);
                    setTranscriptionResult(null);
                    toast.error("Transcription Error", { description: eventData.error });
                  }
                } catch (e) {
                  console.error('Error parsing transcription SSE event data:', e, 'Original message:', eventDataString);
                  setSummaryStatus("Error parsing transcription data.");
                  setIsTranscribing(false);
                   setTranscriptionResult(null);
                }
              }
            }
          }
        }
      } else {
        console.error('Transcription API response body is null');
        setSummaryStatus("Error: Empty API response from transcription.");
        setIsTranscribing(false);
      }
    } catch (error) {
      console.error('Error initiating transcription:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Transcription Error", { description: errorMessage });
      setSummaryStatus(`Error: ${errorMessage}`);
      setIsTranscribing(false);
      setTranscriptionResult(null);
    }
  }, []); 

  useEffect(() => {
    // This effect runs when transcriptionResult is set and we are no longer in the isTranscribing phase.
    if (transcriptionResult && transcriptionResult.length > 0 && !isTranscribing) {
      setSummaryStatus("Formatting transcript...");
      try {
        const groupedTranscript = transcriptionResult.reduce((acc: FormattedTranscriptGroup[], word: WordDetail) => {
          const lastGroup = acc[acc.length - 1];
          if (lastGroup && lastGroup.speaker === word.speaker) {
            lastGroup.text += ` ${word.punctuated_word}`; // Corrected template literal
          } else {
            acc.push({
              speaker: word.speaker,
              start: word.start,
              text: word.punctuated_word,
            });
          }
          return acc;
        }, [] as FormattedTranscriptGroup[]); // Explicitly type the initial value and accumulator

        setFormattedTranscript(groupedTranscript);
        setSummaryStatus("Transcript formatted. Triggering summary generation...");
        if (groupedTranscript.length > 0) {
             generateSummary(groupedTranscript);
        } else {
            setSummaryStatus("Transcript formatted but empty, skipping summary.");
        }
      } catch (error) {
        console.error("Error formatting transcript:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error("Formatting Error", {
          description: "Failed to format transcript. Please try again. " + errorMessage,
        });
        setSummaryStatus("Error formatting transcript: " + errorMessage);
      }
    } else if (transcriptionResult === null && !isTranscribing) {
      setFormattedTranscript([]);
      setSummary(null); // Also clear summary if transcript is cleared
    }
  }, [transcriptionResult, isTranscribing, generateSummary]); 

  const resetTranscription = useCallback(() => {
    setTranscriptionResult(null);
    setFormattedTranscript([]);
    setIsTranscribing(false);
    setSummaryStatus("");
    setSummary(null);
    setIsSummarizing(false);
    setSummaryError(null);
  }, []);

  return {
    isTranscribing,
    transcriptionResult,
    formattedTranscript,
    summaryStatus,
    initiateTranscription,
    resetTranscription,
    summary,
    isSummarizing,
    summaryError,
  };
} 