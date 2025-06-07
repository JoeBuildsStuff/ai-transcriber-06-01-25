import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('User not authenticated for fetching meetings:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { data: meetings, error: meetingsError } = await supabase
      .schema('ai_transcriber')
      .from('meetings')
      .select('id, original_file_name, created_at, updated_at, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError);
      return NextResponse.json({ error: 'Failed to fetch meetings', details: meetingsError.message }, { status: 500 });
    }

    return NextResponse.json(meetings);

  } catch (error) {
    console.error('Unexpected error in /api/meetings GET:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}