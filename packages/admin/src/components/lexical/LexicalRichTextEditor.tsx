import { useCallback, useEffect, useMemo } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { TablePlugin } from '@lexical/react/LexicalTablePlugin'
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin'
import { CodeHighlightPlugin } from './plugins/CodeHighlightPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import type { EditorState, LexicalEditor } from 'lexical'
import { SlashCommandPlugin } from './plugins/SlashCommandPlugin'
import { MarkdownShortcutPlugin } from './plugins/MarkdownShortcutPlugin'
import { cn } from '../../lib/utils'
import { useTheme } from '../../context/ThemeContext'
import { Toolbar } from './Toolbar'
import { nodes, onError, EDITOR_NAMESPACE } from './LexicalConfig'
import { useModalStore } from '../../store/modalStore'

export type LexicalEditorMode = 'full' | 'inline' | 'heading' | 'micro'

interface LexicalRichTextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  mode?: LexicalEditorMode
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

function LexicalPlaceholder({ text }: { text: string }) {
  const { theme } = useTheme()
  return (
    <div
      className={cn(
        'absolute top-0 left-0 pointer-events-none select-none truncate max-w-full',
        theme === 'dark' ? 'text-gray-600' : 'text-gray-400',
      )}
    >
      {text}
    </div>
  )
}

function EditorStateSync({ onChange }: { onChange?: (value: string) => void }) {
  const handleChange = useCallback(
    (editorState: EditorState, _editor: LexicalEditor) => {
      if (!onChange) return
      onChange(JSON.stringify(editorState.toJSON()))
    },
    [onChange],
  )
  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
}

function LexicalEditorInner({ mode, placeholder, disabled, autoFocus }: {
  mode: LexicalEditorMode
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}) {
  const { theme } = useTheme()
  const setMediaLibraryOpen = useModalStore((s) => s.setMediaLibraryOpen)

  useEffect(() => {
    const handler = () => setMediaLibraryOpen(true)
    window.addEventListener('zenith:open-media-picker', handler)
    return () => window.removeEventListener('zenith:open-media-picker', handler)
  }, [setMediaLibraryOpen])

  return (
    <div className="relative flex flex-col h-full">
      <Toolbar disabled={disabled} />

      <div className="relative flex-1 overflow-y-auto">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                'outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black min-h-full',
                'prose prose-indigo max-w-none',
                theme === 'dark' ? 'prose-invert text-white' : 'text-gray-900',
                mode === 'heading'
                  ? 'text-5xl md:text-7xl font-black italic tracking-tighter p-0 min-h-0 uppercase leading-[0.85]'
                  : mode === 'inline'
                    ? 'text-2xl font-bold p-0 min-h-0 italic tracking-tight'
                    : mode === 'micro'
                      ? 'text-[12px] font-black uppercase tracking-[0.2em] p-4 min-h-0 italic opacity-80'
                      : 'min-h-[280px] px-4 py-6 text-[16px] leading-relaxed',
              )}
            />
          }
          placeholder={<LexicalPlaceholder text={placeholder || 'Type / for commands…'} />}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>

      <ListPlugin />
      <TabIndentationPlugin />
      <LinkPlugin />
      <TablePlugin hasCellMerge={true} hasCellBackgroundColor={true} />
      <HashtagPlugin />
      <CodeHighlightPlugin />
      <SlashCommandPlugin />
      <MarkdownShortcutPlugin />
      {autoFocus && <AutoFocusPlugin />}
    </div>
  )
}

export function LexicalRichTextEditor({
  value,
  onChange,
  placeholder = 'Type / for commands…',
  mode = 'full',
  className,
  disabled = false,
  autoFocus = false,
}: LexicalRichTextEditorProps) {
  const { theme } = useTheme()

  const initialConfig = useMemo(
    () => {
      let editorState = undefined;
      if (typeof value === 'string' && value.startsWith('{"root"')) {
        editorState = value;
      } else if (value !== null && typeof value === 'object' && (value as any)?.root) {
        editorState = JSON.stringify(value);
      }

      return {
      namespace: EDITOR_NAMESPACE,
      nodes,
      onError,
      editable: !disabled,
      editorState,
      theme: {
        ltr: 'ltr',
        rtl: 'rtl',
        paragraph: 'lexical-paragraph',
        heading: {
          h1: 'lexical-heading-1',
          h2: 'lexical-heading-2',
          h3: 'lexical-heading-3',
        },
        quote: 'lexical-quote',
        list: {
          ul: 'lexical-list-ul',
          ol: 'lexical-list-ol',
          listitem: 'lexical-list-item',
          nested: {
            listitem: 'lexical-list-item-nested',
          },
          olDepth: [
            'lexical-list-ol1',
            'lexical-list-ol2',
            'lexical-list-ol3',
            'lexical-list-ol4',
            'lexical-list-ol5',
          ],
        },
        link: 'lexical-link',
        text: {
          bold: 'lexical-bold',
          italic: 'lexical-italic',
          underline: 'lexical-underline',
          strikethrough: 'lexical-strikethrough',
          code: 'lexical-code-text',
        },
        code: 'lexical-code',
        codeHighlight: {
          atrule: 'lexical-token-attr',
          attr: 'lexical-token-attr',
          boolean: 'lexical-token-property',
          builtin: 'lexical-token-selector',
          cdata: 'lexical-token-comment',
          char: 'lexical-token-selector',
          class: 'lexical-token-function',
          'class-name': 'lexical-token-function',
          comment: 'lexical-token-comment',
          constant: 'lexical-token-property',
          deleted: 'lexical-token-property',
          doctype: 'lexical-token-comment',
          entity: 'lexical-token-operator',
          function: 'lexical-token-function',
          important: 'lexical-token-keyword',
          inserted: 'lexical-token-selector',
          keyword: 'lexical-token-keyword',
          namespace: 'lexical-token-deleted',
          number: 'lexical-token-property',
          operator: 'lexical-token-operator',
          prolog: 'lexical-token-comment',
          property: 'lexical-token-property',
          punctuation: 'lexical-token-punctuation',
          regex: 'lexical-token-variable',
          selector: 'lexical-token-selector',
          string: 'lexical-token-selector',
          symbol: 'lexical-token-property',
          tag: 'lexical-token-tag',
          url: 'lexical-token-operator',
          variable: 'lexical-token-variable',
        },
      }
    }
    },
    [disabled, value],
  )

  const isFull = mode === 'full'

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden transition-all duration-300 relative',
        isFull
          ? theme === 'dark'
            ? 'bg-[#080808] border border-white/5 shadow-2xl'
            : 'bg-white border border-gray-100 shadow-xl'
          : 'bg-transparent',
        className,
      )}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <EditorStateSync onChange={onChange} />
        <LexicalEditorInner
          mode={mode}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
        />
        <HistoryPlugin />
      </LexicalComposer>
    </div>
  )
}

export default LexicalRichTextEditor
