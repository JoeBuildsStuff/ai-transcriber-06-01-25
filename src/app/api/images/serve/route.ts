import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not authenticated for fetching image:', userError)
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Verify the user owns this file (file path should start with their user ID)
    if (!filePath.startsWith(user.id)) {
      console.error(`User ${user.id} attempted to access file ${filePath}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate a fresh signed URL (following audio pattern)
    const { data, error: signedUrlError } = await supabase.storage
      .from('ai-transcriber-images')
      .createSignedUrl(filePath, 3600) // 1 hour expiration

    if (signedUrlError) {
      console.error('Error creating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate image URL', details: signedUrlError.message }, { status: 500 })
    }

    // Return the signed URL (following audio pattern)
    return NextResponse.json({ imageUrl: data.signedUrl })

  } catch (error) {
    console.error('Unexpected error in /api/images/serve GET:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 })
  }
}
