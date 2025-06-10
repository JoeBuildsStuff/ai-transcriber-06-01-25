import { NextRequest, NextResponse } from 'next/server';
import { createClient as deepgramClient } from "@deepgram/sdk";
import { createClient as supabaseClient } from "@/lib/supabase/server";

export const runtime = 'edge';

const deepgram = deepgramClient(process.env.DEEPGRAM_API_KEY!);
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {

  console.log('Received request to transcribe');

  try {

    const supabase = await supabaseClient();

    // Get user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const userId = user.id;

    const { filePath, originalFileName, meetingAt } = await req.json();
    console.log('Meeting at:', meetingAt);
    
    console.log('Attempting to download filePath:', filePath);
    console.log('Original file name:', originalFileName);

    if (!filePath) {
      throw new Error('No file path provided');
    }
    if (!originalFileName) {
      throw new Error('No original file name provided');
    }

    // Create initial meeting record
    const { data: meetingData, error: meetingInsertError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .insert({
        user_id: userId,
        audio_file_path: filePath,
        original_file_name: originalFileName,
        meeting_at: meetingAt,
      })
      .select('id')
      .single();

    if (meetingInsertError || !meetingData) {
      console.error('Error creating meeting record:', meetingInsertError);
      throw new Error(`Failed to create meeting record: ${meetingInsertError?.message}`);
    }
    const meetingId = meetingData.id;
    console.log('Created meeting record with ID:', meetingId);

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('ai-transcriber-audio')
      .download(filePath);

    if (downloadError) {
      console.error('Supabase download error object:', downloadError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseError = downloadError as any;
      if (supabaseError.originalError && typeof supabaseError.originalError.json === 'function') {
        try {
          const errorBody = await supabaseError.originalError.json();
          console.error('Supabase download error body (JSON):', errorBody);
        } catch (e) {
          console.error('Failed to parse Supabase error body as JSON. Trying as text.', e);
          if (supabaseError.originalError && typeof supabaseError.originalError.text === 'function') {
            try {
              const errorText = await supabaseError.originalError.text();
              console.error('Supabase download error body (Text):', errorText);
            } catch (e2) {
              console.error('Failed to read Supabase error body as text:', e2);
            }
          }
        }
      } else if (supabaseError.originalError && typeof supabaseError.originalError.text === 'function') {
        try {
          const errorText = await supabaseError.originalError.text();
          console.error('Supabase download error body (Text):', errorText);
        } catch (e2) {
          console.error('Failed to read Supabase error body as text:', e2);
        }
      }
      throw downloadError;
    }

    console.log('File downloaded successfully');
    const arrayBuffer = await downloadData.arrayBuffer();

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial processing message with meetingId
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Processing started", meetingId })}\n\n`));

          // Call Deepgram API
          const { result: deepgramResult, error: deepgramError } = await deepgram.listen.prerecorded.transcribeFile(
            Buffer.from(arrayBuffer),
            {
              model: "nova-3",
              diarize: true,
              punctuate: true,
              utterances: true,
            }
          );

          if (deepgramError) {
            throw deepgramError;
          }

          console.log('Deepgram result for meetingId', meetingId, JSON.stringify(deepgramResult).substring(0, 100) + '...');

          // Extract unique speakers and create initial speaker_names object
          const uniqueSpeakers = new Set<number>();
          const utterances = deepgramResult.results?.utterances;
          if (utterances) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            utterances.forEach((utterance: any) => {
              if (utterance.speaker !== undefined) {
                uniqueSpeakers.add(utterance.speaker);
              }
            });
          }

          const initialSpeakerNames: Record<string, null> = {};
          Array.from(uniqueSpeakers).sort((a, b) => a - b).forEach(speakerNum => {
            initialSpeakerNames[speakerNum.toString()] = null;
          });

          // Update meeting record with transcription
          const { error: meetingUpdateError } = await supabase
            .schema('ai_transcriber')
            .from('meetings')
            .update({ 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              transcription: deepgramResult as any,
              speaker_names: Object.keys(initialSpeakerNames).length > 0 ? initialSpeakerNames : null,
            })
            .eq('id', meetingId);

          if (meetingUpdateError) {
            console.error('Error updating meeting with transcription:', meetingUpdateError);
            // We might still want to send the transcription to the client even if DB update fails
            // Or handle this more gracefully depending on requirements
          } else {
            console.log('Meeting record updated with transcription for ID:', meetingId);
          }

          // Send the complete result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...deepgramResult, meetingId })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Processing completed", meetingId })}\n\n`));
          controller.close();

        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Error during transcription processing", details: error instanceof Error ? error.message : String(error), meetingId })}\n\n`));
          controller.error(error);
        }
      }
    });

    // DO NOT Delete the file after processing, we want to retain it
    // const { data: deletedData, error: deleteError } = await supabase.storage
    //   .from('ai-transcriber-audio')
    //   .remove([filePath]);

    // console.log('File deleted successfully:', deletedData);

    // if (deleteError) {
    //   console.error('Supabase delete error:', deleteError);
    // }

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Detailed error in /api/transcribe:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An error occurred during transcription', details: errorMessage }, { status: 500 });
  }

}
