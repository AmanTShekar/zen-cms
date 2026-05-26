import React, { useState } from 'react'
import type { FieldConfig, BaseFieldConfig } from '@zenithcms/types'
import { cn } from '../../lib/utils'

interface TabFieldProps {
  field: FieldConfig
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
  renderField: (f: FieldConfig, val: unknown, change: (val: unknown) => void, disabled?: boolean) => React.ReactNode
}

interface TabConfig {
  name: string
  label?: string
  fields?: FieldConfig[]
}

interface TabsFieldConfig extends BaseFieldConfig {
  type: 'tabs'
  tabs: TabConfig[]
}

const TabField: React.FC<TabFieldProps> = ({ field, value, onChange, disabled, renderField }) => {
  const tf = field as TabsFieldConfig
  const tabs = tf.tabs || []
  const [activeTab, setActiveTab] = useState(0)
  const tabValue = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>

  if (tabs.length === 0) return null

  const currentTab = tabs[activeTab]
  const currentFields = currentTab?.fields || []

  return (
    <div className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
      {/* Tab Headers */}
      <div className="flex border-b border-white/10">
        {tabs.map((tab, idx) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={cn(
              'px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors',
              activeTab === idx
                ? 'text-purple-400 border-b-2 border-purple-500 bg-white/[0.03]'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {tab.label || tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentFields.length > 0 && (
        <div className="p-4 space-y-3">
          {currentFields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {f.label || f.name}
                {f.required && <span className="text-danger ml-1">*</span>}
              </label>
              {renderField(
                f,
                tabValue[f.name],
                (val: unknown) => onChange({ ...tabValue, [f.name]: val }),
                disabled
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TabField
