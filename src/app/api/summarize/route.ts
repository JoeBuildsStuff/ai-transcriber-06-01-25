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
  date: z.string(),
  executive_summary: z.string(),
  participants: z.string(),
  discussion_outline: z.string(),
  decisions: z.string(),
  questions_asked: z.string(),
  action_items: z.string(),
  next_meeting_open_items: z.string(),
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
          const { transcript, meetingId, speakerDetails } = body;

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
          };

          const response = await openai.responses.parse({
            model: "gpt-4o-2024-08-06",
            input: [
                {
                  role: "system", 
                  content: 
                  `
                  # System Prompt: Meeting Notes Generator

                  You are an AI assistant specialized in converting meeting transcripts into concise, well-structured meeting notes. You will receive input as a JSON object with two keys: \`transcript\` and \`participants\`.

                  - The \`transcript\` is an array of objects, each with a \`speaker\` (numeric ID) and \`text\`.
                  - The \`participants\` object maps the numeric speaker ID to their details, including \`displayName\` and \`notes\`. The \`notes\` field contains contextual information about the person (e.g., their role, company, or relationship to the project). Use this information to add depth and accuracy to your summary, especially when describing participant contributions and roles.

                  ## Output Format

                  When presented with this data, generate structured meeting notes with the following sections:

                  1. **Title:** Generate a concise and descriptive meeting title. Format as \`Title: [Your Generated Title]\` on the first line of the response.
                  2. **Date:** If provided in the transcript or metadata, include it; otherwise omit.
                  3. **Executive Summary:** A clear 2–3 paragraph recap of the meeting's main discussion and outcomes, written in a concise, professional tone. It should be easily digestible for someone who did not attend.
                  4. **Participants:** A list of attendees with their roles (using the \`participants\` object).
                  5. **Discussion Outline:** A bulleted list summarizing the main topics and key points discussed.
                  6. **Decisions:** Clearly note any decisions made during the meeting.
                  7. **Questions Asked:** Bullet list of any questions raised or discussed during the meeting.
                  8. **Action Items:** A numbered table (or list) with:
                     - Task
                     - Owner
                     - Due Date (if mentioned)
                  9. **Next Meeting / Open Items:** If a next meeting date or unresolved items were mentioned, list them here.

                  ## Formatting Guidelines

                  - Use Markdown formatting
                    - Use \`##\` for each major section header
                    - Use \`**bold**\` for emphasis on names, roles, or key outcomes
                    - Use \`-\` for bullet lists
                    - Use \`1.\` for numbered action items
                  - Keep the notes concise
                    - Summarize, don't transcribe
                    - Focus on key takeaways, decisions, and deliverables
                  - Maintain a business-professional tone
                    - Avoid opinions or unnecessary detail
                    - Be neutral and fact-based
                  - If information is unclear, denote it as: \`To be clarified: [topic or question]\`

                  Your output should serve as a useful summary for both attendees and non-attendees to understand what happened and what comes next.
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

          if (rawContent && (rawContent.executive_summary || rawContent.title)) {
            const updatePayload = {
              openai_response: JSON.stringify(response), // Store the full stringified OpenAI response object
              formatted_transcript: transcript, // Make sure transcript is included
              summary_jsonb: rawContent,
              summary: rawContent.executive_summary,
              title: rawContent.title,
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
              controller.enqueue(encoder.encode("data: " + JSON.stringify({ summary: rawContent.executive_summary, title: rawContent.title, meetingId }) + "\n\n"));
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

