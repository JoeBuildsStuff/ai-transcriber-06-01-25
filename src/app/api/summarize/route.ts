import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient as supabaseClient } from "@/lib/supabase/server";
import z from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const runtime = "edge";

const openai = new OpenAI();
const encoder = new TextEncoder();

const MeetingSummary = z.object({
  title: z.string(),
  summary_notes: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated for summarize:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          const body = await req.json();
          console.log('Summarize route body:', body);
          const { transcript, meetingId } = body;

          if (!meetingId) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "meetingId is required" }) + "\n\n"));
            controller.close();
            return;
          }

          if (!transcript || transcript.length === 0) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "Transcript is empty, cannot summarize", meetingId }) + "\n\n"));
            controller.close();
            return;
          }

          controller.enqueue(encoder.encode("data: " + JSON.stringify({ message: "Request received for summary", meetingId }) + "\n\n"));

          for (let i = 1; i <= 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 700));
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ message: `Processing summary... ${i * 33}%`, meetingId }) + "\n\n"));
          }

          const response = await openai.responses.parse({
            model: "gpt-4o-mini",
            input: [
                {
                  role: "system", 
                  content: 
                  `
                  # System Prompt: Meeting Notes Generator
    
                  You are an AI assistant specialized in converting meeting transcripts into concise, well-structured meeting notes. When presented with a transcript, follow these guidelines:
    
                  1. **Generate a concise and descriptive title for the meeting.** The title should be on the very first line of your response, formatted as: "Title: [Your Generated Title]".
                  2. Analyze the transcript to identify:
                     - Participants and their roles
                     - Main topics discussed
                     - Key decisions or action items
                     - Important details or updates
    
                  2. Structure the notes as follows:
                     - Title: A Title for the meeting
                     - Date: If provided, otherwise omit
                     - Participants: List with roles if known
                     - Agenda: If explicitly stated, otherwise create a brief summary
                     - Key Points: Bulleted list of main topics and important information
                     - Action Items: Numbered list of tasks, assignments, or follow-ups
                     - Next Steps: If applicable
    
                  3. Use Markdown formatting:
                     - Use headers (##) for main sections
                     - Use bold (**) for emphasis on important points or names
                     - Use bullet points (-) for lists of information
                     - Use numbered lists (1.) for action items
    
                  4. Keep the notes concise:
                     - Summarize discussions, don't transcribe them
                     - Focus on outcomes and decisions rather than the process of reaching them
                     - Omit small talk or off-topic discussions
    
                  5. Maintain a professional tone:
                     - Use clear, business-appropriate language
                     - Avoid editorializing or including personal opinions
                     - Stick to factual information presented in the transcript
    
                  6. Handle unclear or ambiguous information:
                     - If something is unclear, note it as "To be clarified: [topic]"
                     - Don't make assumptions about unclear points
    
                  7. Conclude with:
                     - Next meeting date/time if mentioned
                     - Any open questions or unresolved issues
    
                  Remember, your goal is to create a clear, actionable summary that attendees and non-attendees alike can quickly understand and use for follow-up purposes.
                  `
                },
                {
                    role: "user",
                    content: 
                    `
                    ${JSON.stringify(transcript)} 
                    `
                },
            ],
            text: {
              format: zodTextFormat (MeetingSummary, "meeting_summary"),
            },
            stream: false,
          });

          console.log('OpenAI result for meetingId', meetingId, JSON.stringify(response).substring(0, 100) + '...');
          const rawContent = response.output_parsed;

          
          let meetingTitle: string | null = null;
          let summaryContent: string | null = null;

          if (rawContent) {
            meetingTitle = rawContent.title;
            summaryContent = rawContent.summary_notes;
          } else {
            console.warn("OpenAI response.output_parsed was null or undefined for meetingId:", meetingId);
          }

          if (summaryContent || meetingTitle) { // Proceed if we have at least a summary or a title
            const updatePayload: { summary?: string | null; formatted_transcript?: typeof transcript; openai_response?: string; title?: string | null } = {
              openai_response: JSON.stringify(response), // Store the full stringified OpenAI response object
              formatted_transcript: transcript, // Make sure transcript is included
            };
            if (summaryContent) updatePayload.summary = summaryContent;
            if (meetingTitle) updatePayload.title = meetingTitle;

            const { error: updateError } = await supabase
              .schema('ai_transcriber')
              .from('meetings')
              .update(updatePayload)
              .eq('id', meetingId)
              .eq('user_id', user.id);

            if (updateError) {
              console.error('Error updating meeting with summary:', updateError);
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "Failed to save summary to database", meetingId, details: updateError.message }) + "\n\n"));
            } else {
              console.log('Meeting record updated with summary and/or title for ID:', meetingId);
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ summary: summaryContent, title: meetingTitle, meetingId }) + "\n\n"));
            }
          } else {
             controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "OpenAI returned empty content", meetingId }) + "\n\n"));
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "Processing completed", meetingId })}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in summary stream processing:", error);
          const meetingIdFromError = error && typeof error === 'object' && 'meetingId' in error && typeof (error as { meetingId: unknown }).meetingId === 'string' ? (error as { meetingId: string }).meetingId : undefined;
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: "Error during summary generation", details: error instanceof Error ? error.message : String(error), meetingId: meetingIdFromError }) + "\n\n"));
          controller.error(error);
        }
      },
    });

    return new Response(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error in /api/summarize route:', error);
    return NextResponse.json({ error: 'An error occurred in summarize route' }, { status: 500 });
  }
}

