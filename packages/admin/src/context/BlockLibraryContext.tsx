import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  Star, Grid, BarChart4, MessageSquare, Mail, CreditCard, Zap,
  FileText, Layout, Users, AlertCircle, Code, Table, HelpCircle, Box,
  type LucideIcon,
} from 'lucide-react'
import { useBlockLibrary } from '../hooks/useBlockLibrary'
import { useCustomComponents } from '../hooks/useCustomComponents'
import {
  type BlockDefinition as EditorBlockDefinition,
  type FieldDefinition,
} from '../pages/editor/constants'

// Map API icon strings to lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Star, Grid, BarChart4, MessageSquare, Mail, CreditCard, Zap,
  FileText, Layout, Users, AlertCircle, Code, Table, HelpCircle,
}

const EditorBlockLibraryContext = createContext<EditorBlockDefinition[]>([])

function mapApiFields(fields: any[]): FieldDefinition[] {
  if (!fields) return []
  return fields.map((f: any) => ({
    name: f.name,
    label: f.label,
    type: f.type,
    fields: f.fields ? mapApiFields(f.fields) : undefined,
    options: f.options,
    placeholder: f.placeholder,
    hasMany: f.hasMany,
    hasMore: f.hasMore,
    language: f.language,
    layout: f.layout,
    dateFormat: f.dateFormat,
    components: f.components,
    description: f.description,
    admin: f.admin,
  } satisfies FieldDefinition))
}

function normalizeDefaultContent(apiBlock: any): Record<string, any> {
  // Build minimal default content from field definitions
  const content: Record<string, any> = {}
  for (const f of apiBlock.fields || []) {
    if (f.type === 'text') content[f.name] = ''
    else if (f.type === 'richtext') content[f.name] = ''
    else if (f.type === 'media') content[f.name] = null
    else if (f.type === 'array') content[f.name] = []
    else if (f.type === 'number') content[f.name] = 0
    else if (f.type === 'boolean') content[f.name] = false
    else if (f.type === 'code') content[f.name] = ''
    else content[f.name] = null
  }
  return content
}

export function BlockLibraryProvider({ children }: { children: ReactNode }) {
  const apiBlocks = useBlockLibrary()
  const customComponents = useCustomComponents()

  const enriched = useMemo(() => {
    const merged = apiBlocks.map((apiBlock) => {
      return {
        type: apiBlock.slug,
        icon: ICON_MAP[apiBlock.admin?.icon || ''] || Box,
        title: apiBlock.labels?.singular || apiBlock.slug,
        description: apiBlock.admin?.description || '',
        category: apiBlock.admin?.category || 'General',
        fields: mapApiFields(apiBlock.fields),
        defaultContent: normalizeDefaultContent(apiBlock),
      } satisfies EditorBlockDefinition
    })

    const customMapped = customComponents.map((comp) => {
      return {
        type: comp.slug,
        icon: ICON_MAP[comp.icon] || Box,
        title: comp.displayName,
        description: comp.description,
        category: comp.category,
        fields: comp.fields,
        defaultContent: normalizeDefaultContent({ fields: comp.fields }),
      } satisfies EditorBlockDefinition
    })

    return [...merged, ...customMapped]
  }, [apiBlocks, customComponents])

  return (
    <EditorBlockLibraryContext.Provider value={enriched}>
      {children}
    </EditorBlockLibraryContext.Provider>
  )
}

export function useEditorBlocks(): EditorBlockDefinition[] {
  return useContext(EditorBlockLibraryContext)
}
