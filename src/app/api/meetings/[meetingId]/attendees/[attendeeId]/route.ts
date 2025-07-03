import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface Params {
  meetingId: string;
  attendeeId: string;
}

export async function PUT(req: Request, { params }: { params: Promise<Params> }) {
  try {
    const supabase = await createClient();
    const { meetingId, attendeeId } = await params;

    if (!meetingId || !attendeeId) {
      return NextResponse.json({ error: 'Meeting ID and Attendee ID are required' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for updating attendee:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { attendance_status } = await req.json();

    if (!attendance_status || !['present', 'absent', 'unknown'].includes(attendance_status)) {
      return NextResponse.json({ error: 'Valid attendance status is required (present, absent, or unknown)' }, { status: 400 });
    }

    // Verify the meeting belongs to the user and the attendee exists
    const { data: attendee, error: attendeeError } = await supabase
      .schema('ai_transcriber')
      .from('meeting_attendees')
      .select('id, meeting_id, contact_id')
      .eq('id', attendeeId)
      .eq('meeting_id', meetingId)
      .eq('user_id', user.id)
      .single();

    if (attendeeError) {
      if (attendeeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Attendee not found or access denied' }, { status: 404 });
      }
      console.error(`Error fetching attendee ${attendeeId}:`, attendeeError);
      return NextResponse.json({ error: 'Failed to fetch attendee', details: attendeeError.message }, { status: 500 });
    }

    if (!attendee) {
      return NextResponse.json({ error: 'Attendee not found or access denied' }, { status: 404 });
    }

    // Update the attendance status
    const { data, error: updateError } = await supabase
      .schema('ai_transcriber')
      .from('meeting_attendees')
      .update({ 
        attendance_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendeeId)
      .eq('user_id', user.id)
      .select('id, attendance_status, updated_at')
      .single();

    if (updateError) {
      console.error(`Error updating attendee ${attendeeId}:`, updateError);
      return NextResponse.json({ error: 'Failed to update attendance status', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Attendance status updated successfully', 
      attendee: data 
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in /api/meetings/[meetingId]/attendees/[attendeeId] PUT:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred while updating attendee', details: errorMessage }, { status: 500 });
  }
} 