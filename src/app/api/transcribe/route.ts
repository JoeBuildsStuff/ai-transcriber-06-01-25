import { NextRequest, NextResponse } from 'next/server';
import { createClient as deepgramClient } from "@deepgram/sdk";
import { createClient as supabaseClient } from "@/lib/supabase/server";

export const runtime = 'edge';

const deepgram = deepgramClient(process.env.DEEPGRAM_API_KEY!);

export async function POST(req: NextRequest) {

  console.log('Received request to transcribe');
  console.log('\n\n\n');

  try {

    const supabase = await supabaseClient();

    const { filePath } = await req.json();
    console.log('Attempting to download filePath:', filePath);
    console.log('\n\n\n');

    if (!filePath) {
      throw new Error('No file path provided');
    }

    const { data, error } = await supabase.storage
      .from('ai-transcriber-audio')
      .download(filePath);

    if (error) {
      console.error('Supabase download error object:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseError = error as any;
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
      throw error;
    }

    console.log('File downloaded successfully');
    console.log('\n\n\n');

    const arrayBuffer = await data.arrayBuffer();

    console.log('ArrayBuffer created, size:', arrayBuffer.byteLength);
    console.log('\n\n\n');
    
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial processing message
          controller.enqueue(encoder.encode('data: {"status": "Processing started"}\n\n'));

          // Call Deepgram API
          const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            Buffer.from(arrayBuffer),
            {
              model: "nova-3",
              diarize: true,
              punctuate: true,
              utterances: true,
            }
          );

          if (error) {
            throw error;
          }

          // Send the complete result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));

          controller.enqueue(encoder.encode('data: {"status": "Processing completed"}\n\n'));
          controller.close();

        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        }
      }
    });

    // Delete the file after processing
    const { data: deletedData, error: deleteError } = await supabase.storage
      .from('ai-transcriber-audio')
      .remove([filePath]);

    console.log('File deleted successfully:', deletedData);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
    }

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json({ error: 'An error occurred', details: error }, { status: 500 });
  }

}

const encoder = new TextEncoder();
