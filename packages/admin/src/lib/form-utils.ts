/** Shared utilities for FormBuilder and field renderers */

/**
 * Check if a value is a plain object (not array, not null).
 */
export function isObject(item: any): boolean {
 return !!item && typeof item === 'object' && !Array.isArray(item)
}

/**
 * Recursive deep merge — source values take precedence.
 */
export function deepMerge(target: any, source: any): any {
 const output = isObject(target) ? { ...(target as any) } : {}
 if (isObject(target) && isObject(source)) {
 Object.entries(source as any).forEach(([key, val]) => {
 if (isObject(val)) {
 if (!(key in (target as any))) {
 Object.assign(output as any, { [key]: val })
 } else {
 ;(output as any)[key] = deepMerge(
 (target as any)[key],
 val
 )
 }
 } else {
 Object.assign(output as any, { [key]: val })
 }
 })
 }
 return output
}

/**
 * Navigate nested errors object by dot-notation path.
 */
export function getFieldError(
 errors: any | undefined,
 name: string
): any {
 if (!name.includes('.')) return errors?.[name]
 const parts = name.split('.')
 let current: any = errors
 for (const part of parts) {
 if (!current || typeof current !== 'object') return undefined
 current = (current as any)[part]
 }
 return current
}

/**
 * Evaluate a field's conditional-display rule.
 */
export function evaluateCondition(
 condition: any,
 formValues: any
): boolean {
 if (!condition) return true

 if (typeof condition === 'function') {
 try {
 return (condition as (v: any) => boolean)(formValues)
 } catch {
 return true
 }
 }

 if (typeof condition === 'object' && condition !== null) {
 const cond = condition as any
 const targetField = cond.field as string | undefined
 if (!targetField) return true

 const targetValue = formValues[targetField]

 if (cond.equals !== undefined) return targetValue === cond.equals
 if (cond.notEquals !== undefined) return targetValue !== cond.notEquals
 if (cond.contains !== undefined) return Array.isArray(targetValue) && targetValue.includes(cond.contains)
 }

 return true
}

/**
 * Determine the full field name including locale suffix if localized.
 */
export function getFieldName(field: { name: string; localized?: boolean }, locale: string): string {
 return field.localized ? `${field.name}.${locale}` : field.name
}

/**
 * Returns CSS class list for field casing.
 */
export function textCasingStyle(
 casing?: '' | 'lowercase' | 'capitalize'
): React.CSSProperties | undefined {
 if (!casing) return undefined
 return { textTransform: casing }
}
