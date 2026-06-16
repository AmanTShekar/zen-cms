import React, { useState } from 'react'
import { Upload, X, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface CollectionListImportModalProps {
 slug: string
 theme: 'light' | 'dark'
 onClose: () => void
 onImported: () => void
}

const CollectionListImportModal: React.FC<CollectionListImportModalProps> = ({ slug, theme, onClose, onImported }) => {
 const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv')
 const [importText, setImportText] = useState('')
 const [importFile, setImportFile] = useState<File | null>(null)
 const [importing, setImporting] = useState(false)
 const [importResult, setImportResult] = useState<{ imported: number; total: number; errors: { row: number; error: string }[] } | null>(null)
 const [dragOver, setDragOver] = useState(false)

 const handleImport = async () => {
 setImporting(true)
 setImportResult(null)
 try {
 let data: string
 if (importFile) {
 data = await importFile.text()
 } else if (importText.trim()) {
 data = importText.trim()
 } else {
 toast.error('Upload a file or paste data')
 setImporting(false)
 return
 }
 const res = await api.post(`/import-export/${slug}?format=${importFormat}`, { data })
 const result = res.data.data
 setImportResult(result)
 toast.success(result.message || `Imported ${result.imported} records`)
 if (result.imported > 0) onImported()
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Import failed')
 } finally {
 setImporting(false)
 }
 }

 return (
 <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 15 }}
 className={cn(
 'border rounded-none w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden',
 theme === 'dark' ? 'bg-black border-white/[0.08] text-white' : 'bg-white border-gray-200 shadow-sm text-gray-900'
 )}
 >
 {/* Header */}
 <div className="px-8 py-6 border-b flex justify-between items-center" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}>
 <div className="flex items-center gap-4">
 <div className="w-9 h-9 bg-gray-600 dark:bg-gray-600 rounded-none flex items-center justify-center text-white shadow-lg">
 <Upload size={16} />
 </div>
 <div className="flex flex-col">
 <h3 className="text-xs font-black uppercase tracking-widest ">Import Data</h3>
 <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{slug} collection</p>
 </div>
 </div>
 <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-none transition-colors">
 <X size={14} className="text-gray-400" />
 </button>
 </div>

 {/* Body */}
 <div className="p-8 space-y-6">
 {/* Format selector */}
 <div className="flex items-center gap-3">
 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Format:</span>
 <button
 onClick={() => { setImportFormat('csv'); setImportResult(null); }}
 className={cn(
 'px-4 py-2 rounded-none font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border',
 importFormat === 'csv' ? 'bg-gray-600 dark:bg-gray-600 border-gray-500 text-white' :
 theme === 'dark' ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
 )}
 >
 <FileSpreadsheet size={12} /> CSV
 </button>
 <button
 onClick={() => { setImportFormat('json'); setImportResult(null); }}
 className={cn(
 'px-4 py-2 rounded-none font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border',
 importFormat === 'json' ? 'bg-gray-600 dark:bg-gray-600 border-gray-500 text-white' :
 theme === 'dark' ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
 )}
 >
 <FileJson size={12} /> JSON
 </button>
 </div>

 {/* Drop zone */}
 <div
 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
 onDragLeave={() => setDragOver(false)}
 onDrop={(e) => {
 e.preventDefault()
 setDragOver(false)
 const file = e.dataTransfer.files[0]
 if (file) { setImportFile(file); setImportText(''); setImportResult(null) }
 }}
 className={cn(
 'border-2 border-dashed rounded-none p-8 text-center transition-all cursor-pointer',
 dragOver ? 'border-gray-500 bg-gray-500/5' :
 theme === 'dark' ? 'border-white/[0.08] hover:border-white/[0.08]' : 'border-gray-200 hover:border-gray-300'
 )}
 onClick={() => {
 const input = document.createElement('input')
 input.type = 'file'
 input.accept = importFormat === 'csv' ? '.csv' : '.json'
 input.onchange = (e: any) => {
 const file = e.target.files?.[0]
 if (file) { setImportFile(file); setImportText(''); setImportResult(null) }
 }
 input.click()
 }}
 >
 {importFile ? (
 <div className="flex flex-col items-center gap-3">
 {importFormat === 'csv' ? <FileSpreadsheet size={32} className="text-gray-600 dark:text-gray-500" /> : <FileJson size={32} className="text-gray-600 dark:text-gray-500" />}
 <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">{importFile.name}</span>
 <span className="text-[8px] font-bold text-gray-500">{(importFile.size / 1024).toFixed(1)} KB — Click to change</span>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-3">
 <Upload size={32} className="text-gray-500/40" />
 <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Drop {importFormat.toUpperCase()} file here or click to browse</span>
 <span className="text-[8px] font-bold text-gray-400">Or paste data in the text area below</span>
 </div>
 )}
 </div>

 {/* Text area */}
 <div className="space-y-2">
 <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Or paste {importFormat.toUpperCase()} data:</label>
 <textarea
 value={importText}
 onChange={(e) => { setImportText(e.target.value); setImportFile(null); setImportResult(null); }}
 rows={6}
 className={cn(
 'w-full border rounded-none px-4 py-3 text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all resize-y',
 theme === 'dark' ? 'bg-white/[0.03] border-white/[0.08] text-white focus:border-gray-500/50' : 'bg-gray-50 border-gray-200 focus:border-gray-400'
 )}
 placeholder={importFormat === 'csv'
 ? 'name,title,price\nProduct A,Title A,29.99\nProduct B,Title B,49.99'
 : '[\n {"name": "Product A", "title": "Title A", "price": 29.99},\n {"name": "Product B", "title": "Title B", "price": 49.99}\n]'
 }
 />
 </div>

 {/* Result */}
 {importResult && (
 <div className={cn(
 'border rounded-none p-5 space-y-3',
 importResult.errors.length === 0
 ? theme === 'dark' ? 'bg-gray-500/5 border-gray-500/20' : 'bg-gray-50 border-gray-200'
 : theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
 )}>
 <div className="flex items-center gap-3">
 {importResult.errors.length === 0 ? <CheckCircle2 size={16} className="text-gray-600 dark:text-gray-500" /> : <AlertCircle size={16} className="text-amber-500" />}
 <span className="text-[10px] font-black uppercase tracking-widest">
 {importResult.imported} of {importResult.total} records imported
 {importResult.errors.length > 0 && ` (${importResult.errors.length} errors)`}
 </span>
 </div>
 {importResult.errors.length > 0 && (
 <div className="max-h-32 overflow-y-auto space-y-1">
 {importResult.errors.map((err, i) => (
 <div key={i} className="text-[9px] font-mono text-red-400">Row {err.row}: {err.error}</div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="px-8 py-6 border-t flex justify-end gap-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f9fafb' }}>
 <button onClick={onClose} className={cn('px-6 py-3 font-black text-[9px] uppercase tracking-widest transition-all ', theme === 'dark' ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-gray-900')}>Cancel</button>
 <button
 onClick={handleImport}
 disabled={importing || (!importFile && !importText.trim())}
 className={cn('px-8 py-3 rounded-none font-black text-[9px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 disabled:opacity-40', theme === 'dark' ? 'bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white shadow-gray-600/20' : 'bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white')}
 >
 {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
 {importing ? 'Importing...' : 'Import'}
 </button>
 </div>
 </motion.div>
 </div>
 )
}

export default CollectionListImportModal
