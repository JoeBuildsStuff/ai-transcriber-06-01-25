import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface Params {
  meetingId: string;
}

// The first parameter is Request, renaming to _ if unused.
export async function GET(_req: Request, { params }: { params: Promise<Params> }) {
  try {
    const supabase = await createClient();
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for fetching meeting details:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { data: meeting, error: meetingError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('*, title') // Ensure title is selected
      .eq('id', meetingId)
      .eq('user_id', user.id) // Ensure the user owns this meeting
      .single();

    if (meetingError) {
      if (meetingError.code === 'PGRST116') { // PostgREST error for "exactly one row expected, but none found"
        return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
      }
      console.error(`Error fetching meeting ${meetingId}:`, meetingError);
      return NextResponse.json({ error: 'Failed to fetch meeting', details: meetingError.message }, { status: 500 });
    }

    if (!meeting) {
      // This case should ideally be covered by PGRST116, but as a fallback:
      return NextResponse.json({ error: 'Meeting not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(meeting);

  } catch (error) {
    console.error('Unexpected error in /api/meetings/[meetingId] GET:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const supabase = await createClient();
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for deleting meeting:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // First, get the audio_file_path from the meeting record
    const { data: meetingData, error: fetchError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('audio_file_path, title') // Ensure title is selected here if needed for any delete logic, though not currently used for delete
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Meeting not found or access denied for deletion' }, { status: 404 });
      }
      console.error(`Error fetching meeting ${meetingId} for deletion:`, fetchError);
      return NextResponse.json({ error: 'Failed to fetch meeting details before deletion', details: fetchError.message }, { status: 500 });
    }

    if (!meetingData) {
      return NextResponse.json({ error: 'Meeting not found or access denied for deletion' }, { status: 404 });
    }

    const { audio_file_path } = meetingData;

    // If an audio file path exists, attempt to delete it from storage
    if (audio_file_path) {
      const { error: storageError } = await supabase.storage
        .from('ai-transcriber-audio')
        .remove([audio_file_path]);

      if (storageError) {
        // Log the error but proceed to delete the DB record, as the record might be more important to remove
        console.error(`Error deleting audio file ${audio_file_path} from storage:`, storageError);
        // Optionally, you could return an error here if deleting the file is critical
        // return NextResponse.json({ error: 'Failed to delete audio file', details: storageError.message }, { status: 500 });
      } else {
        console.log(`Audio file ${audio_file_path} deleted successfully.`);
      }
    }

    // Delete the meeting record from the database
    const { error: deleteError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .delete()
      .eq('id', meetingId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error(`Error deleting meeting ${meetingId} from database:`, deleteError);
      return NextResponse.json({ error: 'Failed to delete meeting record', details: deleteError.message }, { status: 500 });
    }

    console.log(`Meeting ${meetingId} deleted successfully by user ${user.id}.`);
    return NextResponse.json({ message: 'Meeting and associated audio deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in /api/meetings/[meetingId] DELETE:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred during deletion', details: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const supabase = await createClient();
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for updating meeting title:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { title } = await req.json();

    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'A valid title is required' }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', meetingId)
      .eq('user_id', user.id)
      .select('id, title, updated_at')
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') { // Not found or no permission
        return NextResponse.json({ error: 'Meeting not found or access denied for update' }, { status: 404 });
      }
      console.error(`Error updating title for meeting ${meetingId}:`, updateError);
      return NextResponse.json({ error: 'Failed to update meeting title', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Meeting title updated successfully', meeting: data }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in /api/meetings/[meetingId] PUT:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred while updating title', details: errorMessage }, { status: 500 });
  }
}
 