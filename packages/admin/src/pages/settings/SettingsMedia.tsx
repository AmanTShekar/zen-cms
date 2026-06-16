import React from 'react'
import { cn } from '../../lib/utils'

interface SettingsMediaProps {
 settings: {
 mediaProvider: string
 maxUploadSize: number
 }
 setSettings: (s: any) => void
 theme: 'light' | 'dark'
}

const SettingsMedia: React.FC<SettingsMediaProps> = ({ settings, setSettings, theme }) => {
 return (
 <>
 <div
 className={cn(
 'p-5 rounded-none-none border transition-all space-y-3',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-gray-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-gray-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 Storage Provider
 </label>
 <select
 value={settings.mediaProvider}
 onChange={(e) => setSettings({ ...settings, mediaProvider: e.target.value })}
 className={cn(
 'w-full border rounded-none-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black appearance-none cursor-pointer',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500/50'
 : 'bg-white border-gray-200 focus:border-gray-500 focus:ring-1 focus:ring-gray-500/50'
 )}
 >
 <option value="local">Local Disk (Storage Volume)</option>
 <option value="s3">Amazon S3 / R2 Bucket</option>
 <option value="cloudinary">Cloudinary</option>
 </select>
 <p className="text-[10px] text-gray-500 px-1 mt-2">
 Select where uploaded media files should be stored. Note: S3 and Cloudinary require additional API keys in your environment variables.
 </p>
 </div>

 <div
 className={cn(
 'p-5 rounded-none-none border transition-all space-y-3',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08] hover:border-gray-500/20' : 'bg-gray-50/50 border-gray-200 shadow-sm hover:border-gray-500/30'
 )}
 >
 <label className="text-xs font-semibold text-gray-400 px-1">
 Maximum Upload Size (Bytes)
 </label>
 <input
 type="number"
 value={settings.maxUploadSize}
 onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value, 10) })}
 className={cn(
 'w-full border rounded-none-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-[#0f141f] border-white/[0.08] text-white focus:border-gray-500 focus:ring-1 focus:ring-gray-500/50'
 : 'bg-white border-gray-200 focus:border-gray-500 focus:ring-1 focus:ring-gray-500/50'
 )}
 />
 <p className="text-[10px] text-gray-500 px-1 mt-2">
 Limit the maximum file size for uploads (e.g. 5242880 for 5MB).
 </p>
 </div>
 </>
 )
}

export default SettingsMedia
