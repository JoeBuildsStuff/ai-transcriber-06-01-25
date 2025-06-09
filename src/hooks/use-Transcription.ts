/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DeepgramWord, FormattedTranscriptGroup, TranscriptionData, TranscriptionHook } from '@/types';

export function useTranscription(): TranscriptionHook {
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionData | null>(null);
  const [formattedTranscript, setFormattedTranscript] = useState<FormattedTranscriptGroup[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<string>("");
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [currentMeetingTitle, setCurrentMeetingTitle] = useState<string | null>(null); // State for title

  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const generateSummary = useCallback(async (transcript: FormattedTranscriptGroup[], meetingIdToSummarize: string | null) => {
    if (!meetingIdToSummarize) {
      setSummaryError("Cannot generate summary without a meeting ID.");
      toast.error("Summarization Error", { description: "Missing meeting ID for summary generation." });
      setIsSummarizing(false);
      return;
    }
    if (!transcript || transcript.length === 0) {
      setSummaryError("Cannot generate summary from empty transcript.");
      // Potentially update meeting status in DB to indicate no summary was generated due to empty transcript
      setIsSummarizing(false);
      return;
    }
    console.log(`Initiating summary generation for meeting ID: ${meetingIdToSummarize}...`);
    setIsSummarizing(true);
    setSummary(null);
    setSummaryError(null);
    setSummaryStatus("Generating summary...");

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, meetingId: meetingIdToSummarize }), // Send formatted transcript AND meetingId
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Summarization API request failed for meeting ${meetingIdToSummarize} with status ${response.status}: ${errorBody}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        let currentSummary = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log(`Summary stream finished for meeting ID: ${meetingIdToSummarize}.`);
            if (currentSummary) setSummary(currentSummary);
            setSummaryStatus("Summary generated.");
            setIsSummarizing(false);
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
                  const eventData = JSON.parse(jsonString);
                  if (eventData.meetingId !== meetingIdToSummarize) {
                    // console.warn("Received SSE for a different meetingId", eventData.meetingId, "expected", meetingIdToSummarize);
                    // Potentially ignore or handle if concurrent summaries are possible (not in current design)
                  }

                  if (eventData.message && typeof eventData.message === 'string' && eventData.message.startsWith("Processing...")) {
                     setSummaryStatus(eventData.message);
                  } else if (eventData.summary || eventData.title) { // Check for summary OR title
                    if (eventData.summary && typeof eventData.summary === 'string') {
                      currentSummary = eventData.summary;
                      setSummary(currentSummary);
                    }
                    if (eventData.title && typeof eventData.title === 'string') {
                      setCurrentMeetingTitle(eventData.title); // Set the title from SSE
                    }
                    setSummaryStatus("Receiving summary data...");
                  } else if (eventData.status === 'Processing completed') {
                    setSummaryStatus("Summary processing complete.");
                    setIsSummarizing(false);
                    if (currentSummary) setSummary(currentSummary);
                  } else if (eventData.error) {
                    console.error('Error from summarization API stream:', eventData.error, eventData.details);
                    setSummaryError(eventData.error + (eventData.details ? `: ${eventData.details}`: ''));
                    setIsSummarizing(false);
                    // Do not break here, allow stream to close if server sends completion after error
                  }
                } catch (e) {
                  console.error('Error parsing summary SSE event data:', e, 'Original message:', eventDataString);
                  setSummaryError("Error parsing summary data.");
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
      console.error(`Error initiating summarization for meeting ${meetingIdToSummarize}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Summarization Error", { description: errorMessage });
      setSummaryError(`Error: ${errorMessage}`);
      setIsSummarizing(false);
      setSummary(null);
    }
  }, []);

  const initiateTranscription = useCallback(async (filePath: string, originalFileName: string) => {
    console.log(`Initiating transcription for: ${filePath}, original name: ${originalFileName}`);
    setCurrentMeetingId(null); // Reset meeting ID for new transcription
    setTranscriptionResult(null);
    setFormattedTranscript([]);
    setIsTranscribing(true);
    setSummaryStatus("Initiating transcription...");
    setSummary(null); 
    setCurrentMeetingTitle(null); // Reset title
    setSummaryError(null);
    setIsSummarizing(false);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath, originalFileName }), // Send originalFileName
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `Transcription API request failed with status ${response.status}`;
        try {
          const parsedError = JSON.parse(errorBody);
          errorMessage += parsedError.details ? `: ${parsedError.details}` : `: ${errorBody}`;
        } catch (parseError) {
          console.warn('Failed to parse error body as JSON during transcription initiation:', parseError); // Log the parseError
          errorMessage += `: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedData = '';
        // let rawTranscriptionResult: WordDetail[] = []; // This will be part of the full result object
        let fullTranscriptionResponse: TranscriptionData | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log('Transcription stream finished.');
            if (fullTranscriptionResponse) {
                setTranscriptionResult(fullTranscriptionResponse);
            } else {
                setSummaryStatus("Stream finished, but no complete transcription data received from stream.");
                // Consider this a failure if no fullTranscriptionResponse by the end
                setIsTranscribing(false); 
            }
            // setSummaryStatus(prev => prev === "Processing transcription..." ? "Transcription data stream ended." : "Transcription stream finished.");
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
                  const eventData = JSON.parse(jsonString) as any; // Cast for now, could be more specific
                  
                  if (eventData.meetingId && !currentMeetingId) {
                    setCurrentMeetingId(eventData.meetingId);
                    console.log("Received meetingId from transcribe stream:", eventData.meetingId);
                  }

                  if (eventData.status === 'Processing started') {
                    console.log('Transcription status: Processing started');
                    setSummaryStatus("Processing transcription...");
                  } else if (eventData.results) { // Check for the main results object
                    fullTranscriptionResponse = eventData as TranscriptionData; // Store the whole response
                    // Optionally update a partial state for live words, but full response is set on done/completed
                    setSummaryStatus("Receiving transcription data..."); 
                  } else if (eventData.status === 'Processing completed') {
                    console.log('Transcription status: Processing completed by API');
                    setSummaryStatus("Transcription complete. Ready for formatting.");
                    if (fullTranscriptionResponse) { // Ensure we have the full response
                       setTranscriptionResult(fullTranscriptionResponse);
                    }
                    setIsTranscribing(false); 
                  } else if (eventData.error) {
                    console.error("Error from transcription API stream:", eventData.error, eventData.details);
                    setSummaryStatus(`Transcription API Error: ${eventData.error}`);
                    toast.error("Transcription Error", { description: eventData.error + (eventData.details ? `: ${eventData.details}`: '') });
                    setIsTranscribing(false);
                    setTranscriptionResult(null);
                    setCurrentMeetingId(null);
                    // Do not break here, allow stream to close if server sends completion after error
                  }
                } catch (_errorParsingSSE) {
                  console.error('Error parsing transcription SSE event data:', _errorParsingSSE, 'Original message:', eventDataString);
                  setSummaryStatus("Error parsing transcription data.");
                  // Potentially stop transcription if parsing fails critically
                  // setIsTranscribing(false);
                  // setTranscriptionResult(null);
                  // setCurrentMeetingId(null);
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
      setCurrentMeetingId(null);
    }
  }, [currentMeetingId]); // Added currentMeetingId to dependencies of initiateTranscription

  useEffect(() => {
    if (transcriptionResult && transcriptionResult.results && transcriptionResult.results.channels && 
        transcriptionResult.results.channels[0].alternatives && 
        transcriptionResult.results.channels[0].alternatives[0].words &&
        !isTranscribing && currentMeetingId) { // Ensure we have a meetingId
      
      const words = transcriptionResult.results.channels[0].alternatives[0].words;
      if (words.length > 0) {
        setSummaryStatus("Formatting transcript...");
        try {
          const groupedTranscript = words.reduce((acc: FormattedTranscriptGroup[], word: DeepgramWord) => {
            const lastGroup = acc[acc.length - 1];
            if (lastGroup && lastGroup.speaker === word.speaker) {
              lastGroup.text += ` ${word.punctuated_word}`;
            } else {
              acc.push({
                speaker: word.speaker === undefined ? -1 : word.speaker,
                start: word.start,
                text: word.punctuated_word,
              });
            }
            return acc;
          }, [] as FormattedTranscriptGroup[]); 

          setFormattedTranscript(groupedTranscript);
          setSummaryStatus("Transcript formatted. Triggering summary generation...");
          if (groupedTranscript.length > 0) {
               generateSummary(groupedTranscript, currentMeetingId); // Pass currentMeetingId
          } else {
              setSummaryStatus("Transcript formatted but empty, skipping summary.");
              // Optionally update DB meeting record to reflect no summary due to empty transcript
          }
        } catch (error) {
          console.error("Error formatting transcript:", error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error("Formatting Error", {
            description: "Failed to format transcript. Please try again. " + errorMessage,
          });
          setSummaryStatus("Error formatting transcript: " + errorMessage);
        }
      } else {
        setSummaryStatus("Transcription result has no words, skipping formatting and summary.");
        setFormattedTranscript([]);
      }
    } else if (transcriptionResult === null && !isTranscribing) {
      setFormattedTranscript([]);
      setSummary(null); 
    }
  }, [transcriptionResult, isTranscribing, generateSummary, currentMeetingId]); 

  const resetTranscription = useCallback(() => {
    setTranscriptionResult(null);
    setFormattedTranscript([]);
    setIsTranscribing(false);
    setSummaryStatus("");
    setSummary(null);
    setIsSummarizing(false);
    setSummaryError(null);
    setCurrentMeetingId(null); // Reset currentMeetingId
    setCurrentMeetingTitle(null); // Reset title
  }, []);

  return {
    isTranscribing,
    transcriptionResult,
    formattedTranscript,
    summaryStatus,
    currentMeetingId, // Expose currentMeetingId
    currentMeetingTitle, // Expose title
    initiateTranscription,
    resetTranscription,
    summary,
    isSummarizing,
    summaryError,
  };
} 