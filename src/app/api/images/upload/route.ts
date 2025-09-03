import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {  
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const pathPrefix = formData.get('pathPrefix') as string || 'notes'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Create file path matching audio pattern: {userId}/{category}/{timestamp}-{filename}
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${user.id}/${pathPrefix}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ai-transcriber-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Generate signed URL for authenticated access (since bucket is not public)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('ai-transcriber-images')
      .createSignedUrl(filePath, 3600) // 1 hour expiration

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to generate signed URL:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate signed URL for uploaded image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: filePath, // Store just the file path like audio does
      filePath
    })

  } catch (error) {
    console.error('Image upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
