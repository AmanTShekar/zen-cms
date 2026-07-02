import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { Zap, RefreshCw, Server, Cloud, Database } from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface SettingsMediaProps {
  settings: {
    mediaProvider: string
    maxUploadSize: number
    s3Bucket?: string
    s3Region?: string
    s3Endpoint?: string
    s3PublicUrl?: string
    s3AccessKey?: string
    s3SecretKey?: string
    cloudinaryCloudName?: string
    cloudinaryApiKey?: string
    cloudinaryApiSecret?: string
    [key: string]: any
  }
  setSettings: (s: any) => void
  theme: 'light' | 'dark'
}

const SettingsMedia: React.FC<SettingsMediaProps> = ({ settings, setSettings, theme }) => {
  const [testingS3, setTestingS3] = useState(false)
  const [testingCloudinary, setTestingCloudinary] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const testConnection = async (url: string, payload: any) => {
    setTestingConnection(true)
    try {
      const res = await api.post(url, payload)
      toast.success(res.data?.message || 'Connection verified successfully')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Connection failed. Check credentials.')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleTestS3 = async () => {
    setTestingS3(true)
    try {
      const res = await api.post('/system/s3/test', settings)
      toast.success(res.data?.message || 'S3 connection verified')
    } catch {
      toast.error('S3 connection failed. Check credentials.')
    } finally {
      setTestingS3(false)
    }
  }

  const handleTestCloudinary = async () => {
    setTestingCloudinary(true)
    try {
      const res = await api.post('/system/media/test', settings)
      toast.success(res.data?.message || 'Cloudinary connection verified')
    } catch {
      toast.error('Cloudinary connection failed. Check credentials.')
    } finally {
      setTestingCloudinary(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className={cn(
        'p-5 rounded-none border transition-all space-y-3',
        theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' : 'bg-[var(--z-bg-input)]/50 border-z-border shadow-sm'
      )}>
        <label className="text-xs font-semibold text-z-muted px-1">
          Storage Provider
        </label>
        <div className="relative">
          <select
            value={settings.mediaProvider}
            onChange={(e) => setSettings({ ...settings, mediaProvider: e.target.value })}
            className={cn(
              'w-full border rounded-none py-3 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black appearance-none cursor-pointer',
              theme === 'dark'
                ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent focus:ring-1 focus:ring-z-active-border'
                : 'bg-z-panel border-z-border focus:border-z-accent focus:ring-1 focus:ring-z-active-border'
            )}
          >
            <option value="local">Local Disk (Storage Volume)</option>
            <option value="s3">Amazon S3 / R2 Bucket</option>
            <option value="gcs">Google Cloud Storage</option>
            <option value="azure">Azure Blob Storage</option>
            <option value="vercel_blob">Vercel Blob Storage</option>
            <option value="cloudinary">Cloudinary</option>
          </select>
        </div>
        <p className={cn("text-sm px-1 mt-2", 'text-z-secondary')}>
          Select where uploaded media files should be stored. S3 and Cloudinary require additional API configuration.
        </p>
      </div>

      <div className={cn(
        'p-5 rounded-none border transition-all space-y-3',
        theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm' : 'bg-[var(--z-bg-input)]/50 border-z-border shadow-sm'
      )}>
        <label className="text-xs font-semibold text-z-muted px-1">
          Maximum Upload Size (Bytes)
        </label>
        <input
          type="number"
          value={settings.maxUploadSize}
          onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value, 10) })}
          className={cn(
            'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
            theme === 'dark'
              ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent focus:ring-1 focus:ring-z-active-border'
              : 'bg-z-panel border-z-border focus:border-z-accent focus:ring-1 focus:ring-z-active-border'
          )}
        />
        <p className={cn("text-sm px-1 mt-2", 'text-z-secondary')}>
          Limit the maximum file size for uploads (e.g. 5242880 for 5MB).
        </p>
      </div>

      {settings.mediaProvider === 's3' && (
        <div className={cn(
          'p-6 rounded-none border transition-all space-y-5',
          theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-active-border shadow-sm' : 'bg-z-active-bg/30 border-z-active-border shadow-sm'
        )}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-sm"></div>
            <h4 className="text-sm font-bold text-z-active-text">S3 / Object Storage Configuration</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Bucket Name</label>
              <input
                type="text"
                value={settings.s3Bucket || ''}
                onChange={(e) => setSettings({ ...settings, s3Bucket: e.target.value })}
                placeholder="my-zenith-bucket"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Region</label>
              <input
                type="text"
                value={settings.s3Region || ''}
                onChange={(e) => setSettings({ ...settings, s3Region: e.target.value })}
                placeholder="us-east-1"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Endpoint (For Cloudflare R2 / MinIO)</label>
              <input
                type="text"
                value={settings.s3Endpoint || ''}
                onChange={(e) => setSettings({ ...settings, s3Endpoint: e.target.value })}
                placeholder="https://<account-id>.r2.cloudflarestorage.com"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Public Custom URL (For CDN delivery)</label>
              <input
                type="text"
                value={settings.s3PublicUrl || ''}
                onChange={(e) => setSettings({ ...settings, s3PublicUrl: e.target.value })}
                placeholder="https://cdn.mysite.com"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Access Key ID</label>
              <input
                type="text"
                value={settings.s3AccessKey || ''}
                onChange={(e) => setSettings({ ...settings, s3AccessKey: e.target.value })}
                placeholder="AKIA..."
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Secret Access Key</label>
              <input
                type="password"
                value={settings.s3SecretKey || ''}
                onChange={(e) => setSettings({ ...settings, s3SecretKey: e.target.value })}
                placeholder="••••••••••••••••"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="col-span-full pt-4">
              <button
                onClick={handleTestS3}
                disabled={testingS3}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold transition-all active:scale-95 border',
                  theme === 'dark'
                    ? 'bg-z-accent border-transparent text-z-primary hover:opacity-90 shadow-sm'
                    : 'bg-z-accent text-z-logo-text border-transparent hover:opacity-90'
                )}
              >
                {testingS3 ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                Test S3 Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.mediaProvider === 'gcs' && (
        <div className={cn(
          'p-6 rounded-none border transition-all space-y-5',
          theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-active-border shadow-sm' : 'bg-z-active-bg/30 border-z-active-border shadow-sm'
        )}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-sm"></div>
            <h4 className="text-sm font-bold text-z-active-text">Google Cloud Storage</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Project ID</label>
              <input
                type="text"
                value={settings.gcsProjectId || ''}
                onChange={(e) => setSettings({ ...settings, gcsProjectId: e.target.value })}
                placeholder="my-gcp-project-123"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Bucket Name</label>
              <input
                type="text"
                value={settings.gcsBucket || ''}
                onChange={(e) => setSettings({ ...settings, gcsBucket: e.target.value })}
                placeholder="my-gcs-bucket"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Client Email</label>
              <input
                type="text"
                value={settings.gcsClientEmail || ''}
                onChange={(e) => setSettings({ ...settings, gcsClientEmail: e.target.value })}
                placeholder="service-account@my-gcp-project-123.iam.gserviceaccount.com"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Private Key</label>
              <textarea
                value={settings.gcsPrivateKey || ''}
                onChange={(e) => setSettings({ ...settings, gcsPrivateKey: e.target.value })}
                placeholder="-----BEGIN PRIVATE KEY-----\n..."
                rows={4}
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border font-mono',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="col-span-full pt-4">
              <button
                type="button"
                onClick={() => testConnection('/api/v1/system/cache-jobs/gcs/test', {
                  gcsProjectId: settings.gcsProjectId,
                  gcsClientEmail: settings.gcsClientEmail,
                  gcsPrivateKey: settings.gcsPrivateKey,
                  gcsBucket: settings.gcsBucket
                })}
                disabled={testingConnection}
                className={cn(
                  'w-full py-2.5 px-4 text-sm font-semibold rounded-none transition-all flex items-center justify-center gap-2',
                  testingConnection ? 'bg-z-border/50 text-z-muted cursor-not-allowed' : 'bg-z-active-bg hover:bg-z-active-bg/80 text-z-active-text border border-z-active-border'
                )}
              >
                {testingConnection ? 'Verifying...' : 'Verify GCS Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.mediaProvider === 'azure' && (
        <div className={cn(
          'p-6 rounded-none border transition-all space-y-5',
          theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-active-border shadow-sm' : 'bg-z-active-bg/30 border-z-active-border shadow-sm'
        )}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-sm"></div>
            <h4 className="text-sm font-bold text-z-active-text">Azure Blob Storage</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Account Name</label>
              <input
                type="text"
                value={settings.azureAccountName || ''}
                onChange={(e) => setSettings({ ...settings, azureAccountName: e.target.value })}
                placeholder="myazureaccount"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Container Name</label>
              <input
                type="text"
                value={settings.azureContainerName || ''}
                onChange={(e) => setSettings({ ...settings, azureContainerName: e.target.value })}
                placeholder="my-container"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Account Key</label>
              <input
                type="password"
                value={settings.azureAccountKey || ''}
                onChange={(e) => setSettings({ ...settings, azureAccountKey: e.target.value })}
                placeholder="••••••••••••••••"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border font-mono',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="col-span-full pt-4">
              <button
                type="button"
                onClick={() => testConnection('/api/v1/system/cache-jobs/azure/test', {
                  azureAccountName: settings.azureAccountName,
                  azureAccountKey: settings.azureAccountKey,
                  azureContainerName: settings.azureContainerName
                })}
                disabled={testingConnection}
                className={cn(
                  'w-full py-2.5 px-4 text-sm font-semibold rounded-none transition-all flex items-center justify-center gap-2',
                  testingConnection ? 'bg-z-border/50 text-z-muted cursor-not-allowed' : 'bg-z-active-bg hover:bg-z-active-bg/80 text-z-active-text border border-z-active-border'
                )}
              >
                {testingConnection ? 'Verifying...' : 'Verify Azure Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.mediaProvider === 'vercel_blob' && (
        <div className={cn(
          'p-6 rounded-none border transition-all space-y-5',
          theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-active-border shadow-sm' : 'bg-z-active-bg/30 border-z-active-border shadow-sm'
        )}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-sm"></div>
            <h4 className="text-sm font-bold text-z-active-text">Vercel Blob Storage</h4>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">Read/Write Token (BLOB_READ_WRITE_TOKEN)</label>
              <input
                type="password"
                value={settings.vercelBlobToken || ''}
                onChange={(e) => setSettings({ ...settings, vercelBlobToken: e.target.value })}
                placeholder="vercel_blob_rw_..."
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border font-mono',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="col-span-full pt-4">
              <button
                type="button"
                onClick={() => testConnection('/api/v1/system/cache-jobs/vercel-blob/test', {
                  vercelBlobToken: settings.vercelBlobToken
                })}
                disabled={testingConnection}
                className={cn(
                  'w-full py-2.5 px-4 text-sm font-semibold rounded-none transition-all flex items-center justify-center gap-2',
                  testingConnection ? 'bg-z-border/50 text-z-muted cursor-not-allowed' : 'bg-z-active-bg hover:bg-z-active-bg/80 text-z-active-text border border-z-active-border'
                )}
              >
                {testingConnection ? 'Verifying...' : 'Verify Vercel Blob Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.mediaProvider === 'cloudinary' && (
        <div className={cn(
          'p-6 rounded-none border transition-all space-y-5',
          theme === 'dark' ? 'bg-z-panel backdrop-blur-md border-z-accent/30 shadow-sm' : 'bg-z-active-bg border-z-accent/30 shadow-sm'
        )}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
            <h4 className="text-sm font-bold text-z-active-text">Cloudinary Configuration</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-z-muted px-1">Cloud Name</label>
              <input
                type="text"
                value={settings.cloudinaryCloudName || ''}
                onChange={(e) => setSettings({ ...settings, cloudinaryCloudName: e.target.value })}
                placeholder="my-cloud-name"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">API Key</label>
              <input
                type="text"
                value={settings.cloudinaryApiKey || ''}
                onChange={(e) => setSettings({ ...settings, cloudinaryApiKey: e.target.value })}
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-z-muted px-1">API Secret</label>
              <input
                type="password"
                value={settings.cloudinaryApiSecret || ''}
                onChange={(e) => setSettings({ ...settings, cloudinaryApiSecret: e.target.value })}
                placeholder="••••••••••••••••"
                className={cn(
                  'w-full border rounded-none py-2.5 px-4 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border',
                  theme === 'dark' ? 'bg-app/80 border-z-border text-z-primary focus:border-z-accent' : 'bg-z-panel border-z-border focus:border-z-accent'
                )}
              />
            </div>

            <div className="col-span-full pt-4">
              <button
                onClick={handleTestCloudinary}
                disabled={testingCloudinary}
                className={cn(
                  'flex items-center gap-2 px-6 py-2.5 rounded-none text-sm font-bold transition-all active:scale-95 border',
                  theme === 'dark'
                    ? 'bg-z-accent border-transparent text-z-primary hover:opacity-90 shadow-sm'
                    : 'bg-z-accent text-z-logo-text border-transparent hover:opacity-90'
                )}
              >
                {testingCloudinary ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                Test Cloudinary Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsMedia
