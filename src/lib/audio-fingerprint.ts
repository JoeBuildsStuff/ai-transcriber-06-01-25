/**
 * SHA-256 hex digest of file bytes (matches desktop `AudioFileFingerprint.sha256Hex`).
 */
export async function sha256HexFromFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
