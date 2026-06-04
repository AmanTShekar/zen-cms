import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { registerCodeHighlighting } from '@lexical/code'

/**
 * Code Highlight Plugin
 * ─────────────────────
 * Registers Prism-based syntax highlighting for code blocks.
 * This is a local replacement for the @lexical/react/LexicalCodeHighlightPlugin
 * which was added in a later version of Lexical.
 *
 * In lexical 0.44.0, the equivalent is `registerCodeHighlighting` from @lexical/code.
 */
export function CodeHighlightPlugin(): null {
 const [editor] = useLexicalComposerContext()

 useEffect(() => {
 return registerCodeHighlighting(editor)
 }, [editor])

 return null
}

export default CodeHighlightPlugin
