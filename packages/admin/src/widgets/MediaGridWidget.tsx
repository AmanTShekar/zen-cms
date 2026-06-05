import { useEffect, useState } from 'react'
import { ImageIcon, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function MediaGridWidget({ theme, title }: WidgetProps) {
 const navigate = useNavigate()
 const [media, setMedia] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const blobMap = { current: {} as Record<string, string> }
 const blobTokens = { current: new Set<string>() }
 const [, rerender] = useState(0)

 const getMediaUrl = (url: string): string => {
 if (!url || url.startsWith('http')) return url
 return blobMap.current[url] || url
 }

 useEffect(() => {
 if (!media.length) return
 const apiUrl = (import.meta.env.VITE_API_URL || '').replace('/api/v1', '')
 media.forEach((item: any) => {
 if (!item.url || item.url.startsWith('http') || blobMap.current[item.url]) return
 fetch(`${apiUrl}${item.url}`, { credentials: 'include' })
 .then((r) => r.blob())
 .then((blob) => {
 const objectUrl = URL.createObjectURL(blob)
 blobTokens.current.add(objectUrl)
 blobMap.current[item.url] = objectUrl
 rerender((n) => n + 1)
 })
 .catch(() => {})
 })
 }, [media])

 useEffect(() => {
 return () => { blobTokens.current.forEach((url) => URL.revokeObjectURL(url)) }
 }, [])

 useEffect(() => {
 api
 .get('/media?pageSize=6&sort=-createdAt')
 .then((r) => setMedia(r.data?.data || []))
 .catch(() => setMedia([]))
 .finally(() => setLoading(false))
 }, [])

 if (loading)
 return (
 <div className="h-full flex items-center justify-center text-[9px] text-gray-500 font-black uppercase">
 Loading...
 </div>
 )

 if (media.length === 0)
 return (
 <div
 className={cn(
 'h-full flex flex-col items-center justify-center gap-3 border rounded-none cursor-pointer hover:border-emerald-500/30 transition-all',
 theme === 'dark' ? 'border-white/[0.08] border-dashed' : 'border-gray-200 border-dashed'
 )}
 onClick={() => navigate('/media')}
 >
 <Upload size={20} className="text-gray-400" />
 <p className="text-[9px] font-black uppercase text-gray-400">
 No media yet. Click to upload.
 </p>
 </div>
 )

 return (
 <div className="h-full flex flex-col gap-3">
 <div className="flex items-center justify-between">
 <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ">
 {title || 'Media Library'}
 </p>
 <button
 onClick={() => navigate('/media')}
 className="text-[8px] text-gray-500 hover:text-emerald-600 dark:text-emerald-500 uppercase font-black transition-colors"
 >
 View All
 </button>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 flex-1 overflow-hidden">
 {media.map((item: any) => (
 <div
 key={item._id}
 className="relative aspect-square bg-gray-900 rounded-none overflow-hidden group"
 >
 {item.url ? (
 <img
 src={getMediaUrl(item.url)}
 alt={item.alt || item.name}
 className="w-full h-full object-cover transition-transform group-hover:scale-105"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center">
 <ImageIcon size={16} className="text-gray-600" />
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )
}
