import crypto from 'crypto'
import { logger } from './logger'

export interface ImageTransformOptions {
  width?: number
  height?: number
  format?: string
  quality?: number
}

export const ImageCdnService = {
  getProvider(): string | null {
    return (process.env.IMAGE_CDN_PROVIDER || '').toLowerCase() || null
  },

  /**
   * Generates a transformed URL targeting the configured CDN.
   * If no CDN is configured, returns null (caller should fallback to local processing).
   */
  generateTransformUrl(originalUrl: string, options: ImageTransformOptions = {}): string | null {
    const provider = this.getProvider()
    if (!provider) return null

    try {
      if (provider === 'cloudflare') {
        return this.generateCloudflareUrl(originalUrl, options)
      }
      
      if (provider === 'imgproxy') {
        return this.generateImgproxyUrl(originalUrl, options)
      }
    } catch (err: unknown) {
      logger.error({ err: err.message, provider }, 'Failed to generate CDN URL')
    }

    return null
  },

  generateCloudflareUrl(originalUrl: string, options: ImageTransformOptions): string {
    const cdnUrl = process.env.CLOUDFLARE_IMAGES_URL // e.g. https://imagedelivery.net/<ACCOUNT_HASH>
    if (!cdnUrl) throw new Error('CLOUDFLARE_IMAGES_URL is required for cloudflare provider')

    // Cloudflare Images expects a variant name, but for flexible resizing,
    // if using Cloudflare Image Resizing (which proxies original URLs):
    // Format: https://<ZONE>/cdn-cgi/image/width=80,height=80,format=webp/originalUrl
    
    // For this generic implementation, we assume Cloudflare Image Resizing:
    const baseUrl = process.env.IMAGE_CDN_BASE_URL
    if (!baseUrl) throw new Error('IMAGE_CDN_BASE_URL is required for Cloudflare Image Resizing')

    const params = []
    if (options.width) params.push(`width=${options.width}`)
    if (options.height) params.push(`height=${options.height}`)
    if (options.format) params.push(`format=${options.format}`)
    if (options.quality) params.push(`quality=${options.quality}`)

    const modifiers = params.length > 0 ? params.join(',') : 'public'
    
    // Assumes baseUrl is something like https://example.com/cdn-cgi/image/
    const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    return `${prefix}${modifiers}/${encodeURIComponent(originalUrl)}`
  },

  generateImgproxyUrl(originalUrl: string, options: ImageTransformOptions): string {
    const imgproxyUrl = process.env.IMGPROXY_URL
    if (!imgproxyUrl) throw new Error('IMGPROXY_URL is required for imgproxy provider')

    const keyHex = process.env.IMGPROXY_KEY
    const saltHex = process.env.IMGPROXY_SALT

    // Convert resize options
    const width = options.width || 0
    const height = options.height || 0
    let resize = ''
    if (width || height) {
      resize = `/rs:fill:${width}:${height}`
    }

    const format = options.format ? `.${options.format}` : ''
    
    // Encode original URL (URL-safe Base64)
    const encodedUrl = Buffer.from(originalUrl).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      
    const path = `${resize}/plain/${encodedUrl}${format}`

    // If signing keys are provided, sign the URL
    if (keyHex && saltHex) {
      const key = Buffer.from(keyHex, 'hex')
      const salt = Buffer.from(saltHex, 'hex')
      const hmac = crypto.createHmac('sha256', key)
      hmac.update(salt)
      hmac.update(path)
      const signature = hmac.digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        
      const base = imgproxyUrl.endsWith('/') ? imgproxyUrl.slice(0, -1) : imgproxyUrl
      return `${base}/${signature}${path}`
    }

    // Unsigned
    const base = imgproxyUrl.endsWith('/') ? imgproxyUrl.slice(0, -1) : imgproxyUrl
    return `${base}/insecure${path}`
  }
}
