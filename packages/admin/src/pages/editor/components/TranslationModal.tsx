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

interface TranslationModalProps {
 open: boolean
 onClose: () => void
}

export const TranslationModal: React.FC<TranslationModalProps> = ({ open, onClose }) => {
 const { theme } = useTheme()
 const dark = theme === 'dark'
 
 const { data } = useEditorStore()
 const { availableLocales, translations, updateTranslation } = useI18nStore()
 
 const [referenceLocale, setReferenceLocale] = useState('en')
 const [targetLocale, setTargetLocale] = useState('es')
 const BLOCK_LIBRARY = useEditorBlocks()

 // Extract all translatable fields from the sections
 const translatableFields = useMemo(() => {
 const fields: Array<{ sectionId: string; sectionName: string; fieldName: string; fieldType: string; originalValue: any }> = []
 
 if (!data?.sections) return fields

 data.sections.forEach((section: Section) => {
 const blockDef = BLOCK_LIBRARY.find((b) => b.type === section.blockType)
 if (!blockDef) return

 blockDef.fields.forEach((field) => {
 // Only text-based fields should be translatable
 if (['text', 'richtext'].includes(field.type)) {
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
 }, [data, BLOCK_LIBRARY])

 // Progress calculation
 const progress = useMemo(() => {
 if (translatableFields.length === 0) return 0
 let translatedCount = 0
 translatableFields.forEach((field) => {
 const translation = translations[field.sectionId]?.[field.fieldName]?.[targetLocale]
 if (translation && translation.trim() !== '') {
 translatedCount++
 }
 })
 return Math.round((translatedCount / translatableFields.length) * 100)
 }, [translatableFields, translations, targetLocale])

 return createPortal(
 <AnimatePresence>
 {open && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 15 }}
 className={cn(
 'border rounded-none w-full max-w-6xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]',
 dark ? 'bg-black border-white/[0.08] text-white' : 'bg-white border-gray-100 text-gray-900'
 )}
 >
 {/* Header */}
 <div className="p-6 border-b border-gray-50 dark:border-white/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-emerald-600 rounded-none flex items-center justify-center text-white shadow-lg shrink-0">
 <Languages size={18} />
 </div>
 <div className="flex flex-col">
 <h3 className="text-sm font-black uppercase tracking-widest ">
 Translation_Engine
 </h3>
 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
 Side-by-side content localization
 </p>
 </div>
 </div>

 {/* Locale Selectors */}
 <div className="flex items-center gap-4 w-full sm:w-auto">
 <div className="flex items-center gap-2 flex-1 sm:flex-none">
 <span className="text-[10px] font-bold text-gray-500 uppercase">Reference:</span>
 <select
 value={referenceLocale}
 onChange={(e) => setReferenceLocale(e.target.value)}
 className={cn(
 'w-32 px-3 py-1.5 text-xs font-bold border rounded-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors appearance-none cursor-pointer',
 dark ? 'border-white/[0.08] hover:border-white/30 text-white' : 'border-gray-200 hover:border-gray-400 text-black'
 )}
 >
 {availableLocales.map(l => (
 <option key={l.code} value={l.code} className="text-black bg-white">{l.flag} {l.name}</option>
 ))}
 </select>
 </div>
 
 <div className="text-gray-400"><Globe size={14} /></div>
 
 <div className="flex items-center gap-2 flex-1 sm:flex-none">
 <span className="text-[10px] font-bold text-emerald-500 uppercase">Target:</span>
 <select
 value={targetLocale}
 onChange={(e) => setTargetLocale(e.target.value)}
 className={cn(
 'w-32 px-3 py-1.5 text-xs font-bold border rounded-none bg-emerald-500/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors appearance-none cursor-pointer',
 dark ? 'border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400' : 'border-emerald-500/30 hover:border-emerald-500/60 text-emerald-600'
 )}
 >
 {availableLocales.map(l => (
 <option key={l.code} value={l.code} className="text-black bg-white">{l.flag} {l.name}</option>
 ))}
 </select>
 </div>

 <button
 onClick={onClose}
 className="ml-4 p-2 text-gray-400 hover:text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="h-1 bg-gray-100 dark:bg-white/5 w-full relative">
 <div 
 className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-500" 
 style={{ width: `${progress}%` }}
 />
 </div>

 {/* Content Area */}
 <div className="flex-1 overflow-y-auto p-6 space-y-12">
 {translatableFields.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 text-gray-500">
 <AlertCircle size={48} className="mb-4 opacity-20" />
 <p className="text-xs font-bold uppercase tracking-widest">No text fields found to translate.</p>
 </div>
 ) : (
 translatableFields.map((field, _idx) => {
 const refValue = translations[field.sectionId]?.[field.fieldName]?.[referenceLocale] || (referenceLocale === 'en' ? field.originalValue : '') || ''
 const targetValue = translations[field.sectionId]?.[field.fieldName]?.[targetLocale] || ''

 return (
 <div key={`${field.sectionId}-${field.fieldName}`} className="space-y-4 relative">
 <div className="flex items-center gap-2">
 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none" />
 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
 {field.sectionName} <span className="text-gray-500 mx-1">&gt;</span> {humanize(field.fieldName)}
 </h4>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Left: Reference (Read-only) */}
 <div className="opacity-70 pointer-events-none relative">
 <div className="absolute top-0 right-0 p-2 text-[8px] font-black uppercase tracking-widest text-gray-400 z-10 bg-black/50 backdrop-blur-md">
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
 <div className="relative border border-emerald-500/20 p-4 -m-4 bg-emerald-500/5">
 <div className="absolute top-0 right-0 p-2 text-[8px] font-black uppercase tracking-widest text-emerald-400 z-10 bg-black/50 backdrop-blur-md flex items-center gap-1.5">
 {targetValue ? <Check size={10} className="text-emerald-400" /> : null}
 Target ({targetLocale})
 </div>
 <FieldRenderer
 blockId={field.sectionId}
 field={{ name: field.fieldName, type: field.fieldType as any, label: '' }}
 value={targetValue}
 onChange={(newVal) => updateTranslation(`${field.sectionId}.${field.fieldName}`, targetLocale, newVal)}
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
