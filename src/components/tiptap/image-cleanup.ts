/**
 * Utility function for deleting images from Supabase storage
 */

/**
 * Deletes an image from Supabase storage
 * @param filePath - The file path to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteImageFromStorage(filePath: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/images/delete?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Failed to delete image ${filePath}:`, errorData.error || response.statusText)
      return false
    }
    
    const result = await response.json()
    console.log(`Successfully deleted image: ${filePath}`)
    return result.success === true
    
  } catch (error) {
    console.error(`Error deleting image ${filePath}:`, error)
    return false
  }
}

// Keep cleanupImages for backward compatibility, but it's now just a wrapper
export async function cleanupImages(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) return
  
  // Since we're now deleting one image at a time, this is mostly for backward compatibility
  for (const path of filePaths) {
    await deleteImageFromStorage(path)
  }
}
