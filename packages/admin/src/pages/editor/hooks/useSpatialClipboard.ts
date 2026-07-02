import { useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { uid } from '../../../lib/utils'
import type { Section } from '../constants'

export function useSpatialClipboard({
  editorUpdateData,
  editorSetActiveSection,
  editorSetHasUnsavedChanges,
  dataRef,
}: any) {
  const copiedSectionRef = useRef<Section | null>(null)

  const safeDeepClone = <T,>(obj: T): T => {
    try { return structuredClone(obj) } catch { return JSON.parse(JSON.stringify(obj)) }
  }

  const copySection = useCallback((sectionId: string) => {
    const latest = dataRef.current
    if (!latest) return
    const section = latest.sections.find((s: any) => s.id === sectionId)
    if (!section) return
    try {
      navigator.clipboard.writeText(JSON.stringify({ type: 'zenith-section', section }))
    } catch {
      copiedSectionRef.current = section
    }
    toast.success('Section copied', { icon: '' })
  }, [dataRef])

  const insertCopiedSection = useCallback((sourceSection: Section, afterSectionId?: string) => {
    const newSection: Section = {
      ...sourceSection,
      id: uid(),
      title: `${sourceSection.title} (Copied)`,
      content: safeDeepClone(sourceSection.content),
    }
    editorUpdateData((prev: any) => {
      const sections = [...prev.sections]
      if (afterSectionId) {
        const idx = sections.findIndex((s: any) => s.id === afterSectionId)
        sections.splice(idx + 1, 0, newSection)
      } else {
        sections.push(newSection)
      }
      return { ...prev, sections }
    })
    editorSetActiveSection(newSection.id)
    editorSetHasUnsavedChanges(true)
    toast.success('Section pasted', { icon: '' })
  }, [editorUpdateData, editorSetActiveSection, editorSetHasUnsavedChanges])

  const pasteSection = useCallback((sectionId: string) => {
    navigator.clipboard.readText().then((text) => {
      try {
        const parsed = JSON.parse(text)
        if (parsed.type === 'zenith-section') {
          insertCopiedSection(parsed.section, sectionId)
          return
        }
      } catch {}
      if (copiedSectionRef.current) {
        insertCopiedSection(copiedSectionRef.current, sectionId)
      } else {
        toast.error('No copied section found', { icon: '️' })
      }
    }).catch(() => {
      if (copiedSectionRef.current) {
        insertCopiedSection(copiedSectionRef.current, sectionId)
      } else {
        toast.error('No copied section found', { icon: '️' })
      }
    })
  }, [insertCopiedSection])

  return {
    copySection,
    pasteSection,
  }
}
