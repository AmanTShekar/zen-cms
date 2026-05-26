import React, { useEffect, useState } from 'react'
import { ZenithClient } from '@zenithcms/sdk'
import { BookOpen, Calendar, User, ArrowRight } from 'lucide-react'

// Connect to Zenith CMS v2
const zenith = new ZenithClient({
  url: import.meta.env.VITE_CMS_URL || '',
  apiKey: import.meta.env.VITE_CMS_API_KEY || '',
  siteId: import.meta.env.VITE_CMS_SITE_ID || '',
})

const BlogDemo = () => {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_THEME') {
        const theme = event.data.theme
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      } else if (event.data?.type === 'ZENITH_DATA_UPDATE') {
        const payload = event.data.data
        if (payload) {
          if (Array.isArray(payload)) {
            setPosts(payload)
          } else if (payload.docs && Array.isArray(payload.docs)) {
            setPosts(payload.docs)
          } else if (payload.data && Array.isArray(payload.data)) {
            setPosts(payload.data)
          } else {
            const updatedPost = payload
            if (updatedPost.id || updatedPost._id) {
              setPosts((prevPosts) =>
                prevPosts.map((p) =>
                  (p.id === updatedPost.id || p._id === updatedPost._id) ? { ...p, ...updatedPost } : p
                )
              )
            }
          }
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const loadContent = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlSiteId = params.get('siteId')
        if (urlSiteId) {
          zenith.setSiteId(urlSiteId)
        }
        const { data } = await zenith.find('posts')
        setPosts(data)
      } catch (err) {
        console.error('Zenith SDK Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 py-6 px-8 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-600">
            <BookOpen size={28} strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-slate-900">
              ZENITH<span className="text-indigo-600">BLOG</span>
            </span>
          </div>
          <button className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            Subscribe
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-16">
        <header className="mb-16">
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Latest Insights. <br />
            <span className="text-indigo-600">Powered by Zenith.</span>
          </h1>
          <p className="text-slate-500 mt-6 text-xl max-w-2xl leading-relaxed">
            Every article below is dynamically managed via the Zenith CMS Admin Dashboard. No code
            changes required to publish.
          </p>
        </header>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium animate-pulse">
            Fetching content from Zenith Engine...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-slate-400">No posts found. Add some content in the Admin!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {posts.map((post) => (
              <article
                key={post._id || post.id || post.title}
                className="group bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-6">
                  <span className="bg-indigo-50 px-3 py-1 rounded-full">
                    {post.tags?.[0] || 'Uncategorized'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-4">
                  {post.title}
                </h2>
                <p className="text-slate-500 line-clamp-3 mb-8 leading-relaxed">
                  {post.content?.replace(/<[^>]*>/g, '') || 'No content provided.'}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-bold text-slate-700">Zenith Editor</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    Read Post <ArrowRight size={16} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-white py-16 px-8 mt-20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-slate-400 text-sm font-medium">
            © 2026 Zenith CMS — The Hardened Headless Solution
          </p>
        </div>
      </footer>
    </div>
  )
}

export default BlogDemo
