import React from 'react'
import type { FieldDefinition } from './constants'

/**
 * Props passed to every registered field component.
 */
export interface FieldRendererComponentProps {
 blockId: string
 field: FieldDefinition
 value: any
 onChange: (value: any) => void
 onFieldSelect?: (blockId: string, fieldKey: string) => void
 theme: 'light' | 'dark'
 error?: string
 isSelected?: boolean
}

/**
 * Registry mapping field type strings to their rendering component.
 *
 * To add a custom field type without editing `FieldRenderer.tsx`:
 *
 * ```ts
 * import { registerField } from './fieldRegistry'
 * import MyCustomField from './MyCustomField'
 *
 * registerField('myCustomType', MyCustomField)
 * ```
 */
const registry = new Map<string, React.ComponentType<FieldRendererComponentProps>>()

export function registerField(type: string, component: React.ComponentType<FieldRendererComponentProps>): void {
 if (registry.has(type)) {
 if (import.meta.env.DEV) {
 console.warn(`[Zenith] Field type "${type}" is being overridden in the registry.`)
 }
 }
 registry.set(type, component)
}

export function getFieldComponent(type: string): React.ComponentType<FieldRendererComponentProps> | undefined {
 return registry.get(type)
}

export function hasFieldComponent(type: string): boolean {
 return registry.has(type)
}

/**
 * Register a batch of field components from a map object.
 */
export function registerFieldMap(
 map: Record<string, React.ComponentType<FieldRendererComponentProps>>
): void {
 for (const [type, component] of Object.entries(map)) {
 registerField(type, component)
 }
}

export { registry as fieldRegistry }
