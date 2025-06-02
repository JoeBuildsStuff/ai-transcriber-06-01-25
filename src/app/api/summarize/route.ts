import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Send initial response
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ message: "Request received" }) + "\n\n"));

        // Parse the request body
        const body = await req.json();

        // Simulate waiting time with updates
        for (let i = 1; i <= 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          controller.enqueue(encoder.encode("data: " + JSON.stringify({ message: `Processing... ${i * 20}%` }) + "\n\n"));
        }

        // Call OpenAI API
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
              { role: "system", 
                content: 
                `
                # System Prompt: Meeting Notes Generator
  
                You are an AI assistant specialized in converting meeting transcripts into concise, well-structured meeting notes. When presented with a transcript, follow these guidelines:
  
                1. Analyze the transcript to identify:
                   - Participants and their roles
                   - Main topics discussed
                   - Key decisions or action items
                   - Important details or updates
  
                2. Structure the notes as follows:
                   - Title: "Meeting Notes: [Main Topic]"
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
                  ${JSON.stringify(body)}
                  `
              },
          ],
        });

        // Send the OpenAI response
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ summary: completion.choices[0].message.content }) + "\n\n"));

        // Send completion message
        controller.enqueue(encoder.encode('data: {"status": "Processing completed"}\n\n'));
        controller.close();
      } catch (error) {
        console.error("Error in stream processing:", error);
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
console.error('Error:', error);
return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
}
}

