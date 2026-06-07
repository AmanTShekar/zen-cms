import React from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { Plus } from 'lucide-react'
import { SectionBlock } from './components/SectionBlock'
import type { Section } from './constants'
import { cn } from '../../lib/utils'

export const ReorderableSectionBlock = React.memo(
 ({
 section,
 index,
 totalSections,
 theme,
 showFieldIndicators,
 editorSelectedField,
 editorSchemaFields,
 editorFieldErrors,
 editorActiveSection,
 editorSetActiveSection,
 duplicateSection,
 removeSection,
 updateAlign,
 handleFieldChange,
 setSelectedField,
 i18nEnabled,
 currentLocale,
 getTranslatedValue,
 setTranslatedValue,
 setActiveDynamicZone,
 setDynamicZoneModalOpen,
 setInjectionIndex,
 setBlockPickerOpen,
 onOpenContextMenu,
 broadcastCursor,
 toggleCollapse,
 moveSection,
 copySection,
 pasteSection,
 handleBlockNameChange,
 selectedSections,
 onMultiSelect,
 }: {
 section: Section
 index: number
 totalSections: number
 theme: 'light' | 'dark'
 showFieldIndicators: boolean
 editorSelectedField: any
 editorSchemaFields: any[]
 editorFieldErrors: any
 editorActiveSection: string | null
 editorSetActiveSection: (id: string | null) => void
 duplicateSection: (id: string) => void
 removeSection: (id: string) => void
 updateAlign: (id: string, align: 'left' | 'center' | 'right') => void
 handleFieldChange: (id: string, key: string, val: any) => void
 setSelectedField: (field: any) => void
 i18nEnabled: boolean
 currentLocale: string
 getTranslatedValue: any
 setTranslatedValue: any
 setActiveDynamicZone: any
 setDynamicZoneModalOpen: any
 setInjectionIndex: any
 setBlockPickerOpen: any
 onOpenContextMenu: (e: React.MouseEvent, sectionId: string) => void
 broadcastCursor?: (sectionId?: string, fieldKey?: string) => void
 collab?: any // collaboration context — passed through but only broadcastCursor is consumed
 toggleCollapse: (id: string) => void
 moveSection: (id: string, dir: 'up' | 'down') => void
 copySection: (id: string) => void
 pasteSection: (id: string) => void
 handleBlockNameChange: (id: string, name: string) => void
 selectedSections: Set<string>
 onMultiSelect: (id: string, multi: boolean) => void
 }) => {
 const dragControls = useDragControls()

 return (
 <Reorder.Item
 key={section.id}
 value={section.id}
 dragListener={false}
 dragControls={dragControls}
 as="div"
 whileDrag={{
 scale: 1.02,
 opacity: 0.9,
 boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
 zIndex: 50,
 cursor: 'grabbing',
 }}
 className="relative group/item"
 >
 <div className="relative h-8 group/portal -mt-4">
 <button
 onClick={() => {
 setInjectionIndex(index)
 setBlockPickerOpen(true)
 }}
 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-60 hover:!opacity-100 transition-all z-20 px-3 py-1 rounded-none border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 backdrop-blur-xl"
 >
 <span className={cn(
 'text-[9px] font-black uppercase flex items-center gap-1.5 tracking-wider',
 theme === 'dark' ? 'text-white/70' : 'text-black/70'
 )}>
 <Plus size={10} className="text-emerald-600 dark:text-emerald-500" /> Insert
 </span>
 </button>
 </div>
 <SectionBlock
 section={section}
 index={index}
 totalSections={totalSections}
 isActive={editorActiveSection === section.id}
 isMultiSelected={selectedSections.has(section.id)}
 theme={theme}
 showFieldIndicators={showFieldIndicators}
 selectedField={editorSelectedField}
 schemaFields={editorSchemaFields}
 fieldErrors={editorFieldErrors}
 onSelect={(e) => onMultiSelect(section.id, e?.shiftKey || false)}
 onDuplicate={() => duplicateSection(section.id)}
 onDelete={() => removeSection(section.id)}
 onAlign={(align) => updateAlign(section.id, align)}
 onFieldChange={(key, val) => handleFieldChange(section.id, key, val)}
 onFieldSelect={(blockId: string, fieldKey: string) => { 
 setSelectedField({ blockId, fieldKey }); 
 broadcastCursor?.(blockId, fieldKey);
 editorSetActiveSection(blockId);
 onMultiSelect(blockId, false);
 }}
 i18nEnabled={i18nEnabled}
 currentLocale={currentLocale}
 getTranslatedValue={getTranslatedValue}
 setTranslatedValue={setTranslatedValue}
 onAddToDynamicZone={(sectionId, fieldKey) => {
 setActiveDynamicZone({ sectionId, fieldKey })
 setDynamicZoneModalOpen(true)
 }}
 dragControls={dragControls}
 onContextMenu={(e) => onOpenContextMenu(e, section.id)}
 onToggleCollapse={() => toggleCollapse(section.id)}
 onMoveUp={() => moveSection(section.id, 'up')}
 onMoveDown={() => moveSection(section.id, 'down')}
 onCopy={() => copySection(section.id)}
 onPaste={() => pasteSection(section.id)}
 onBlockNameChange={(name) => handleBlockNameChange(section.id, name)}
 />
 </Reorder.Item>
 )
 },
 (prev, next) => {
 if (prev.section !== next.section) return false
 if (prev.index !== next.index) return false
 if (prev.totalSections !== next.totalSections) return false
 if (prev.theme !== next.theme) return false
 if (prev.showFieldIndicators !== next.showFieldIndicators) return false
 if (prev.editorActiveSection !== next.editorActiveSection) return false
 if (prev.editorFieldErrors !== next.editorFieldErrors) return false
 if (prev.editorSelectedField !== next.editorSelectedField) return false
 if (prev.editorSchemaFields !== next.editorSchemaFields) return false
 if (prev.i18nEnabled !== next.i18nEnabled) return false
 if (prev.currentLocale !== next.currentLocale) return false
 if (prev.broadcastCursor !== next.broadcastCursor) return false
 if (prev.handleFieldChange !== next.handleFieldChange) return false
 if (prev.selectedSections !== next.selectedSections) return false
 if (prev.onMultiSelect !== next.onMultiSelect) return false
 return true
 }
)

