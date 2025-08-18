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
  meeting_outline: z.string(),
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
          const { transcript, meetingId, speakerDetails, user_notes } = body;

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

          const promptData = {
            transcript,
            participants: speakerDetails,
            user_notes: user_notes,
          };

          const response = await openai.responses.parse({
            model: "gpt-5",
            input: [
                {
                  role: "system", 
                  content: 
                  `
                  # System Prompt: Meeting Notes Generator

                    Review the transcript and create an outline of the discussion.  
                    Focus on the flow of the conversation and paraphrase points made
                    by the speakers without quoting directly
                  `
                },
                {
                    role: "user",
                    content: 
                    `
                    ${JSON.stringify(promptData)} 
                    `
                },
            ],
            text: {
              format: zodTextFormat (MeetingSummary, "meeting_summary"),
            },
            stream: false,
          });

          const rawContent = response.output_parsed;

          if (rawContent && (rawContent.meeting_outline || rawContent.title)) {
            const { data: meeting, error: meetingError } = await supabase
              .schema("ai_transcriber")
              .from("meetings")
              .select("title")
              .eq("id", meetingId)
              .single();

            if (meetingError) {
              console.error("Error fetching meeting:", meetingError);
              controller.enqueue(
                encoder.encode(
                  "data: " +
                    JSON.stringify({
                      error: "Failed to fetch meeting details",
                      meetingId,
                      details: meetingError.message,
                    }) +
                    "\n\n"
                )
              );
              controller.close();
              return;
            }

            const shouldUpdateTitle = meeting && (
              meeting.title === null || 
              meeting.title === "Untitled Meeting" ||
              meeting.title?.trim() === ""
            );
            
            const updatePayload = {
              openai_response: JSON.stringify(response),
              formatted_transcript: transcript,
              summary_jsonb: rawContent,
              summary: rawContent.meeting_outline,
              ...(shouldUpdateTitle && { title: rawContent.title }),
            };

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
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ summary: rawContent.meeting_outline, title: rawContent.title, meetingId }) + "\n\n"));
            }
          } else {
            if (!rawContent) {
              console.warn("OpenAI response.output_parsed was null or undefined for meetingId:", meetingId);
            }
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

