import React from 'react'
import type { FieldConfig } from '@zenithcms/types'

interface Props {
 field: FieldConfig
 value: unknown
 onChange: (val: unknown) => void
 disabled?: boolean
}

const BooleanField: React.FC<Props> = ({ field: _field, value, onChange, disabled }) => {
 return (
 <div className="flex items-center h-9">
 <input
 type="checkbox"
 checked={!!value}
 onChange={(e) => onChange(e.target.checked)}
 disabled={disabled}
 className="w-4 h-4 rounded-none border border-gray-400 bg-gray-900/65 backdrop-blur-md text-emerald-600 dark:text-emerald-500 focus:ring-emerald-500/50 focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
 />
 </div>
 )
}

export default BooleanField
