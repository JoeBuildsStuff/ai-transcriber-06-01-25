import { Image } from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CustomImageView } from './custom-image-view'

export const CustomImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CustomImageView)
  },
  
  addAttributes() {
    return {
      ...this.parent?.(),
      // Add custom attributes if needed
    }
  },
})
