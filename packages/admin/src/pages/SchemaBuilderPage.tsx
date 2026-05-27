import { useState } from 'react'
import { Plus, Database, Code, Copy, Check, Trash2, Box, Layers, Settings, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import api from '../lib/api'

export default function SchemaBuilderPage() {
  const { theme } = useTheme()
  const [collectionName, setCollectionName] = useState('New Collection')
  const [fields, setFields] = useState<any[]>([])
  const [showIntrospect, setShowIntrospect] = useState(false)
  const [dbUri, setDbUri] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isIntrospecting, setIsIntrospecting] = useState(false)

  const handleIntrospect = async () => {
    if (!dbUri) return toast.error('Please provide a connection string')
    setIsIntrospecting(true)
    try {
      const res = await api.post('/system/introspect', { connectionString: dbUri })
      const collections = res.data.data
      if (collections && collections.length > 0) {
        // Just take the first table for demo purposes, or let the user choose
        const col = collections[0]
        setCollectionName(col.name)
        setFields(col.fields)
        toast.success(`Successfully introspected ${col.name} table!`)
        setShowIntrospect(false)
      } else {
        toast.error('No tables found in public schema.')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Introspection failed')
    } finally {
      setIsIntrospecting(false)
    }
  }

  const generateCode = () => {
    const fieldsCode = fields.map(f => {
      let props = `    name: '${f.name}',\n    type: '${f.type}',`
      if (f.label) props += `\n    label: '${f.label}',`
      if (f.required) props += `\n    required: true,`
      return `  {\n${props}\n  },`
    }).join('\n')

    return `import { CollectionConfig } from '@zenithcms/types'

export const ${collectionName.replace(/\s+/g, '')}: CollectionConfig = {
  name: '${collectionName}',
  slug: '${collectionName.toLowerCase().replace(/\s+/g, '-')}',
  fields: [
${fieldsCode}
  ]
}`
  }

  const addField = () => {
    setFields([...fields, { name: 'newField', type: 'text', label: 'New Field', required: false }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], [key]: value }
    setFields(newFields)
  }

  return (
    <div className={cn('p-8 min-h-screen space-y-8', theme === 'dark' ? 'bg-[#0B0F19] text-white' : 'bg-gray-50 text-gray-900')}>
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-none flex items-center justify-center shadow-lg', theme === 'dark' ? 'bg-white text-[#0B0F19]' : 'bg-[#0B0F19] text-white')}>
            <Layers size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">Visual Schema Engine</span>
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Schema Builder</h1>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setShowIntrospect(true)} className={cn('px-6 py-3 rounded-none text-[9px] font-black uppercase tracking-widest transition-all italic border flex items-center gap-2', theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-100')}>
            <Database size={14} /> Legacy Introspect
          </button>
          <button onClick={() => setIsExporting(true)} className="px-6 py-3 rounded-none text-[9px] font-black uppercase tracking-widest transition-all italic bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center gap-2">
            <Code size={14} /> Export Code
          </button>
        </div>
      </header>

      {/* Editor */}
      <div className="grid grid-cols-12 gap-8">
        <div className={cn('col-span-12 xl:col-span-8 border rounded-none p-8', theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100')}>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Collection Name</h2>
            <input 
              type="text" 
              value={collectionName} 
              onChange={e => setCollectionName(e.target.value)}
              className={cn('bg-transparent border-b-2 text-2xl font-black italic tracking-tight outline-none focus:border-emerald-500 transition-colors py-2 px-1', theme === 'dark' ? 'border-white/10' : 'border-gray-200')}
            />
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {fields.map((field, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cn('flex items-center gap-4 p-4 border rounded-none relative group', theme === 'dark' ? 'bg-black border-white/10' : 'bg-gray-50 border-gray-200')}>
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 block mb-1">Field Name (Key)</label>
                      <input type="text" value={field.name} onChange={e => updateField(i, 'name', e.target.value)} className={cn('w-full bg-transparent border-b outline-none text-sm font-bold', theme === 'dark' ? 'border-white/10 focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500')} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 block mb-1">Field Type</label>
                      <select value={field.type} onChange={e => updateField(i, 'type', e.target.value)} className={cn('w-full bg-transparent border-b outline-none text-sm font-bold', theme === 'dark' ? 'border-white/10 focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500')}>
                        <option value="text">Text / String</option>
                        <option value="number">Number</option>
                        <option value="checkbox">Boolean / Checkbox</option>
                        <option value="date">Date</option>
                        <option value="media">Media / Image</option>
                        <option value="richtext">Rich Text</option>
                        <option value="blocks">Dynamic Blocks</option>
                        <option value="relation">Relationship</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 block mb-1">Display Label</label>
                      <input type="text" value={field.label} onChange={e => updateField(i, 'label', e.target.value)} className={cn('w-full bg-transparent border-b outline-none text-sm font-bold', theme === 'dark' ? 'border-white/10 focus:border-emerald-500' : 'border-gray-300 focus:border-emerald-500')} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-[9px] font-black uppercase tracking-widest">
                      <input type="checkbox" checked={field.required} onChange={e => updateField(i, 'required', e.target.checked)} className="accent-emerald-500 w-4 h-4" />
                      Required
                    </label>
                    <button onClick={() => removeField(i)} className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button onClick={addField} className={cn('w-full py-4 border-2 border-dashed flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest italic transition-colors', theme === 'dark' ? 'border-white/10 text-gray-400 hover:text-white hover:border-emerald-500' : 'border-gray-200 text-gray-500 hover:text-[#0B0F19] hover:border-emerald-500')}>
              <Plus size={16} /> Add Field
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          <div className={cn('border rounded-none p-6 shadow-sm', theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100')}>
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Box size={14} className="text-emerald-500" /> Structure Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Fields</span>
                <span className="font-black">{fields.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Required Fields</span>
                <span className="font-black">{fields.filter(f => f.required).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Introspect Modal */}
      <AnimatePresence>
        {showIntrospect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className={cn('w-full max-w-lg border rounded-none shadow-2xl p-8 relative', theme === 'dark' ? 'bg-[#0B0F19] border-white/10' : 'bg-white border-gray-200')}>
              <button onClick={() => setShowIntrospect(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2 flex items-center gap-3">
                <Database className="text-emerald-500" /> DB Introspection
              </h2>
              <p className="text-xs text-gray-400 mb-6 font-bold leading-relaxed">
                Connect to a legacy Postgres database to automatically reverse-engineer your tables into Zenith TypeScript models.
              </p>
              <input type="text" placeholder="postgresql://user:password@localhost:5432/mydb" value={dbUri} onChange={e => setDbUri(e.target.value)} className={cn('w-full p-4 text-sm font-bold border outline-none mb-6', theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500')} />
              <button disabled={isIntrospecting} onClick={handleIntrospect} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest italic flex justify-center items-center gap-2 transition-all">
                {isIntrospecting ? 'Scanning Tables...' : 'Analyze Database'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Export Modal */}
      <AnimatePresence>
        {isExporting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className={cn('w-full max-w-4xl border rounded-none shadow-2xl p-8 relative flex flex-col h-[80vh]', theme === 'dark' ? 'bg-[#0B0F19] border-white/10' : 'bg-white border-gray-200')}>
              <button onClick={() => setIsExporting(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 flex items-center gap-3">
                <Code className="text-emerald-500" /> Export Collection Config
              </h2>
              
              <div className="flex-1 bg-[#1E1E1E] border border-white/10 p-6 overflow-auto text-sm font-mono text-emerald-400 relative group">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(generateCode())
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <pre><code>{generateCode()}</code></pre>
              </div>

              <div className="mt-6 flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Settings size={14} className="text-emerald-500" />
                Paste this file into packages/types/src to deploy to your database.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
