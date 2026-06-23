import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { uid } from '../../../lib/utils'
import type { Section } from '../constants'

export function useSpatialActions({
  editorUpdateData,
  editorSetActiveSection,
  editorSetHasUnsavedChanges,
  setDeleteConfirm,
  selectedSections,
  setSelectedSections,
  dataRef,
  BLOCK_LIBRARY,
  injectionIndex,
  setInjectionIndex,
  setBlockPickerOpen,
  activeDynamicZone,
}: any) {
  const safeDeepClone = <T,>(obj: T): T => {
    try { return structuredClone(obj) } catch { return JSON.parse(JSON.stringify(obj)) }
  }

  const addBlock = useCallback((blockType: string) => {
    const block = BLOCK_LIBRARY.find((b: any) => b.type === blockType)
    if (!block) return
    const newId = uid()
    const anchorId = `${block.type}-${newId.slice(0, 4)}`
    const newSection: Section = { 
      id: newId, 
      blockType: block.type, 
      title: block.title, 
      content: { ...block.defaultContent, anchorId } 
    }
    editorUpdateData((prev: any) => {
      const sections = prev?.sections || []
      const newSections = [...sections]
      if (injectionIndex !== null) {
        newSections.splice(injectionIndex, 0, newSection)
      } else {
        newSections.push(newSection)
      }
      return { ...prev, sections: newSections }
    })
    editorSetActiveSection(newSection.id)
    setBlockPickerOpen(false)
    setInjectionIndex(null)
    toast.success(`Section added: ${blockType.toUpperCase()}`, { icon: '✨' })
  }, [BLOCK_LIBRARY, editorUpdateData, editorSetActiveSection, setBlockPickerOpen, setInjectionIndex, injectionIndex])

  const duplicateSection = useCallback((sectionId: string) => {
    const latest = dataRef.current
    if (!latest) return
    const sectionToDuplicate = latest.sections.find((s: any) => s.id === sectionId)
    if (!sectionToDuplicate) return
    const newId = uid()
    const anchorId = `${sectionToDuplicate.blockType}-${newId.slice(0, 4)}`
    const duplicatedSection: Section = { 
      ...sectionToDuplicate, 
      id: newId, 
      title: `${sectionToDuplicate.title} (Copy)`, 
      content: { ...safeDeepClone(sectionToDuplicate.content), anchorId } 
    }
    editorUpdateData((prev: any) => { 
      const idx = prev.sections.findIndex((s: any) => s.id === sectionId)
      const newSections = [...prev.sections]
      newSections.splice(idx + 1, 0, duplicatedSection)
      return { ...prev, sections: newSections } 
    })
    editorSetActiveSection(duplicatedSection.id)
    toast.success('Section duplicated', { icon: '📋' })
  }, [dataRef, editorUpdateData, editorSetActiveSection])

  const removeSection = useCallback((id: string) => {
    const target = dataRef.current?.sections?.find((s: any) => s.id === id)
    if (!target) return
    setDeleteConfirm({ open: true, sectionId: id })
  }, [dataRef, setDeleteConfirm])

  const confirmRemoveSection = useCallback((deleteConfirmId: string | null) => {
    const id = deleteConfirmId
    if (!id) return
    const target = dataRef.current?.sections?.find((s: any) => s.id === id)
    setDeleteConfirm({ open: false, sectionId: null })
    editorUpdateData((prev: any) => ({ ...prev, sections: prev.sections.filter((s: any) => s.id !== id) }))
    
    // De-select logic if active is removed
    // Requires a small hack to access the current activeSection, or we just trust the store
    if (selectedSections.has(id)) { 
      const newSelected = new Set(selectedSections)
      newSelected.delete(id)
      setSelectedSections(newSelected) 
    }
    toast.error(`Section "${target?.title || target?.blockType}" removed`)
  }, [dataRef, setDeleteConfirm, editorUpdateData, selectedSections, setSelectedSections])

  const convertBlockType = useCallback((sectionId: string, newBlockType: string) => {
    const targetBlockDef = BLOCK_LIBRARY.find((b: any) => b.type === newBlockType)
    if (!targetBlockDef) return
    editorUpdateData((prev: any) => {
      if (!prev) return prev
      const newSections = [...(prev.sections || [])]
      const idx = newSections.findIndex((s: any) => s.id === sectionId)
      if (idx !== -1) {
        const oldSection = newSections[idx]
        const oldContent = oldSection.content || {}
        const newContent = { ...targetBlockDef.defaultContent }

        const titleKeys = ['title', 'heading', 'headline', 'name']
        const bodyKeys = ['content', 'description', 'bio', 'body', 'subheadline']

        const oldTitleVal = Object.entries(oldContent).find(([k]) => titleKeys.some((tk) => k.toLowerCase().includes(tk)))?.[1]
        const oldBodyVal = Object.entries(oldContent).find(([k]) => bodyKeys.some((bk) => k.toLowerCase().includes(bk)))?.[1]

        Object.keys(newContent).forEach((key) => {
          const kLower = key.toLowerCase()
          if (titleKeys.some((tk) => kLower.includes(tk)) && oldTitleVal !== undefined) {
            newContent[key] = oldTitleVal
          } else if (bodyKeys.some((bk) => kLower.includes(bk)) && oldBodyVal !== undefined) {
            newContent[key] = oldBodyVal
          } else if (oldContent[key] !== undefined) {
            newContent[key] = oldContent[key]
          }
        })

        newSections[idx] = {
          ...oldSection,
          blockType: newBlockType,
          title: targetBlockDef.title,
          content: newContent,
        }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
    toast.success(`Converted block layout to: ${targetBlockDef.title}`, { icon: '🔄' })
  }, [BLOCK_LIBRARY, editorUpdateData, editorSetHasUnsavedChanges])

  const toggleCollapse = useCallback((sectionId: string) => {
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s: any) => s.id === sectionId)
      if (idx !== -1) {
        newSections[idx] = { ...newSections[idx], collapsed: !newSections[idx].collapsed }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }, [editorUpdateData, editorSetHasUnsavedChanges])

  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s: any) => s.id === sectionId)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= newSections.length) return prev
      ;[newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]]
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }, [editorUpdateData, editorSetHasUnsavedChanges])

  const handleBlockNameChange = useCallback((sectionId: string, name: string) => {
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s: any) => s.id === sectionId)
      if (idx !== -1) {
        newSections[idx] = { ...newSections[idx], blockName: name }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }, [editorUpdateData, editorSetHasUnsavedChanges])

  const handleCollapseAll = useCallback(() => {
    const latest = dataRef.current
    if (!latest) return
    const allCollapsed = latest.sections.every((s: any) => s.collapsed)
    editorUpdateData((prev: any) => ({
      ...prev,
      sections: prev.sections.map((s: any) => ({ ...s, collapsed: !allCollapsed })),
    }))
    editorSetHasUnsavedChanges(true)
    toast.success(allCollapsed ? 'All sections expanded' : 'All sections collapsed', { icon: '📐' })
  }, [dataRef, editorUpdateData, editorSetHasUnsavedChanges])

  const updateAlign = useCallback((sectionId: string, align: 'left' | 'center' | 'right') => {
    editorUpdateData((prev: any) => { 
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s: any) => s.id === sectionId)
      if (idx !== -1) newSections[idx].align = align
      return { ...prev, sections: newSections } 
    })
  }, [editorUpdateData])

  const handleReorder = useCallback((newIds: string[]) => {
    editorUpdateData((prev: any) => {
      const sectionsMap = new Map((prev?.sections || []).map((s: any) => [s.id, s]))
      const newSections = newIds.map((id) => sectionsMap.get(id)).filter(Boolean) as Section[]
      return { ...prev, sections: newSections }
    })
  }, [editorUpdateData])

  const handleDynamicZoneReorder = useCallback((sectionId: string, fieldKey: string, newItems: any[]) => {
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s: any) => s.id === sectionId)
      if (sIdx !== -1) {
        newSections[sIdx].content[fieldKey] = newItems
      }
      return { ...prev, sections: newSections }
    })
  }, [editorUpdateData])

  const addToDynamicZone = useCallback((componentType: string) => {
    if (!activeDynamicZone) return
    const component = BLOCK_LIBRARY.find((b: any) => b.type === componentType)
    if (!component) return
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s: any) => s.id === activeDynamicZone.sectionId)
      if (sIdx !== -1) {
        const zone = (newSections[sIdx].content[activeDynamicZone.fieldKey] as any[]) || []
        newSections[sIdx].content[activeDynamicZone.fieldKey] = [...zone, { __component: `content.${componentType}`, ...component.defaultContent, id: `dz_${Date.now()}` }]
      }
      return { ...prev, sections: newSections }
    })
    toast.success(`${component.title} added to zone`)
  }, [activeDynamicZone, BLOCK_LIBRARY, editorUpdateData])

  const removeFromDynamicZone = useCallback((index: number) => {
    if (!activeDynamicZone) return
    editorUpdateData((prev: any) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s: any) => s.id === activeDynamicZone.sectionId)
      if (sIdx !== -1) { 
        const zone = [...((newSections[sIdx].content[activeDynamicZone.fieldKey] as any[]) || [])]
        zone.splice(index, 1)
        newSections[sIdx].content[activeDynamicZone.fieldKey] = zone 
      }
      return { ...prev, sections: newSections }
    })
  }, [activeDynamicZone, editorUpdateData])

  return {
    addBlock,
    duplicateSection,
    removeSection,
    confirmRemoveSection,
    convertBlockType,
    toggleCollapse,
    moveSection,
    handleBlockNameChange,
    handleCollapseAll,
    updateAlign,
    handleReorder,
    handleDynamicZoneReorder,
    addToDynamicZone,
    removeFromDynamicZone
  }
}
