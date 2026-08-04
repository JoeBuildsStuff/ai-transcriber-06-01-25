/** Client metadata injected into every chat tool call — never persist these. */
export const CLIENT_CONTEXT_KEYS = [
  'client_tz',
  'client_utc_offset',
  'client_now_iso',
  'client_path',
] as const

const CLIENT_CONTEXT_KEY_SET = new Set<string>(CLIENT_CONTEXT_KEYS)

export function stripClientContext(
  parameters: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(parameters).filter(([key]) => !CLIENT_CONTEXT_KEY_SET.has(key))
  )
}
