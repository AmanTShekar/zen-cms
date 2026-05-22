import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import {
  Grid,
  Mail,
  Image as ImageIcon,
  Users,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import Header from './components/Header'
import Footer from './components/Footer'
import ArticleCard from './components/ArticleCard'
import PostDetail from './components/PostDetail'
import NotFound from './components/NotFound'
import { GridSkeleton, ArticleDetailSkeleton } from './components/Skeleton'
import { getPosts, getPost, Post } from './lib/cms'


// ── Shared Page Wrapper ─────────────────────────
function PageWrapper({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={`pt-20 pb-8 min-h-screen ${className}`}>
      {children}
    </main>
  )
}

// ── Section Container (Handles Preview Highlight, Click Selection, and Hover Rings) ─────────────────────────
function SectionContainer({
  id,
  children,
  blockType,
  title
}: {
  id: string
  children: React.ReactNode
  blockType: string
  title: string
}) {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'
  
  const handleClick = (e: React.MouseEvent) => {
    if (isPreview) {
      e.stopPropagation()
      window.parent.postMessage({ type: 'ZENITH_SECTION_SELECT', sectionId: id }, '*')
    }
  }

  return (
    <section
      id={`section-${id}`}
      onClick={handleClick}
      className={`relative py-12 px-6 transition-all duration-300 ${
        isPreview
          ? 'cursor-pointer hover:ring-2 hover:ring-[#8B5CF6]/50 hover:bg-[#8B5CF6]/[0.02] rounded-xl'
          : ''
      }`}
    >
      {isPreview && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[8px] font-black uppercase tracking-wider italic leading-none pointer-events-none select-none rounded">
          <Sparkles size={8} />
          {title || blockType}
        </div>
      )}
      {children}
    </section>
  )
}

// ── Hero Section ───────────────────────────────────
function HeroSection({ id, content }: { id: string; content: any }) {
  const headline = content?.headline || 'Future Engine'
  const subheadline = content?.subheadline || 'Modular architecture for visionaries.'
  const callToAction = content?.callToAction || 'Launch Protocol'

  return (
    <SectionContainer id={id} blockType="hero" title="Hero Module">
      <div className="max-w-4xl mx-auto text-center py-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-[#818cf8] uppercase tracking-[0.15em] mb-8 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8b5cf6]" />
          System Node Active
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
          {headline}
        </h1>
        <p className="text-base sm:text-lg text-zenith-textMuted max-w-xl mx-auto leading-relaxed mb-8">
          {subheadline}
        </p>
        {callToAction && (
          <button className="zenith-btn-primary hover:shadow-[#8B5CF6]/20">
            {callToAction} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </SectionContainer>
  )
}

// ── Features Section ───────────────────────────────
function FeaturesSection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'Core Capabilities'
  const features = content?.featureList || []

  return (
    <SectionContainer id={id} blockType="features" title="Neural Features">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat: any, idx: number) => (
            <div
              key={idx}
              className="glass-card p-6 hover:scale-[1.02] hover:border-[#8B5CF6]/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#8B5CF6] mb-4">
                <Grid size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title || 'Feature'}</h3>
              <p className="text-sm text-zenith-textMuted leading-relaxed">
                {feat.description || 'Feature description details.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Stats Section ──────────────────────────────────
function StatsSection({ id, content }: { id: string; content: any }) {
  const items = content?.items || []

  return (
    <SectionContainer id={id} blockType="stats" title="Metric Rails">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((item: any, idx: number) => (
            <div
              key={idx}
              className="glass-card p-6 text-center border-t-2 border-t-[#8B5CF6] hover:scale-[1.03] transition-transform"
            >
              <div className="text-3xl sm:text-4xl font-black text-[#8B5CF6] tracking-tight mb-1">
                {item.value || '0%'}
              </div>
              <div className="text-[10px] font-bold text-zenith-textMuted uppercase tracking-widest">
                {item.label || 'Metric'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Testimonials Section ───────────────────────────
function TestimonialsSection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'Global Voices'
  const items = content?.items || []

  return (
    <SectionContainer id={id} blockType="testimonials" title="Audience Proof">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item: any, idx: number) => (
            <div
              key={idx}
              className="glass-card p-6 flex flex-col justify-between border-l-2 border-l-[#10B981]"
            >
              <p className="text-sm italic text-zenith-text leading-relaxed mb-6">
                "{item.quote || 'No quote content.'}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10B981] text-xs font-black">
                  {item.author?.[0] || 'A'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.author || 'Anonymous'}</div>
                  <div className="text-[10px] text-zenith-textMuted uppercase tracking-wider">
                    {item.role || 'Contributor'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Newsletter Section ─────────────────────────────
function NewsletterSection({ id, content }: { id: string; content: any }) {
  const title = content?.title || 'Join The Network'
  const description = content?.description || 'Stay updated with the latest manifests.'
  const buttonText = content?.buttonText || 'Subscribe'

  return (
    <SectionContainer id={id} blockType="newsletter" title="Signal Capture">
      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#8B5CF6]/5 rounded-full blur-[60px] pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#8B5CF6] mx-auto mb-6">
            <Mail size={24} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">{title}</h2>
          <p className="text-sm text-zenith-textMuted max-w-lg mx-auto mb-8 leading-relaxed">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your system signal email..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#8B5CF6]/50"
            />
            <button className="zenith-btn-primary whitespace-nowrap justify-center">
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Pricing Section ────────────────────────────────
function PricingSection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'Parametric Plans'
  const plans = content?.plans || []

  return (
    <SectionContainer id={id} blockType="pricing" title="Revenue Matrix">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any, idx: number) => {
            const isFeatured = idx === 1 || plans.length === 1
            return (
              <div
                key={idx}
                className={`glass-card p-8 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300 ${
                  isFeatured ? 'border-[#8B5CF6] shadow-glow-sm bg-white/[0.04]' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">{plan.name || 'Tier'}</h3>
                    {isFeatured && (
                      <span className="px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 text-[8px] font-black uppercase tracking-widest rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{plan.price || '$0'}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features?.split(',').map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-zenith-text">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        {f.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                    isFeatured
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-glow-sm hover:scale-[1.02]'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  Choose Plan
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── CTA Section ────────────────────────────────────
function CtaSection({ id, content }: { id: string; content: any }) {
  const title = content?.title || 'Ready to scale?'
  const description = content?.description || 'Join the next generation of architects.'
  const buttonText = content?.buttonText || 'Connect Now'

  return (
    <SectionContainer id={id} blockType="cta" title="Action Nexus">
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-8 md:p-12 relative overflow-hidden bg-gradient-to-r from-white/[0.03] to-[#8B5CF6]/[0.05] border-[#8B5CF6]/20 shadow-glow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/5 blur-[100px] pointer-events-none rounded-full" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>
              <p className="text-sm text-zenith-textMuted max-w-xl leading-relaxed">{description}</p>
            </div>
            <button className="zenith-btn-primary shrink-0 self-start md:self-auto hover:shadow-[#8B5CF6]/20">
              {buttonText} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Rich Text Section ──────────────────────────────
function RichTextSection({ id, content }: { id: string; content: any }) {
  const prose = content?.content || '<p>Default text.</p>'

  return (
    <SectionContainer id={id} blockType="richTextSection" title="Prose Engine">
      <div className="max-w-3xl mx-auto">
        <div
          className="prose prose-invert prose-zenith text-zenith-text leading-relaxed text-sm md:text-base space-y-4"
          dangerouslySetInnerHTML={{ __html: prose }}
        />
      </div>
    </SectionContainer>
  )
}

// ── Gallery Section ────────────────────────────────
function GallerySection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'Project Exhibits'
  const items = content?.items || []

  return (
    <SectionContainer id={id} blockType="gallery" title="Visual Vault">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="glass-card overflow-hidden group">
              <div className="h-48 relative overflow-hidden bg-black/40 flex items-center justify-center">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.caption || 'Gallery Image'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0F19] to-indigo-950/40 flex flex-col items-center justify-center gap-2">
                    <ImageIcon size={32} className="text-[#8B5CF6]/30 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-zenith-textDim uppercase tracking-widest">
                      Visual Asset Placeholder
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/[0.05]">
                <p className="text-xs font-bold text-white text-center uppercase tracking-wide">
                  {item.caption || 'Exhibit Frame'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── Team Section ───────────────────────────────────
function TeamSection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'System Architects'
  const members = content?.members || []

  return (
    <SectionContainer id={id} blockType="team" title="Architect Registry">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member: any, idx: number) => (
            <div key={idx} className="glass-card p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#8B5CF6] mb-4">
                <Users size={28} />
              </div>
              <h3 className="text-base font-bold text-white mb-1">{member.name || 'Member'}</h3>
              <div className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-3">
                {member.role || 'Role'}
              </div>
              <p className="text-xs text-zenith-textMuted leading-relaxed">
                {member.bio || 'Architect bios and system descriptions.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

// ── FAQ Section ────────────────────────────────────
function FAQSection({ id, content }: { id: string; content: any }) {
  const heading = content?.heading || 'Protocol FAQ'
  const items = content?.items || []

  return (
    <SectionContainer id={id} blockType="faq" title="Knowledge Base">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">{heading}</h2>
        <div className="space-y-4">
          {items.map((item: any, idx: number) => (
            <FAQItem key={idx} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </SectionContainer>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="glass-card overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-bold text-white hover:bg-white/[0.02]"
      >
        <span>{question || 'Question?'}</span>
        {isOpen ? <Minus size={14} className="text-[#8B5CF6]" /> : <Plus size={14} className="text-[#8B5CF6]" />}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-4 pt-2 text-xs text-zenith-textMuted leading-relaxed border-t border-white/[0.03]">
              {answer || 'Answer details.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Dynamic Sections Renderer ──────────────────────
function SectionsRenderer({ sections }: { sections: any[] }) {
  if (!sections || !Array.isArray(sections)) return null

  return (
    <div className="space-y-8 pb-16">
      {sections.map((section) => {
        const type = section.blockType
        switch (type) {
          case 'hero':
            return <HeroSection key={section.id} id={section.id} content={section.content} />
          case 'features':
            return <FeaturesSection key={section.id} id={section.id} content={section.content} />
          case 'stats':
            return <StatsSection key={section.id} id={section.id} content={section.content} />
          case 'testimonials':
            return <TestimonialsSection key={section.id} id={section.id} content={section.content} />
          case 'newsletter':
            return <NewsletterSection key={section.id} id={section.id} content={section.content} />
          case 'pricing':
            return <PricingSection key={section.id} id={section.id} content={section.content} />
          case 'cta':
            return <CtaSection key={section.id} id={section.id} content={section.content} />
          case 'richTextSection':
            return <RichTextSection key={section.id} id={section.id} content={section.content} />
          case 'gallery':
            return <GallerySection key={section.id} id={section.id} content={section.content} />
          case 'team':
            return <TeamSection key={section.id} id={section.id} content={section.content} />
          case 'faq':
            return <FAQSection key={section.id} id={section.id} content={section.content} />
          default:
            return (
              <div key={section.id} className="max-w-xl mx-auto p-4 glass-card text-center text-xs text-red-400">
                Unknown section block type: {type}
              </div>
            )
        }
      })}
    </div>
  )
}

// ── Home Page ───────────────────────────────────
function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [pageData, setPageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const params = new URLSearchParams(window.location.search)
  const isPreview = params.get('preview') === 'true'
  const pageId = params.get('pageId')

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZENITH_DATA_UPDATE') {
        const payload = event.data.data
        if (payload && (payload.sections || payload.title)) {
          setPageData(payload)
          setLoading(false)
        }
      } else if (event.data?.type === 'ZENITH_PARENT_SELECT') {
        const sectionId = event.data.sectionId
        if (sectionId) {
          const element = document.getElementById(`section-${sectionId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add a visual flash/highlight effect
            element.classList.add('ring-2', 'ring-[#8B5CF6]', 'ring-offset-2', 'ring-offset-[#0B0F19]', 'scale-[1.01]')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-[#8B5CF6]', 'ring-offset-2', 'ring-offset-[#0B0F19]', 'scale-[1.01]')
            }, 2000)
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
        if (isPreview && pageId && pageId !== 'landing-page') {
          // In page preview mode, fetch the specific page content initially
          const page = await getPost(pageId, 'id') // Using SDK findById / getPost equivalent
          if (page) setPageData(page)
        } else {
          // Normal mode: Fetch posts first
          const data = await getPosts({ limit: 6 })
          setPosts(data)

          // Also try loading landing-page sections if present
          try {
            const landingPage = await getPost('landing-page', 'slug')
            if (landingPage) setPageData(landingPage)
          } catch {
            // No landing-page found, standard blog list layout fallback
          }
        }
        setError(null)
      } catch (err) {
        console.error('Failed to load home content:', err)
        if (!isPreview) {
          setError('Could not connect to CMS. Check your .env settings.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [isPreview, pageId])

  if (loading && isPreview) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 text-center animate-pulse text-zenith-textMuted text-sm font-bold">
        Loading preview environment...
      </PageWrapper>
    )
  }

  // If pageData with sections is present, render sections!
  if (pageData && pageData.sections && pageData.sections.length > 0) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6">
        <SectionsRenderer sections={pageData.sections} />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center py-20 relative"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-zenith-gradient pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-300 uppercase tracking-[0.15em] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Powered by Zenith CMS
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-[1.05] mb-6">
            Content that
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              shines
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zenith-textMuted max-w-xl mx-auto leading-relaxed">
            A premium storefront experience — fully dynamic, zero code changes needed to publish.
          </p>
        </motion.div>
      </motion.div>

      {/* Latest Posts */}
      <section>
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-white">Latest Articles</h2>
            <p className="text-sm text-zenith-textMuted mt-1">
              Fresh from the CMS engine
            </p>
          </div>
          <a
            href="/posts"
            className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all →
          </a>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <GridSkeleton count={3} />
        ) : posts.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-glass-gradient border border-white/[0.05]">
            <p className="text-zenith-textDim mb-3 font-medium">No posts published yet.</p>
            <p className="text-xs text-zenith-textDim">
              Create a post in Zenith Admin — it appears here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(0, 3).map((post, i) => (
              <ArticleCard
                key={post._id || post.id || i}
                post={post}
                index={i}
                featured={i === 0}
              />
            ))}
          </div>
        )}
      </section>
    </PageWrapper>
  )
}

// ── Posts List Page ─────────────────────────────
function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPosts({ limit: 50 })
      .then((data) => {
        setPosts(data)
        setError(null)
      })
      .catch((err) => {
        console.error('Failed to load posts:', err)
        setError('Could not connect to CMS.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper className="max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-black text-white mb-2">All Posts</h1>
        <p className="text-sm text-zenith-textMuted">
          {loading ? 'Loading…' : `${posts.length} article${posts.length !== 1 ? 's' : ''}`}
        </p>
      </motion.div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <GridSkeleton count={6} />
      ) : posts.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-glass-gradient border border-white/[0.05]">
          <p className="text-zenith-textDim font-medium">No posts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <ArticleCard
              key={post._id || post.id || i}
              post={post}
              index={i}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}

// ── Post Detail Page ────────────────────────────
function PostPage() {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZENITH_DATA_UPDATE') {
        const payload = event.data.data
        if (payload && (payload.title || payload.content)) {
          setPost(payload)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const slug = window.location.pathname.split('/post/')[1] || ''
    if (!slug) {
      setLoading(false)
      return
    }

    getPost(slug, 'slug')
      .then((data) => {
        if (!data) {
          setError(true)
          return
        }
        setPost(data)
        document.title = `${(data as Post).title} — Zenith Storefront`
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <PageWrapper className="max-w-3xl mx-auto px-6 pb-20">
        <ArticleDetailSkeleton />
      </PageWrapper>
    )
  }

  if (error || !post) {
    return (
      <PageWrapper className="max-w-3xl mx-auto px-6">
        <NotFound
          title="Post not found"
          description="This article may have been removed or the slug is incorrect."
          action={{ label: '← Back to Posts', to: '/posts' }}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="max-w-3xl mx-auto px-6 pb-20">
      <PostDetail post={post} />
    </PageWrapper>
  )
}

// ── About Page ─────────────────────────────────
function AboutPage() {
  return (
    <PageWrapper className="max-w-3xl mx-auto px-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-8"
      >
        <h1 className="text-4xl font-black text-white mb-2">About</h1>
        <p className="text-sm text-zenith-textMuted mb-10">The Zenith Storefront Template</p>

        <div className="space-y-6 text-sm sm:text-base text-zenith-textMuted leading-[1.85]">
          <p>
            This storefront is powered by <strong className="text-white">Zenith CMS</strong> — an
            enterprise-grade, multi-tenant headless CMS. Every piece of content you see is fetched
            dynamically from the Zenith API and rendered here.
          </p>
          <p>
            The connection is simple — set three environment variables in your <code className="font-mono text-xs bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06]">.env</code> file:
          </p>

          <div className="rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
            <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.05]">
              <span className="text-xs font-mono text-indigo-400">.env</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-2">
              <div><span className="text-green-400">VITE_CMS_URL</span>=<span className="text-amber-300">https://api.yoursite.com</span></div>
              <div><span className="text-green-400">VITE_CMS_API_KEY</span>=<span className="text-amber-300">your-api-key-here</span></div>
              <div><span className="text-green-400">VITE_CMS_SITE_ID</span>=<span className="text-amber-300">your-site-id-here</span></div>
            </div>
          </div>

          <p>
            Get your credentials from the <strong className="text-white">Zenith Admin Dashboard</strong> →
            Settings → API Keys & Sites.
          </p>

          <div className="rounded-xl bg-glass-gradient border border-white/[0.05] p-6 mt-8">
            <h3 className="text-base font-bold text-white mb-4">What's built in</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Vite build',
                'TypeScript throughout',
                'Glassmorphism dark theme',
                'Reading progress bar',
                'Zero dependency SDK client',
                'Vercel & Netlify ready',
                'PWA with auto-update',
                'Framer Motion animations',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-zenith-textMuted">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  )
}

// ── App Shell ───────────────────────────────────
export default function App() {
  const [themeState, setThemeState] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_THEME') {
        const theme = event.data.theme
        setThemeState(theme)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    if (themeState === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = '#0B0F19'
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.backgroundColor = '#fafafa'
    }
  }, [themeState])

  return (
    <BrowserRouter>
      <div className={`min-h-screen relative transition-colors duration-300 ${
        themeState === 'dark' ? 'bg-zenith-base bg-zenith-gradient text-white' : 'bg-[#fafafa] text-gray-900'
      }`}>
        {/* Radial noise overlay */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <Header />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/post/:slug" element={<PostPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
        <Footer />

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0',
              backdropFilter: 'blur(16px)',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </div>
    </BrowserRouter>
  )
}