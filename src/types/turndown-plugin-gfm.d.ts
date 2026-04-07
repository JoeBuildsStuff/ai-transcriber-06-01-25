declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'

  type TurndownPlugin = (service: TurndownService) => void

  export const gfm: TurndownPlugin
  export const highlightedCodeBlock: TurndownPlugin
}
