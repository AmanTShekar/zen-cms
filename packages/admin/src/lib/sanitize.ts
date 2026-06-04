/**
 * Sanitizes HTML to prevent XSS attacks.
 * NOTE: This is a basic sanitizer. For production-critical environments,
 * consider using DOMPurify or a similar battle-tested library.
 */
export function sanitizeHtml(html: string): string {
 if (!html || typeof html !== 'string') return ''

 // Remove script tags and their content
 let result = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

 // Remove event handlers (onclick, onerror, etc.)
 result = result.replace(/\s*on\w+\s*=\s*(["'][^"']*["']|['"][^"']*['"])/gi, '')

 // Remove javascript: and data: URLs from href/src attributes (basic protection)
 result = result.replace(/(href|src)\s*=\s*["']\s*javascript:/gi, '$1="#"')
 result = result.replace(/(href|src)\s*=\s*["']\s*data:/gi, '$1="#"')

 return result
}
