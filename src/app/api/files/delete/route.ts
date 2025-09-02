import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not authenticated for deleting file:', userError)
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Verify the user owns this file (file path should start with their user ID)
    if (!filePath.startsWith(user.id)) {
      console.error(`User ${user.id} attempted to delete file ${filePath}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from('ai-transcriber-files')
      .remove([filePath])

    if (deleteError) {
      console.error('Error deleting file from storage:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete file', 
        details: deleteError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully',
      filePath 
    })

  } catch (error) {
    console.error('Unexpected error in /api/files/delete:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: errorMessage 
    }, { status: 500 })
  }
}
