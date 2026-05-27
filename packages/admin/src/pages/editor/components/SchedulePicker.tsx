import React, { useState, useEffect, useRef } from 'react'
import { Clock, X } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { useWorkflowStore } from '../../../store/workflowStore'
import { useEditorStore } from '../../../store/editorStore'
import { cn } from '../../../lib/utils'
import toast from 'react-hot-toast'

interface SchedulePickerProps {
  open: boolean
  onClose: () => void
}

export const SchedulePicker: React.FC<SchedulePickerProps> = ({ open, onClose }) => {
  const { theme } = useTheme()
  const { scheduledAt, setScheduledAt } = useWorkflowStore()
  const [scheduleInput, setScheduleInput] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      if (scheduledAt) {
        setScheduleInput(new Date(scheduledAt).toISOString().slice(0, 16))
      } else {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        setScheduleInput(tomorrow.toISOString().slice(0, 16))
      }
    }
  }, [open, scheduledAt])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  const handleApply = () => {
    if (!scheduleInput) return
    const iso = new Date(scheduleInput).toISOString()
    setScheduledAt(iso)
    useWorkflowStore.getState().setWorkflowStatus('scheduled')
    useEditorStore.getState().setHasUnsavedChanges(true)
    toast.success(`Scheduled for ${new Date(iso).toLocaleString()}`, { icon: '⏰' })
    onClose()
  }

  const handleClear = () => {
    setScheduledAt('')
    onClose()
  }

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      className={cn(
        'absolute top-full mt-2 right-0 w-64 border shadow-2xl z-50 p-3',
        theme === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-gray-200'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs font-black uppercase italic tracking-widest', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
          Schedule Publish
        </span>
        <div className="flex items-center gap-1">
          {scheduledAt && (
            <button
              onClick={handleClear}
              className="text-xs font-black uppercase italic text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close scheduler"
            className={cn('p-0.5', theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')}
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
      <input
        type="datetime-local"
        value={scheduleInput}
        onChange={(e) => setScheduleInput(e.target.value)}
        className={cn(
          'w-full px-2 py-1.5 rounded-none border text-xs font-mono',
          theme === 'dark'
            ? 'bg-white/5 border-white/10 text-white'
            : 'bg-gray-50 border-gray-200 text-black'
        )}
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={onClose}
          className={cn(
            'flex-1 py-1.5 border text-xs font-black uppercase italic text-center transition-all',
            theme === 'dark' ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!scheduleInput}
          className={cn(
            'flex-1 py-1.5 text-xs font-black uppercase italic text-center transition-all disabled:opacity-40',
            theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          )}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export default SchedulePicker
