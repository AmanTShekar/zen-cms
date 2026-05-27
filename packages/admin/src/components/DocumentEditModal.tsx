import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import FormBuilder from './FormBuilder'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

interface DocumentEditModalProps {
  isOpen: boolean
  onClose: () => void
  collectionSlug: string
  documentId: string
  onSaved?: (doc: any) => void
}

const DocumentEditModal: React.FC<DocumentEditModalProps> = ({ 
  isOpen, 
  onClose, 
  collectionSlug, 
  documentId, 
  onSaved 
}) => {
  const { theme } = useTheme()
  const [data, setData] = useState<any>(null)
  const [schema, setSchema] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !documentId) return

    const fetchDoc = async () => {
      setLoading(true)
      try {
        const healthRes = await api.get('/health')
        const collections = healthRes.data.data?.collections || []
        const colSchema = collections.find((c: any) => c.slug === collectionSlug)
        setSchema(colSchema)

        const docRes = await api.get(`/${collectionSlug}/${documentId}`)
        setData(docRes.data.data)
      } catch (err) {
        toast.error('Failed to load document')
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [isOpen, documentId, collectionSlug])

  const handleSave = async (formData: any) => {
    setSaving(true)
    try {
      const res = await api.patch(`/${collectionSlug}/${documentId}`, formData)
      toast.success('Document updated')
      if (onSaved) onSaved(res.data.data)
      onClose()
    } catch (err) {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          className={cn(
            'w-full max-w-4xl border rounded-none overflow-hidden shadow-2xl flex flex-col h-[85vh]',
            theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
          )}
        >
          <div
            className={cn(
              'p-6 border-b flex items-center justify-between shrink-0',
              theme === 'dark' ? 'border-white/5' : 'border-gray-100',
            )}
          >
            <h3
              className={cn(
                'text-lg font-black uppercase italic leading-none',
                theme === 'dark' ? 'text-white' : 'text-black',
              )}
            >
              Edit Record
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className={cn(
                'p-1 transition-colors',
                theme === 'dark' ? 'text-gray-400 hover:text-emerald-500' : 'text-gray-500 hover:text-emerald-600'
              )}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="h-full flex items-center justify-center flex-col gap-4">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">
                  Loading Document...
                </span>
              </div>
            ) : schema && data ? (
              <FormBuilder
                fields={schema.fields}
                initialData={data}
                onSubmit={handleSave}
                isSubmitting={saving}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 font-black uppercase italic tracking-widest text-xs">
                Failed to load schema or data.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DocumentEditModal
