import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, Languages, Globe, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditorStore } from '../../../store/editorStore'
import { useI18nStore } from '../../../store/i18nStore'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'
import { type Section, humanize } from '../constants'
import { FieldRenderer } from '../FieldRenderer'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import { useShallow } from 'zustand/react/shallow'

interface TranslationModalProps {
 open: boolean
 onClose: () => void
}

export const TranslationModal: React.FC<TranslationModalProps> = ({ open, onClose }) => {
 const { theme } = useTheme()
 const dark = theme === 'dark'
 
 const { data, topLevelFields } = useEditorStore(useShallow(state => ({ data: state.data, topLevelFields: state.topLevelFields })))
 const { availableLocales, translations, updateTranslation } = useI18nStore()
 
 const [referenceLocale, setReferenceLocale] = useState('en')
 const [targetLocale, setTargetLocale] = useState('es')
 const BLOCK_LIBRARY = useEditorBlocks()

 // Extract all translatable fields from the sections
 const translatableFields = useMemo(() => {
 const fields: Array<{ sectionId: string; sectionName: string; fieldName: string; fieldType: string; originalValue: any }> = []
 
 // 1. Top-level translatable fields from schema
 topLevelFields.forEach((field) => {
 if (['text', 'richtext', 'textarea', 'lexical'].includes(field.type)) {
 fields.push({
 sectionId: 'root',
 sectionName: 'Document Data',
 fieldName: field.name,
 fieldType: field.type,
 originalValue: data?.[field.name]
 })
 }
 })

 // 2. Section-level translatable fields
 if (!data?.sections) return fields

 data.sections.forEach((section: Section) => {
 const blockDef = BLOCK_LIBRARY.find((b) => b.type === section.blockType)
 if (!blockDef) return

 blockDef.fields.forEach((field) => {
 if (['text', 'richtext', 'textarea', 'lexical'].includes(field.type)) {
 fields.push({
 sectionId: section.id,
 sectionName: section.blockName || section.title || humanize(section.blockType),
 fieldName: field.name,
 fieldType: field.type,
 originalValue: section.content[field.name]
 })
 }
 })
 })

 return fields
 }, [data, BLOCK_LIBRARY, topLevelFields])

 // Progress calculation
 const progress = useMemo(() => {
 if (translatableFields.length === 0) return 0
 let translatedCount = 0
 translatableFields.forEach((field) => {
 const fieldKey = field.sectionId === 'root' ? field.fieldName : `${field.sectionId}.${field.fieldName}`
 const translation = translations[fieldKey]?.[targetLocale]
 if (translation && translation.trim() !== '') {
 translatedCount++
 }
 })
 return Math.round((translatedCount / translatableFields.length) * 100)
 }, [translatableFields, translations, targetLocale])

 return createPortal(
 <AnimatePresence>
 {open && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 15 }}
 className={cn(
 'border rounded-none-none w-full max-w-6xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]',
 dark ? 'bg-app border-z-border text-z-primary' : 'bg-z-panel border-z-border shadow-sm text-z-primary'
 )}
 >
 {/* Header */}
 <div className="p-6 border-b border-z-border dark:border-z-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-z-accent  rounded-none-none flex items-center justify-center text-z-primary shadow-lg shrink-0">
 <Languages size={18} />
 </div>
 <div className="flex flex-col">
 <h3 className="text-sm font-semibold">
 Translation_Engine
 </h3>
 <p className="text-sm font-bold text-z-muted mt-1">
 Side-by-side content localization
 </p>
 </div>
 </div>

 {/* Locale Selectors */}
 <div className="flex items-center gap-4 w-full sm:w-auto">
 <div className="flex items-center gap-2 flex-1 sm:flex-none">
 <span className="text-sm font-bold text-z-secondary">Reference:</span>
 <select
 value={referenceLocale}
 onChange={(e) => setReferenceLocale(e.target.value)}
 className={cn(
 'w-32 px-3 py-1.5 text-xs font-bold border rounded-none-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors appearance-none cursor-pointer',
 dark ? 'border-z-border hover:border-z-border text-z-primary' : 'border-z-border hover:border-z-border text-z-primary'
 )}
 >
 {availableLocales.map(l => (
 <option key={l.code} value={l.code} className="text-z-primary bg-z-panel">{l.flag} {l.name}</option>
 ))}
 </select>
 </div>
 
 <div className="text-z-muted"><Globe size={14} /></div>
 
 <div className="flex items-center gap-2 flex-1 sm:flex-none">
 <span className="text-sm font-bold text-z-secondary ">Target:</span>
 <select
 value={targetLocale}
 onChange={(e) => setTargetLocale(e.target.value)}
 className={cn(
 'w-32 px-3 py-1.5 text-xs font-bold border rounded-none-none dark:bg-z-panel/5 bg-z-panel outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors appearance-none cursor-pointer',
 dark ? 'border-z-border/30 hover:border-z-border/60 text-z-secondary' : 'border-z-border/30 hover:border-z-border/60 text-z-secondary'
 )}
 >
 {availableLocales.map(l => (
 <option key={l.code} value={l.code} className="text-z-primary bg-z-panel">{l.flag} {l.name}</option>
 ))}
 </select>
 </div>

 <button
 onClick={onClose}
 className="ml-4 p-2 text-z-muted hover:text-z-primary transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="h-1 bg-[var(--z-bg-hover)] dark:bg-z-hover w-full relative">
 <div 
 className="absolute left-0 top-0 bottom-0 bg-z-border transition-all duration-500" 
 style={{ width: `${progress}%` }}
 />
 </div>

 {/* Content Area */}
 <div className="flex-1 overflow-y-auto p-6 space-y-12">
 {translatableFields.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-z-secondary">
 <AlertCircle size={48} className="mb-4 opacity-20" />
 <p className="text-xs font-bold">No text fields found to translate.</p>
 </div>
 ) : (
 translatableFields.map((field, _idx) => {
 const fieldKey = field.sectionId === 'root' ? field.fieldName : `${field.sectionId}.${field.fieldName}`
 const refValue = translations[fieldKey]?.[referenceLocale] || (referenceLocale === 'en' ? field.originalValue : '') || ''
 const targetValue = translations[fieldKey]?.[targetLocale] || ''

 return (
 <div key={`${field.sectionId}-${field.fieldName}`} className="space-y-4 relative">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-z-border rounded-none-none" />
 <h4 className="text-sm font-semibold text-z-secondary">
 {field.sectionName} <span className="text-z-secondary mx-1">&gt;</span> {humanize(field.fieldName)}
 </h4>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Left: Reference (Read-only) */}
 <div className="opacity-70 pointer-events-none relative">
 <div className="absolute top-0 right-0 p-2 text-sm font-semibold text-z-muted z-10 bg-app/50 backdrop-blur-md">
 Reference ({referenceLocale})
 </div>
 <FieldRenderer
 blockId={field.sectionId}
 field={{ name: field.fieldName, type: field.fieldType as any, label: '' }}
 value={refValue}
 onChange={() => {}}
 theme={theme}
 /></div>
 
 {/* Right: Target (Editable) */}
 <div className="relative border border-z-border/20 p-4 -m-4 bg-z-hover">
 <div className="absolute top-0 right-0 p-2 text-sm font-semibold text-z-secondary z-10 bg-app/50 backdrop-blur-md flex items-center gap-1.5">
 {targetValue ? <Check size={10} className="text-z-secondary" /> : null}
 Target ({targetLocale})
 </div>
 <FieldRenderer
 blockId={field.sectionId}
 field={{ name: field.fieldName, type: field.fieldType as any, label: '' }}
 value={targetValue}
 onChange={(newVal) => updateTranslation(fieldKey, targetLocale, newVal)}
 theme={theme}
 /></div>
 </div>
 </div>
 )
 })
 )}
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 )
}
