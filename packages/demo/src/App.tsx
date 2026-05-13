import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  ShoppingBag, 
  ArrowRight, 
  Zap, 
  Shield, 
  Star,
  Layout,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Quote,
  HelpCircle,
  CreditCard,
  TrendingUp
} from 'lucide-react';

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

// API Configuration
const API_BASE = 'http://localhost:3000/api/v1';

const SkeletonCard = () => (
  <div className="glass-card animate-pulse">
    <div className="aspect-[4/5] bg-white/5 rounded-2xl mb-6" />
    <div className="h-6 w-2/3 bg-white/5 rounded mb-3" />
    <div className="h-4 w-full bg-white/5 rounded mb-2" />
    <div className="h-4 w-1/2 bg-white/5 rounded mb-8" />
    <div className="h-12 w-full bg-white/5 rounded-2xl" />
  </div>
);

const ZenithDemo = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [landingPage, setLandingPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Products
      const productsRes = await axios.get(`${API_BASE}/products?filter[_status][eq]=published`);
      setProducts(productsRes.data.data);

      // Fetch Focused Products for "Featured" section
      const focusedRes = await axios.get(`${API_BASE}/products?filter[isFocused][eq]=true&filter[_status][eq]=published`);
      setFeaturedProducts(focusedRes.data.data || []);

      // Fetch Landing Page (Singleton)
      const landingRes = await axios.get(`${API_BASE}/landing-page`);
      setLandingPage(landingRes.data.data);
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Could not connect to Zenith CMS. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set initial theme class
    document.documentElement.classList.toggle('light', theme === 'light');

    // Listen for live updates from the CMS
    const channel = new BroadcastChannel('zenith-sync');
    channel.onmessage = (event) => {
      if (event.data.type === 'UPDATE') {
        console.log('Zenith Sync: Refreshing data...');
        fetchData();
      }
    };

    // Parent-to-Iframe Selection Sync & Live Data Update
    const handleParentMessage = (event: MessageEvent) => {
      if (event.data.type === 'SET_THEME') {
        setTheme(event.data.theme);
        document.documentElement.classList.toggle('light', event.data.theme === 'light');
      }
      if (event.data.type === 'ZENITH_PARENT_SELECT') {
        const id = event.data.id;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-8', 'ring-offset-black');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-8', 'ring-offset-black');
          }, 2000);
        }
      }

      if (event.data.type === 'ZENITH_DATA_UPDATE') {
        console.log('Zenith Live Preview: Updating state...');
        setLandingPage(event.data.data);
      }
    };

    window.addEventListener('message', handleParentMessage);

    return () => {
      channel.close();
      window.removeEventListener('message', handleParentMessage);
    };
  }, [theme]);

  // Bi-Directional Selection Hook
  const handleSectionClick = (id: string) => {
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
    if (!isPreview) return;
    
    window.parent.postMessage({ 
      type: 'ZENITH_SECTION_SELECT', 
      id: id 
    }, '*');
  };

  const addToCart = () => {
    setCartCount(prev => prev + 1);
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-500", theme === 'dark' ? "bg-[#030303] text-white" : "bg-white text-black")}>
      {/* Navbar */}
      <nav className={cn("fixed top-0 w-full z-50 border-b glass px-6 md:px-12 py-4", theme === 'dark' ? "border-white/5" : "border-black/5")}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black italic", theme === 'dark' ? "bg-white text-black" : "bg-black text-white")}>Z</div>
            <span className="font-bold tracking-tighter text-xl uppercase">Zenith Studio</span>
          </div>
          
          <div className={cn("hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest", theme === 'dark' ? "text-white/40" : "text-black/40")}>
            <a href="#products" className="hover:text-white transition-colors">Collection</a>
            <a href="#features" className="hover:text-white transition-colors">Technology</a>
            <a href="http://localhost:5175" target="_blank" className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
              Admin CMS <ExternalLink size={10} />
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button className={cn("relative p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/5")}>
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={fetchData} className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5")}>
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col items-center justify-center pt-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] -z-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Zenith Headless Pipeline Live
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-7xl md:text-[10rem] font-black tracking-tighter text-gradient leading-[0.85] text-center mb-8"
        >
          {landingPage?.title || 'ZENITH NEXT GEN'}
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn("max-w-2xl text-lg md:text-xl leading-relaxed text-center mb-12", theme === 'dark' ? "text-white/40" : "text-black/40")}
          dangerouslySetInnerHTML={{ __html: landingPage?.heroDescription || 'The future of headless commerce. Powered by AI. Controlled by you. Fast, secure, and infinitely scalable.' }}
        />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-6"
        >
          <a href="#products" className="px-10 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            Explore Collection
          </a>
          <a href="http://localhost:3000/api-docs" target="_blank" className="px-10 py-4 glass rounded-full font-bold text-lg hover:bg-white/5 transition-all flex items-center gap-2">
            API Reference <ArrowRight size={18} />
          </a>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-24 space-y-64">
        
        {/* Featured Section (Focused items from CMS) */}
        {featuredProducts.length > 0 && (
          <section id="featured" className="space-y-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_#10b981]">
                  <Star size={24} className="text-black fill-black" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tight uppercase italic">Curated Selection</h2>
                  <p className="text-emerald-400/60 font-bold text-xs uppercase tracking-widest mt-1">Focused by Zenith Administrators</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredProducts.slice(0, 2).map((product, idx) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="relative group h-[500px] rounded-[3rem] overflow-hidden border border-emerald-500/20"
                >
                  <img 
                    src={product.gallery?.[0]?.url?.startsWith('http') ? product.gallery[0].url : `http://localhost:3000${product.gallery?.[0]?.url}`} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                    alt={product.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  <div className="absolute bottom-10 left-10 right-10">
                    <div className="flex items-center gap-3 mb-4">
                       <span className="bg-emerald-500 text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Featured</span>
                       <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest italic">{product.category}</span>
                    </div>
                    <h3 className="text-5xl font-black mb-4 tracking-tighter">{product.title}</h3>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-black text-emerald-400">${product.price}</div>
                      <button onClick={addToCart} className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-all">Quick Add</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Products Section */}
        <section id="products" className="space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-12">
            <div>
              <h2 className="text-5xl font-black tracking-tight mb-3">Latest Drops</h2>
              <p className="text-white/30 font-medium">Real-time inventory from your Zenith CMS database</p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60">
                {products.length} Items Available
              </div>
            </div>
          </div>

          {error && (
            <div className="p-8 glass rounded-3xl border-emerald-500/20 text-center space-y-4">
              <p className="text-white/60 font-medium">{error}</p>
              <button onClick={fetchData} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-all">Retry Connection</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              products.map((product, idx) => (
                <motion.div
                  key={product._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card group"
                >
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/[0.03] mb-6 relative">
                    <img 
                      src={product.gallery?.[0]?.url?.startsWith('http') ? product.gallery[0].url : `http://localhost:3000${product.gallery?.[0]?.url}`} 
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl text-sm font-black">
                      ${product.price}
                    </div>
                    {product.category && (
                      <div className="absolute top-4 left-4 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        {product.category}
                      </div>
                    )}
                  </div>
                  <h3 className="text-3xl font-black mb-3 group-hover:text-emerald-400 transition-colors tracking-tight">{product.title}</h3>
                  <div 
                    className="text-white/40 text-sm line-clamp-2 mb-8 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: product.description || '' }}
                  />
                  <button 
                    onClick={addToCart}
                    className="w-full py-5 rounded-2xl bg-white/[0.03] border border-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-48">
          {landingPage?.sections?.map((section: any, idx: number) => {
            const data = section.content || section.blockData || section;
            const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

            const sectionWrapperProps = {
              onClick: () => handleSectionClick(section.id),
              className: isPreview ? "cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all rounded-[4rem]" : ""
            };

            if (section.blockType === 'testimonials') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("space-y-16", sectionWrapperProps.className)}>
                  <div className="text-center">
                    <h2 className="text-5xl font-black tracking-tight mb-4 uppercase italic">{data.heading}</h2>
                    <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">What our community says</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {data.items?.map((item: any, iidx: number) => (
                      <div key={iidx} className="glass p-12 rounded-[3rem] border border-white/5 relative group hover:border-emerald-500/20 transition-all">
                        <Quote className="absolute top-8 right-8 text-white/5 group-hover:text-emerald-500/20 transition-colors" size={64} />
                        <p className="text-xl md:text-2xl font-medium text-white/70 italic mb-10 leading-relaxed">"{item.quote}"</p>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/10">
                            {item.avatar && (
                              <img 
                                src={item.avatar.url?.startsWith('http') ? item.avatar.url : `http://localhost:3000${item.avatar.url}`} 
                                className="w-full h-full object-cover"
                                alt={item.author}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-lg">{item.author}</div>
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{item.role}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.blockType === 'pricing') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("space-y-24", sectionWrapperProps.className)}>
                  <div className="text-center">
                    <h2 className="text-7xl font-black tracking-tighter text-gradient mb-4">{data.heading}</h2>
                    <p className="text-white/30 text-lg font-medium">Simple, transparent pricing for any scale.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {data.plans?.map((plan: any, pidx: number) => (
                      <div key={pidx} className={`glass p-12 rounded-[3.5rem] border ${plan.isPopular ? 'border-emerald-500/50 bg-emerald-500/[0.02]' : 'border-white/5'} relative flex flex-col`}>
                        {plan.isPopular && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Most Popular</div>
                        )}
                        <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                        <div className="text-5xl font-black mb-10 tracking-tighter">
                          {plan.price}
                        </div>
                        <div className="space-y-4 mb-12 flex-grow">
                          {plan.features?.split('\n').map((f: string, fidx: number) => (
                            <div key={fidx} className="flex items-center gap-3 text-white/60 font-medium">
                              <Check size={16} className="text-emerald-500" />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                        <button className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${plan.isPopular ? 'bg-emerald-500 text-black hover:scale-105' : 'bg-white/5 hover:bg-white/10'}`}>
                          {plan.buttonText || 'Select Plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.blockType === 'faq') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("max-w-4xl mx-auto space-y-16", sectionWrapperProps.className)}>
                   <div className="text-center">
                    <h2 className="text-5xl font-black tracking-tight mb-4 uppercase italic">{data.heading}</h2>
                    <p className="text-white/30 font-bold text-xs uppercase tracking-widest">Common questions answered</p>
                  </div>
                  <div className="space-y-4">
                    {data.questions?.map((q: any, qidx: number) => (
                      <details key={qidx} className="group glass rounded-3xl border border-white/5 open:border-emerald-500/20 overflow-hidden">
                        <summary className="p-8 cursor-pointer flex items-center justify-between list-none">
                          <span className="text-xl font-bold tracking-tight">{q.question}</span>
                          <Plus className="text-emerald-500 group-open:rotate-45 transition-transform" />
                        </summary>
                        <div className="px-8 pb-8 text-white/40 leading-relaxed font-medium">
                          {q.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.blockType === 'cta') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("glass-card accent-gradient text-black text-center py-32 relative overflow-hidden rounded-[4rem]", sectionWrapperProps.className)}>
                   <div className="relative z-10">
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">{data.title}</h2>
                    <p className="text-black/60 text-xl md:text-2xl font-bold mb-14 max-w-2xl mx-auto tracking-tight">{data.description}</p>
                    <a href={data.link || '#'} className="px-14 py-5 bg-black text-white rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl inline-block">
                      {data.buttonText || 'Get Started'}
                    </a>
                  </div>
                  <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/30 rounded-full blur-[120px]" />
                  <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-black/10 rounded-full blur-[120px]" />
                </div>
              );
            }

            if (section.blockType === 'stats') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("grid grid-cols-2 md:grid-cols-4 gap-8", sectionWrapperProps.className)}>
                  {data.items?.map((stat: any, sidx: number) => (
                    <div key={sidx} className="glass p-10 rounded-[2.5rem] border border-white/5 text-center group hover:border-emerald-500/20 transition-all">
                      <div className="text-5xl font-black text-emerald-400 mb-2 tracking-tighter group-hover:scale-110 transition-transform">{stat.value}</div>
                      <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              );
            }

            if (section.blockType === 'hero') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("relative py-48 rounded-[4rem] overflow-hidden border border-white/10 glass px-12 text-center group", sectionWrapperProps.className)}>
                   {data?.backgroundImage && (
                     <img 
                       src={data.backgroundImage.url?.startsWith('http') ? data.backgroundImage.url : `http://localhost:3000${data.backgroundImage.url}`} 
                       className="absolute inset-0 w-full h-full object-cover opacity-20 -z-10 transition-transform duration-1000 group-hover:scale-105"
                       alt=""
                     />
                   )}
                   <div className="max-w-4xl mx-auto">
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-gradient leading-[0.9]">{data?.headline || 'Zenith Engine'}</h2>
                    <p className="text-xl md:text-2xl text-white/40 mb-12 leading-relaxed font-medium">{data?.subheadline || 'High-performance modular architecture.'}</p>
                    {data?.callToAction && (
                      <button className="px-14 py-5 bg-white text-black rounded-full font-black text-lg hover:scale-105 transition-all shadow-2xl">
                        {data.callToAction}
                      </button>
                    )}
                   </div>
                </div>
              );
            }

            if (section.blockType === 'features') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("space-y-24", sectionWrapperProps.className)}>
                  <div className="text-center space-y-4">
                    <h2 className="text-6xl font-black tracking-tight text-gradient">{data?.heading || 'Core Features'}</h2>
                    <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full shadow-[0_0_20px_#10b981]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                    {data?.featureList?.map((feat: any, fidx: number) => (
                      <div key={fidx} className="flex flex-col items-center text-center group">
                        <div className="w-24 h-24 mb-10 rounded-[2.5rem] glass flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/50 transition-all duration-500 group-hover:-translate-y-2">
                          {feat?.icon && (
                            <img 
                              src={feat.icon.url?.startsWith('http') ? feat.icon.url : `http://localhost:3000${feat.icon.url}`} 
                              className="w-full h-full object-cover absolute inset-0 opacity-20 group-hover:opacity-60 transition-opacity"
                              alt=""
                            />
                          )}
                          <div className="z-10 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_30px_#10b981] group-hover:scale-125 transition-transform" />
                        </div>
                        <h3 className="text-3xl font-black mb-4 tracking-tight">{feat?.title || 'Feature'}</h3>
                        <p className="text-white/40 leading-relaxed font-medium">{feat?.description || 'Feature description.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.blockType === 'richTextSection') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("glass rounded-[4rem] p-12 md:p-32 border border-white/5 relative overflow-hidden", sectionWrapperProps.className)}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]" />
                  <div 
                    className="prose prose-invert prose-2xl max-w-none prose-headings:text-gradient prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-p:text-white/60"
                    dangerouslySetInnerHTML={{ __html: data?.content || '' }}
                  />
                </div>
              );
            }

            if (section.blockType === 'gallery') {
              return (
                <div key={idx} id={section.id} {...sectionWrapperProps} className={cn("space-y-16", sectionWrapperProps.className)}>
                   <div className="text-center">
                    <h2 className="text-5xl font-black tracking-tight mb-4 uppercase italic">{data.heading}</h2>
                    <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Visual Archive</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.items?.map((item: any, iidx: number) => (
                      <div key={iidx} className="group relative aspect-square rounded-[2rem] overflow-hidden border border-white/5 bg-white/5">
                        {item.image && (
                          <img 
                            src={item.image.url?.startsWith('http') ? item.image.url : `http://localhost:3000${item.image.url}`} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt={item.caption}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">{item.caption || 'Untitled_Entry'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </section>

        {/* Features Static */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-32">
          {[
            { icon: Zap, title: 'Extreme Performance', desc: 'Zenith leverages MongoDB indexing and smart caching to deliver content at the speed of light.' },
            { icon: Shield, title: 'Enterprise Security', desc: 'Built-in RBAC, JWT encryption, and protected routes ensure your data remains your data.' },
            { icon: Layout, title: 'Modular Freedom', desc: 'Design without limits. Our block-based architecture gives you full control over page structure.' },
          ].map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-3xl p-10 space-y-6 hover:bg-white/[0.05] transition-all border-white/5"
            >
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Icon size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">{title}</h3>
              <p className="text-white/30 leading-relaxed font-medium">{desc}</p>
            </motion.div>
          ))}
        </section>

        {/* CTA Banner */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card accent-gradient text-black text-center py-32 relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9]">Ready to launch<br/>your vision?</h2>
            <p className="text-black/60 text-xl md:text-2xl font-bold mb-14 max-w-2xl mx-auto tracking-tight">Join thousands of developers building the next generation of digital experiences on Zenith.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <button className="px-14 py-5 bg-black text-white rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl">Start Building</button>
              <button className="px-14 py-5 border-2 border-black text-black rounded-full font-black text-xl hover:bg-black/10 transition-all">View Github</button>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/30 rounded-full blur-[120px]" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-black/10 rounded-full blur-[120px]" />
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-6 h-6 bg-white text-black rounded flex items-center justify-center font-black italic text-xs">Z</div>
              <span className="font-bold tracking-tighter uppercase">Zenith CMS</span>
            </div>
            <p className="text-white/20 text-xs font-bold uppercase tracking-[0.3em]">The Headless Standard</p>
          </div>
          
          <div className="flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Contact</a>
          </div>

          <div className="text-white/10 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500/40 rounded-full" />
            &copy; 2026 Zenith Systems Group
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ZenithDemo;
