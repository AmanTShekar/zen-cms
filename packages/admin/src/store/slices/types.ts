import type { StateCreator } from 'zustand'
import type { FieldDefinition } from '../../pages/editor/constants'

// ── Domain types ───────────────────────────────────────────────────────────────

export interface Section {
  id: string
  blockType: string
  title: string
  content: any
  align?: 'left' | 'center' | 'right'
  blockName?: string
  collapsed?: boolean
}

export interface PageData {
  _status?: 'draft' | 'published'
  _version?: number
  title?: string
  heroDescription?: string
  sections: Section[]
  align?: 'left' | 'center' | 'right'
  meta?: any
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  siteId?: string
}

export interface MediaAsset {
  _id: string
  url: string
  name: string
  alt?: string
  mimetype?: string
  size?: number
}

export interface RelationResult {
  _id: string
  title?: string
  name?: string
  [key: string]: any
}

export interface AvailableCollection {
  slug: string
  label: string
  singularName: string
}

export interface Version {
  id: string
  _id: string
  createdAt: string
  changeLog?: string
  document: PageData
}

// ── Slice Interfaces ────────────────────────────────────────────────────────────

export interface DocumentSlice {
  data: PageData | null
  loading: boolean
  saving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt: string | null
  undoStack: PageData[]
  redoStack: PageData[]
  dirtySections: Set<string>
  
  schemaFields: FieldDefinition[]
  fieldSettings: Record<string, FieldDefinition>
  fieldErrors: Record<string, string>
  history: Version[]
  templates: PageData[]
  topLevelFields: FieldDefinition[]

  setData: (data: PageData | null) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setHasUnsavedChanges: (val: boolean) => void
  setLastSavedAt: (val: string | null) => void
  setSchemaFields: (fields: FieldDefinition[]) => void
  setFieldSettings: (settings: Record<string, FieldDefinition>) => void
  setFieldErrors: (errors: Record<string, string>) => void
  setHistory: (history: Version[]) => void
  setTemplates: (templates: PageData[]) => void
  setTopLevelFields: (fields: FieldDefinition[]) => void

  updateData: (updater: (prev: PageData) => PageData | void) => void
  setField: (sectionId: string, fieldKey: string, value: any) => void
  undo: () => void
  redo: () => void
  load: (slug: string, id: string, isGlobal: boolean) => Promise<PageData>
  save: (slug: string, id: string, isGlobal: boolean, getPayload: (data: PageData) => any) => Promise<void>
}

export interface UiSlice {
  activeSection: string | null
  selectedField: { blockId: string; fieldKey: string } | null
  selectedFieldId: string | null

  setActiveSection: (section: string | null) => void
  setSelectedField: (field: { blockId: string; fieldKey: string } | null) => void
  setSelectedFieldId: (id: string | null) => void
}

export interface MediaSlice {
  mediaAssets: MediaAsset[]
  mediaSearch: string
  mediaTypeFilter: string
  mediaLoading: boolean

  setMediaAssets: (assets: MediaAsset[]) => void
  setMediaSearch: (search: string) => void
  setMediaTypeFilter: (filter: string) => void
  setMediaLoading: (loading: boolean) => void
}

export interface RelationsSlice {
  relationsField: { sectionId: string; fieldKey: string } | null
  relationsSearch: string
  relationResults: RelationResult[]
  selectedRelations: Set<string>
  availableCollections: AvailableCollection[]

  setRelationsField: (field: { sectionId: string; fieldKey: string } | null) => void
  setRelationsSearch: (search: string) => void
  setRelationResults: (results: RelationResult[]) => void
  setSelectedRelations: (relations: Set<string>) => void
  setAvailableCollections: (collections: AvailableCollection[]) => void
}

export interface SharedSlice {
  reset: () => void
}

export type EditorState = DocumentSlice & UiSlice & MediaSlice & RelationsSlice & SharedSlice

export type EditorSliceCreator<T> = StateCreator<EditorState, [], [], T>
