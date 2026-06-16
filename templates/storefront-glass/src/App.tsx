import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Grid,
  Image as ImageIcon,
  Mail,
  Minus,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import ArticleCard from './components/ArticleCard'
import Footer from './components/Footer'
import Header from './components/Header'
import NotFound from './components/NotFound'
import PostDetail from './components/PostDetail'
import { ArticleDetailSkeleton, GridSkeleton } from './components/Skeleton'
import { cms, getPage, getPost, getPosts, Post, refreshSiteId, parseLexicalToHTML, getGlobals } from './lib/cms'

// ── Shared Page Wrapper ─────────────────────────
function PageWrapper({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <main className={`pt-20 pb-8 min-h-screen ${className}`}>{children}</main>
}

// ── Section Container (Handles Preview Highlight, Click Selection, and Hover Rings) ─────────────────────────
function SectionContainer({
  id,
  children,
  blockType,
  title,
  content,
}: {
  id: string
  children: React.ReactNode
  blockType: string
  title: string
  content?: any
}) {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'

  const handleClick = (e: React.MouseEvent) => {
    if (isPreview) {
      e.stopPropagation()
      window.parent.postMessage({ type: 'ZENITH_SECTION_SELECT', sectionId: id }, '*')
    }
  }

  const anchorId = content?.anchorId || `section-${id}`
  const theme = content?.theme || 'default'
  const paddingY = content?.paddingY || 'medium'
  const containerWidth = content?.containerWidth || 'boxed'
  const bgImage = content?.bgImage?.url || null

  const themeClasses = {
    default: '',
    light: 'bg-white/90 text-black border-y border-gray-200 shadow-sm',
    dark: 'bg-[#0B0F19]/90 text-white border-y border-white/10 shadow-lg',
    'cyber-emerald': 'bg-gradient-to-br from-emerald-950/70 via-emerald-900/50 to-black/80 text-white border-y border-emerald-500/20 shadow-[inset_0_0_80px_rgba(16,185,129,0.05)]',
    glassmorphic: 'bg-gray-900/65 backdrop-blur-[12px] border-y border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-white'
  }[theme as 'default' | 'light' | 'dark' | 'cyber-emerald' | 'glassmorphic'] || ''

  const paddingClasses = {
    none: 'py-0',
    small: 'py-6',
    medium: 'py-12',
    large: 'py-24'
  }[paddingY as 'none' | 'small' | 'medium' | 'large'] || 'py-12'

  return (
    <section
      id={anchorId}
      onClick={handleClick}
      className={`relative ${paddingClasses} px-6 transition-all duration-300 ${themeClasses} overflow-hidden ${
        isPreview
          ? 'cursor-pointer hover:ring-2 hover:ring-[#8B5CF6]/50 hover:bg-[#8B5CF6]/[0.02] rounded-xl'
          : ''
      }`}
    >
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src={bgImage} alt="" className="w-full h-full object-cover opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}
      {isPreview && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 text-[8px] font-black uppercase tracking-wider italic leading-none pointer-events-none select-none rounded">
          <Sparkles size={8} />
          {title || blockType}
        </div>
      )}
      <div className={`relative z-10 ${containerWidth === 'full-width' ? 'w-full' : 'max-w-7xl mx-auto'}`}>
        {children}
      </div>
    </section>
  )
}



// ── Hero Section ───────────────────────────────────
function HeroSection({ id, content }: { id: string; content: any }) {
  const headline = content?.headline || content?.title || 'Future Engine'
  const subheadline = content?.subheadline || content?.subtitle || 'Modular architecture for visionaries.'
  const callToAction = content?.callToAction || 'Launch Protocol'

  return (
    <SectionContainer id={id} blockType="hero" title="Hero Module" content={content}>
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
  const heading = content?.heading || content?.title || 'Core Capabilities'
  const features = content?.featureList || content?.features || []

  return (
    <SectionContainer id={id} blockType="features" title="Neural Features" content={content}>
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
    <SectionContainer id={id} blockType="stats" title="Metric Rails" content={content}>
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
    <SectionContainer id={id} blockType="testimonials" title="Audience Proof" content={content}>
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
    <SectionContainer id={id} blockType="newsletter" title="Signal Capture" content={content}>
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
    <SectionContainer id={id} blockType="pricing" title="Revenue Matrix" content={content}>
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
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      {plan.name || 'Tier'}
                    </h3>
                    {isFeatured && (
                      <span className="px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 text-[8px] font-black uppercase tracking-widest rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {plan.price || '$0'}
                    </span>
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
    <SectionContainer id={id} blockType="cta" title="Action Nexus" content={content}>
      <div className="max-w-5xl mx-auto">
        <div className="glass-card p-8 md:p-12 relative overflow-hidden bg-gradient-to-r from-white/[0.03] to-[#8B5CF6]/[0.05] border-[#8B5CF6]/20 shadow-glow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#8B5CF6]/5 blur-[100px] pointer-events-none rounded-full" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>
              <p className="text-sm text-zenith-textMuted max-w-xl leading-relaxed">
                {description}
              </p>
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
  const prose = content?.content ? parseLexicalToHTML(content.content) : '<p>Default text.</p>'

  return (
    <SectionContainer id={id} blockType="richTextSection" title="Prose Engine" content={content}>
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
    <SectionContainer id={id} blockType="gallery" title="Visual Vault" content={content}>
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
                    <ImageIcon
                      size={32}
                      className="text-[#8B5CF6]/30 group-hover:scale-110 transition-transform"
                    />
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
    <SectionContainer id={id} blockType="team" title="Architect Registry" content={content}>
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
    <SectionContainer id={id} blockType="faq" title="Knowledge Base" content={content}>
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
        {isOpen ? (
          <Minus size={14} className="text-[#8B5CF6]" />
        ) : (
          <Plus size={14} className="text-[#8B5CF6]" />
        )}
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

// ── Latest Posts Section ─────────────────────────────
function LatestPostsSection({ id, content, posts }: { id: string; content: any; posts: Post[] }) {
  const heading = content?.heading || 'Latest Transmissions'
  const subheadline = content?.subheadline || 'Insights from the architecture.'
  
  return (
    <SectionContainer id={id} blockType="latestPosts" title="Feed Registry" content={content}>
      <div className="max-w-6xl mx-auto mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{heading}</h2>
          <p className="text-sm text-zenith-textMuted mt-2">{subheadline}</p>
        </div>
        <button className="zenith-btn-secondary hidden sm:flex">
          View All <ArrowRight size={14} />
        </button>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <ArticleCard key={post._id} post={post} />
        ))}
      </div>
    </SectionContainer>
  )
}

// ── Advanced Sections ─────────────────────────────
function CustomHtmlSection({ id, content }: { id: string; content: any }) {
  return (
    <SectionContainer id={id} blockType="customHtml" title="Custom HTML" content={content}>
      <div 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: content?.htmlContent || '' }} 
      />
    </SectionContainer>
  )
}

function PageEmbedSection({ id, content }: { id: string; content: any }) {
  const [embeddedPage, setEmbeddedPage] = useState<any>(null)
  
  useEffect(() => {
    async function loadEmbed() {
      if (content?.reference) {
        try {
          const page = await getPage(content.reference, 'id')
          if (page) setEmbeddedPage(page)
        } catch (e) {
          console.error('Failed to load embedded page', e)
        }
      }
    }
    loadEmbed()
  }, [content?.reference])

  return (
    <SectionContainer id={id} blockType="pageEmbed" title="Embedded Component" content={content}>
      {embeddedPage ? (
        <SectionsRenderer sections={embeddedPage.sections} />
      ) : (
        <div className="text-center py-8 text-gray-500 text-[10px] uppercase font-black tracking-widest italic animate-pulse">Loading Reference...</div>
      )}
    </SectionContainer>
  )
}

// ── Dynamic Sections Renderer ──────────────────────
function SectionsRenderer({ sections }: { sections: any[] }) {
  if (!sections || !Array.isArray(sections)) return null

  return (
    <div className="space-y-8 pb-16">
      {sections.map((section, index) => {
        const type = section.blockType
        const data = section.content || section.blockData || section
        const id = section.id || section._id
        const key = id ? `${id}-${index}` : `section-${index}`
        switch (type) {
          case 'hero':
          case 'heroSection':
            return <HeroSection key={key} id={section.id || key} content={data} />
          case 'features':
          case 'featureGrid':
            return <FeaturesSection key={key} id={section.id || key} content={data} />
          case 'stats':
            return <StatsSection key={key} id={section.id || key} content={data} />
          case 'testimonials':
            return <TestimonialsSection key={key} id={section.id || key} content={data} />
          case 'newsletter':
            return <NewsletterSection key={key} id={section.id || key} content={data} />
          case 'pricing':
            return <PricingSection key={key} id={section.id || key} content={data} />
          case 'cta':
            return <CtaSection key={key} id={section.id || key} content={data} />
          case 'richTextSection':
            return <RichTextSection key={key} id={section.id || key} content={data} />
          case 'gallery':
            return <GallerySection key={key} id={section.id || key} content={data} />
          case 'team':
            return <TeamSection key={key} id={section.id || key} content={data} />
          case 'faq':
            return <FAQSection key={key} id={section.id || key} content={data} />
          case 'latestPosts':
            // Pass the fetched posts down to the dynamic section!
            return <div key={key} data-type="latestPosts" data-id={id} data-content={JSON.stringify(data)} />
          case 'pageTitle':
          case 'pageDescription':
          case 'navbar':
            return null
          case 'customHtml':
            return <CustomHtmlSection key={key} id={section.id || key} content={data} />
          case 'pageEmbed':
            return <PageEmbedSection key={key} id={section.id || key} content={data} />
          default:
            return (
              <div
                key={key}
                className="max-w-xl mx-auto p-4 glass-card text-center text-xs text-red-400"
              >
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

  const params = new URLSearchParams(window.location.search)
  const isPreview = params.get('preview') === 'true'
  const pageId = params.get('pageId')
  const urlSiteId = params.get('siteId')

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
            element.classList.add(
              'ring-2',
              'ring-[#8B5CF6]',
              'ring-offset-2',
              'ring-offset-[#0B0F19]',
              'scale-[1.01]'
            )
            setTimeout(() => {
              element.classList.remove(
                'ring-2',
                'ring-[#8B5CF6]',
                'ring-offset-2',
                'ring-offset-[#0B0F19]',
                'scale-[1.01]'
              )
            }, 2000)
          }
        }
      } else if (event.data?.type === 'UPDATE_SITE_ID' && event.data.siteId) {
        // Admin switched tenant � flush SDK cache and re-render
        refreshSiteId(event.data.siteId)
      }
    }
    window.addEventListener('message', handleMessage)
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'ZENITH_IFRAME_READY' }, '*')
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const loadContent = async () => {
      try {
        if (isPreview && urlSiteId) {
          cms.setSiteId(urlSiteId)
        }
        if (isPreview && pageId && pageId !== 'home') {
          // In page preview mode, fetch the specific page content initially
          const page = await getPage(pageId, 'id') // Using SDK findById / getPost equivalent
          if (page) setPageData(page)
        } else {
          // Normal mode: Fetch posts first
          const data = await getPosts({ limit: 6 })
          setPosts(data)

          // Also try loading home sections if present
          try {
            const landingPage = await getPage('home', 'slug')
            if (landingPage) {
              setPageData(landingPage)
            } else {
              console.warn('No landing page found')
            }
          } catch {
            // No home page found
          }
        }
        setError(null)
      } catch (err) {
        console.error('Failed to load home content:', err)
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [isPreview, pageId, urlSiteId])

  if (loading && isPreview) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 border-2 border-[#8B5CF6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[#8B5CF6] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-[#8B5CF6] text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Zenith Engine</div>
      </PageWrapper>
    )
  }

  // If in preview mode, and we have pageData, but no sections, just render a generic preview
  // This ensures custom collections (like Products) show their data instead of the fallback theme
  if (isPreview && pageData && (!pageData.sections || pageData.sections.length === 0)) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 text-center">
        <motion.div
          id={pageData._id || pageData.id || 'preview-json'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {pageData.title || pageData.name ? (
            <div className="bg-glass-gradient border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Generic Item Preview
              </div>
              <h1 className="text-3xl font-black text-white mb-6 text-left">
                {pageData.title || pageData.name}
              </h1>
              <div className="bg-black/40 border border-white/5 rounded-xl p-5 text-left overflow-auto space-y-4">
                {Object.entries(pageData).filter(([key]) => !key.startsWith('_')).map(([key, value]) => (
                  <div key={key} id={key} className="p-4 bg-white/5 rounded-xl border border-white/10 transition-all">
                    <div className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">{key}</div>
                    {typeof value === 'string' && value.startsWith('http') ? (
                       <img src={value} className="max-w-full h-auto rounded border border-white/10" alt={key} />
                    ) : (
                       <pre className="text-xs text-zenith-textMuted font-mono whitespace-pre-wrap">
                         {JSON.stringify(value, null, 2)}
                       </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-pulse text-zenith-textMuted text-sm font-bold">
              Empty Preview Canvas
            </div>
          )}
        </motion.div>
      </PageWrapper>
    )
  }

  // If pageData with sections is present, render sections!
  if (pageData && pageData.sections && pageData.sections.length > 0) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6">
        <div className="space-y-8 pb-16">
          {pageData.sections.map((section: any, index: number) => {
            if (section.blockType === 'latestPosts') {
              const id = section.id || section._id
              const key = id ? `${id}-${index}` : `section-${index}`
              return <LatestPostsSection key={key} id={id || key} content={section.content || section} posts={posts} />
            }
            return <SectionsRenderer key={index} sections={[section]} />
          })}
        </div>
      </PageWrapper>
    )
  }

  if (isPreview && !pageData) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 border-2 border-[#8B5CF6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[#8B5CF6] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-[#8B5CF6] text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Zenith Engine</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="max-w-6xl mx-auto px-6 py-20 text-center text-zenith-textMuted">
      <div className="p-8 glass-card border border-white/5 rounded-2xl max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-white mb-2">Home Page Not Configured</h2>
        <p className="text-sm">Please create a page with slug "home" in the CMS and add sections to it.</p>
      </div>
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
            <ArticleCard key={post._id || post.id || i} post={post} index={i} />
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

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ZENITH_DATA_UPDATE') {
        const payload = event.data.data
        if (payload) {
          setPost(payload)
          setLoading(false)
        }
      } else if (event.data?.type === 'ZENITH_PARENT_SELECT') {
        const id = event.data.id || event.data.sectionId
        
        const tryScroll = (attempts = 0) => {
          const element = id ? document.getElementById(id) : null
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.classList.add('ring-2', 'ring-[#8B5CF6]', 'ring-offset-4', 'ring-offset-[#0B0F19]', 'transition-all', 'rounded-xl')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-[#8B5CF6]', 'ring-offset-4', 'ring-offset-[#0B0F19]')
            }, 1000)
          } else if (attempts < 10) {
            setTimeout(() => tryScroll(attempts + 1), 100)
          }
        }
        
        tryScroll()
      }
    }
    window.addEventListener('message', handleMessage)
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'ZENITH_IFRAME_READY' }, '*')
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const slug = window.location.pathname.split('/post/')[1] || ''
    
    // In preview mode, we rely purely on ZENITH_DATA_UPDATE
    // We don't fetch from the API because the user might be editing unsaved changes.
    if (isPreview && slug === 'preview') {
      return
    }

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
  }, [isPreview])

  if (loading) {
    return (
      <PageWrapper className="max-w-3xl mx-auto px-6 pb-20">
        <ArticleDetailSkeleton />
      </PageWrapper>
    )
  }

  // If in preview mode, don't show a 404 until we actually fail
  if (!post && isPreview) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 border-2 border-[#8B5CF6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[#8B5CF6] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-[#8B5CF6] text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Zenith Engine</div>
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

// ── Dynamic Page ─────────────────────────
function DynamicPage() {
  const { slug } = useParams()
  const [pageData, setPageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true'

  useEffect(() => {
    if (isPreview && window.location.pathname.includes('/preview')) return

    if (!slug) {
      setLoading(false)
      return
    }

    getPage(slug, 'slug')
      .then((data) => {
        if (!data) {
          setError(true)
          return
        }
        setPageData(data)
        document.title = `${data.title} — Zenith Storefront`
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug, isPreview])

  if (loading) {
    return (
      <PageWrapper className="max-w-6xl mx-auto px-6 py-20 min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 border-2 border-[#8B5CF6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[#8B5CF6] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <div className="text-[#8B5CF6] text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Page</div>
      </PageWrapper>
    )
  }

  if (error || !pageData) {
    return (
      <PageWrapper className="max-w-3xl mx-auto px-6">
        <NotFound
          title="Page not found"
          description="This page may have been removed or the URL is incorrect."
          action={{ label: '← Back Home', to: '/' }}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper className="pb-20">
      <SectionsRenderer sections={pageData.sections} />
    </PageWrapper>
  )
}

// ── App Shell ───────────────────────────────────
export default function App() {
  const [themeState, setThemeState] = useState<'dark' | 'light'>('dark')
  const [siteConfig, setSiteConfig] = useState<any>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlSiteId = params.get('siteId')
    if (urlSiteId) {
      cms.setSiteId(urlSiteId)
    }

    // Fetch global site settings
    getGlobals('site-settings').then(data => {
      if (data) setSiteConfig(data)
    }).catch(err => console.error("Failed to load site settings", err))
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SET_THEME') {
        const theme = event.data.theme
        setThemeState(theme)
      } else if (event.data?.type === 'UPDATE_SITE_ID' && event.data.siteId) {
        cms.setSiteId(event.data.siteId)
        getGlobals('site-settings').then(data => data && setSiteConfig(data))
      } else if (event.data?.type === 'ZENITH_DATA_UPDATE' && event.data.slug === 'site-settings') {
        // Live preview of site settings
        setSiteConfig(event.data.data)
      }
    }
    window.addEventListener('message', handleMessage)
    if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'ZENITH_IFRAME_READY' }, '*')
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
      <div
        className={`min-h-screen relative transition-colors duration-300 ${
          themeState === 'dark'
            ? 'bg-zenith-base bg-zenith-gradient text-white'
            : 'bg-[#fafafa] text-gray-900'
        }`}
      >
        {/* Radial noise overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <Header siteName={siteConfig?.siteName} headerLinks={siteConfig?.headerLinks} tagline={siteConfig?.tagline} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/post/:slug" element={<PostPage />} />
            <Route path="/:slug" element={<DynamicPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
        <Footer siteName={siteConfig?.siteName} description={siteConfig?.description} socialLinks={siteConfig?.socialLinks} footerLinks={siteConfig?.footerLinks} />

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
