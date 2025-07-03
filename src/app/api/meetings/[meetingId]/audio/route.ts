import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface Params {
  meetingId: string;
}

export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const supabase = await createClient();
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for fetching audio:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get the meeting to check ownership and get audio file path
    const { data: meeting, error: meetingError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('audio_file_path')
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (meetingError) {
      if (meetingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
      }
      console.error(`Error fetching meeting ${meetingId} for audio:`, meetingError);
      return NextResponse.json({ error: 'Failed to fetch meeting', details: meetingError.message }, { status: 500 });
    }

    if (!meeting?.audio_file_path) {
      return NextResponse.json({ error: 'No audio file available for this meeting' }, { status: 404 });
    }

    // Create signed URL for the audio file
    const { data, error: signedUrlError } = await supabase.storage
      .from('ai-transcriber-audio')
      .createSignedUrl(meeting.audio_file_path, 3600); // 1 hour expiration

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate audio URL', details: signedUrlError.message }, { status: 500 });
    }

    return NextResponse.json({ audioUrl: data.signedUrl });

  } catch (error) {
    console.error('Unexpected error in /api/meetings/[meetingId]/audio GET:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
} 