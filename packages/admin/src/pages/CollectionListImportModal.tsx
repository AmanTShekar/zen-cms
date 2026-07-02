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
 <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-z-panel backdrop-blur-md">
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 15 }}
 className={cn(
 'border rounded-none-none w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden',
 'bg-z-panel border-z-border text-z-primary shadow-sm'
 )}
 >
 {/* Header */}
 <div className="px-8 py-6 border-b flex justify-between items-center" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }}>
 <div className="flex items-center gap-4">
 <div className="w-9 h-9 bg-z-accent  rounded-none-none flex items-center justify-center text-z-primary shadow-lg">
 <Upload size={16} />
 </div>
 <div className="flex flex-col">
 <h3 className="text-xs font-semibold">Import Data</h3>
 <p className="text-sm font-bold text-z-muted mt-1">{slug} collection</p>
 </div>
 </div>
 <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-[var(--z-bg-input)] hover:bg-[var(--z-bg-hover)] dark:bg-z-hover dark:hover:bg-[var(--z-bg-hover)] rounded-none-none transition-colors">
 <X size={14} className="text-z-muted" />
 </button>
 </div>

 {/* Body */}
 <div className="p-8 space-y-6">
 {/* Format selector */}
 <div className="flex items-center gap-3">
 <span className="text-sm font-semibold text-z-secondary">Format:</span>
 <button
 onClick={() => { setImportFormat('csv'); setImportResult(null); }}
 className={cn(
 'px-4 py-2 rounded-none-none font-semibold text-sm   transition-all flex items-center gap-2 border',
 importFormat === 'csv' ? 'bg-z-accent  border-z-border text-z-primary' :
 theme === 'dark' ? 'bg-z-hover border-z-border text-z-muted hover:text-z-primary' : 'bg-z-panel border-z-border text-z-secondary hover:text-z-primary'
 )}
 >
 <FileSpreadsheet size={12} /> CSV
 </button>
 <button
 onClick={() => { setImportFormat('json'); setImportResult(null); }}
 className={cn(
 'px-4 py-2 rounded-none-none font-semibold text-sm   transition-all flex items-center gap-2 border',
 importFormat === 'json' ? 'bg-z-accent  border-z-border text-z-primary' :
 theme === 'dark' ? 'bg-z-hover border-z-border text-z-muted hover:text-z-primary' : 'bg-z-panel border-z-border text-z-secondary hover:text-z-primary'
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
 'border-2 border-dashed rounded-none-none p-8 text-center transition-all cursor-pointer',
 dragOver ? 'border-z-border bg-z-hover' :
 theme === 'dark' ? 'border-z-border hover:border-z-border' : 'border-z-border hover:border-z-border-strong'
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
 {importFormat === 'csv' ? <FileSpreadsheet size={32} className="text-z-secondary " /> : <FileJson size={32} className="text-z-secondary " />}
 <span className="text-sm font-semibold text-z-secondary">{importFile.name}</span>
 <span className="text-sm font-bold text-z-secondary">{(importFile.size / 1024).toFixed(1)} KB — Click to change</span>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-3">
 <Upload size={32} className="text-z-secondary/40" />
 <span className="text-sm font-semibold text-z-secondary">Drop {importFormat.toUpperCase()} file here or click to browse</span>
 <span className="text-sm font-bold text-z-muted">Or paste data in the text area below</span>
 </div>
 )}
 </div>

 {/* Text area */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary">Or paste {importFormat.toUpperCase()} data:</label>
 <textarea
 value={importText}
 onChange={(e) => { setImportText(e.target.value); setImportFile(null); setImportResult(null); }}
 rows={6}
 className={cn(
 'w-full border rounded-none-none px-4 py-3 text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all resize-y',
 theme === 'dark' ? 'bg-z-hover border-z-border text-z-primary focus:border-z-border/50' : 'bg-z-input border-z-border focus:border-z-border'
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
 'border rounded-none-none p-5 space-y-3',
 importResult.errors.length === 0
 ? theme === 'dark' ? 'bg-z-hover border-z-border/20' : 'bg-z-input border-z-border'
 : theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
 )}>
 <div className="flex items-center gap-3">
 {importResult.errors.length === 0 ? <CheckCircle2 size={16} className="text-z-secondary " /> : <AlertCircle size={16} className="text-amber-500" />}
 <span className="text-sm font-semibold">
 {importResult.imported} of {importResult.total} records imported
 {importResult.errors.length > 0 && ` (${importResult.errors.length} errors)`}
 </span>
 </div>
 {importResult.errors.length > 0 && (
 <div className="max-h-32 overflow-y-auto space-y-1">
 {importResult.errors.map((err, i) => (
 <div key={i} className="text-sm font-mono text-red-400">Row {err.row}: {err.error}</div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="px-8 py-6 border-t flex justify-end gap-3" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f9fafb' }}>
 <button onClick={onClose} className={cn('px-6 py-3 font-semibold text-sm   transition-all ', theme === 'dark' ? 'bg-z-hover text-z-muted hover:text-z-primary' : 'bg-z-panel border border-z-border shadow-sm text-z-muted hover:text-z-primary')}>Cancel</button>
 <button
 onClick={handleImport}
 disabled={importing || (!importFile && !importText.trim())}
 className={cn('px-8 py-3 rounded-none-none font-semibold text-sm   shadow-xl transition-all flex items-center gap-2 disabled:opacity-40', theme === 'dark' ? 'bg-z-accent  hover:bg-z-base text-z-primary shadow-[var(--z-border)]' : 'bg-z-accent  hover:bg-z-base text-z-primary')}
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
