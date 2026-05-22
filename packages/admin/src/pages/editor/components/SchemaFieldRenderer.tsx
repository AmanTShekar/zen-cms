import React from 'react'
import { useTheme } from '../../../context/ThemeContext'
import { FieldRenderer } from '../FieldRenderer'
import type { FieldDefinition } from '../constants'

interface SchemaFieldRendererProps {
  field: FieldDefinition & { id: string; blockId: string; blockType: string }
  sectionId: string
  value: any
  onChange: (value: any) => void
  showFieldIndicators?: boolean
  selectedField?: any
  onFieldSelect?: (blockId: string, fieldKey: string) => void
  i18nEnabled?: boolean
  currentLocale?: string
  getTranslatedValue?: (sectionId: string, fieldKey: string, defaultValue: string) => string
  setTranslatedValue?: (sectionId: string, fieldKey: string, value: string) => void
  onOpenRelations?: (sectionId: string, fieldKey: string, extra?: { relationTo?: string | string[]; hasMany?: boolean }) => void
  getFieldConfig?: (sectionId: string, fieldKey: string) => any
}

export const SchemaFieldRenderer: React.FC<SchemaFieldRendererProps> = ({
  field,
  sectionId,
  value,
  onChange,
  i18nEnabled,
  getTranslatedValue,
  setTranslatedValue,
  onOpenRelations,
  getFieldConfig,
}) => {
  const { theme } = useTheme()

  const displayValue = i18nEnabled && getTranslatedValue
    ? getTranslatedValue(sectionId, field.name, value)
    : value

  const handleChange = (newVal: any) => {
    onChange(newVal)
    if (i18nEnabled && setTranslatedValue) {
      setTranslatedValue(sectionId, field.name, newVal)
    }
  }

  // Wrap onOpenRelations to inject schema-aware field config
  const handleOpenRelations = (blockId: string, fieldKey: string) => {
    if (!onOpenRelations) return
    const fieldConfig = getFieldConfig ? getFieldConfig(blockId, fieldKey) : undefined
    onOpenRelations(blockId, fieldKey, fieldConfig)
  }

  return (
    <FieldRenderer
      blockId={sectionId}
      field={field}
      value={displayValue}
      onChange={handleChange}
      theme={theme}
      onOpenRelations={handleOpenRelations}
    />
  )
}

export default SchemaFieldRenderer
