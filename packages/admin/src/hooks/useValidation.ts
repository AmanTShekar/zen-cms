import { useCallback } from 'react'

export interface ValidationError {
  sectionId: string
  fieldName: string
  message: string
}

export interface FieldDef {
  name: string
  label?: string
  type: string
  required?: boolean
  maxLength?: number
  minLength?: number
  min?: number
  max?: number
}

export interface BlockDef {
  slug: string
  label?: string
  fields?: FieldDef[]
  defaultContent?: Record<string, any>
}

export interface SectionData {
  id?: string
  blockType?: string
  content?: Record<string, any>
  [key: string]: any
}

export interface PageData {
  sections?: SectionData[]
  [key: string]: any
}

/** Validates section content against block field definitions before saving. */
export function validateBeforeSave(
  pageData: PageData | null,
  blockLibrary: BlockDef[]
): ValidationError[] {
  if (!pageData?.sections?.length) return []

  const errors: ValidationError[] = []

  for (const section of pageData.sections) {
    const blockDef = blockLibrary.find((b) => b.slug === section.blockType)
    if (!blockDef?.fields) continue

    for (const field of blockDef.fields) {
      const value = section.content?.[field.name]

      if (field.required && (value === undefined || value === null)) {
        errors.push({
          sectionId: section.id ?? section.blockType ?? 'unknown',
          fieldName: field.name,
          message: `${field.label ?? field.name} is required`,
        })
        continue
      }

      if (typeof value === 'string') {
        if (field.maxLength && value.length > field.maxLength) {
          errors.push({
            sectionId: section.id ?? section.blockType ?? 'unknown',
            fieldName: field.name,
            message: `${field.label ?? field.name} exceeds ${field.maxLength} characters (current: ${value.length})`,
          })
        }
        if (field.minLength && value.length < field.minLength) {
          errors.push({
            sectionId: section.id ?? section.blockType ?? 'unknown',
            fieldName: field.name,
            message: `${field.label ?? field.name} must be at least ${field.minLength} characters`,
          })
        }
      }

      if (typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          errors.push({
            sectionId: section.id ?? section.blockType ?? 'unknown',
            fieldName: field.name,
            message: `${field.label ?? field.name} must be at least ${field.min}`,
          })
        }
        if (field.max !== undefined && value > field.max) {
          errors.push({
            sectionId: section.id ?? section.blockType ?? 'unknown',
            fieldName: field.name,
            message: `${field.label ?? field.name} must be at most ${field.max}`,
          })
        }
      }
    }
  }

  return errors
}

/** React hook wrapping the validator with useCallback + toast feedback. */
export function useValidation(blockLibrary: BlockDef[]) {
  return useCallback(
    (pageData: PageData | null): ValidationError[] => validateBeforeSave(pageData, blockLibrary),
    [blockLibrary]
  )
}
