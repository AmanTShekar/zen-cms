import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Save, 
  ChevronLeft, 
  Layers, 
  Star, 
  Grid, 
  CreditCard, 
  Zap, 
  Box, 
  Trash2, 
  RefreshCw, 
  Search, 
  Globe, 
  Users, 
  MessageSquare, 
  BarChart4, 
  FileText, 
  Mail, 
  Layout, 
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sun,
  Moon,
  Maximize,
  Minimize,
  X,
  Cpu,
  Grip,
  PanelLeft,
  PanelRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import RichTextEditor from '../components/RichTextEditor';
import type { EditorMode } from '../components/RichTextEditor';
import MediaPicker from '../components/MediaPicker';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Custom_Scrollbar_Architecture
const GLOBAL_EDITOR_STYLES = `
  .custom-editor-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-editor-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-editor-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.1);
    border-radius: 0;
    transition: all 0.3s ease;
  }
  .custom-editor-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
  }
  
  /* Rich_Text_Padding_Optimization */
  .editor-content-area p {
    margin-bottom: 0.25rem;
    line-height: 1.5;
  }
  
  /* Theme_Adaptive_Editor_Colors */
  .dark .ql-editor { color: #fff; }
  .light .ql-editor { color: #000; }
  .dark .ql-snow .ql-stroke { stroke: #fff; }
  .light .ql-snow .ql-stroke { stroke: #000; }
`;

const humanize = (str: string) => {
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace('Cta', 'Call to Action')
    .replace('Url', 'URL')
    .trim();
};

// interface Section {
//   id: string;
//   blockType: string;
//   title: string;
//   content: unknown;
//   align?: 'left' | 'center' | 'right';
// }

const BLOCK_LIBRARY = [
  { type: 'hero', icon: Star, title: 'Hero Module', description: 'Impactful entry with background & CTA', defaultContent: { headline: 'Future Engine', subheadline: 'Modular architecture for visionaries.', callToAction: 'Launch Protocol', backgroundImage: null } },
  { type: 'features', icon: Grid, title: 'Neural Features', description: 'Grid-based feature highlighting', defaultContent: { heading: 'Core Capabilities', featureList: [{ title: 'Velocity', description: 'Near-zero latency lookups.' }, { title: 'Security', description: 'End-to-end encryption.' }] } },
  { type: 'stats', icon: BarChart4, title: 'Metric Rails', description: 'Data-driven performance metrics', defaultContent: { items: [{ label: 'Uptime', value: '99.9%' }, { label: 'Latency', value: '12ms' }] } },
  { type: 'testimonials', icon: MessageSquare, title: 'Audience Proof', description: 'Community validation & quotes', defaultContent: { heading: 'Global Voices', items: [{ quote: 'Zenith changed the scale of our deployment.', author: 'Alex_Vander', role: 'Architect' }] } },
  { type: 'newsletter', icon: Mail, title: 'Signal Capture', description: 'Direct engagement & list growth', defaultContent: { title: 'Join The Network', description: 'Stay updated with the latest manifests.', buttonText: 'Subscribe' } },
  { type: 'pricing', icon: CreditCard, title: 'Revenue Matrix', description: 'Tier-based pricing structures', defaultContent: { heading: 'Parametric Plans', plans: [{ name: 'Enterprise', price: '$999/mo', features: 'Unlimited Nodes' }] } },
  { type: 'cta', icon: Zap, title: 'Action Nexus', description: 'High-conversion banner', defaultContent: { title: 'Ready to scale?', description: 'Join the next generation of architects.', buttonText: 'Connect Now' } },
  { type: 'richTextSection', icon: FileText, title: 'Prose Engine', description: 'Rich-text content & articles', defaultContent: { content: '<h2>Deep Architecture</h2><p>Refined prose for complex narratives.</p>' } },
  { type: 'gallery', icon: Layout, title: 'Visual Vault', description: 'Grid of images or portfolio items', defaultContent: { heading: 'Project Exhibits', items: [{ image: null, caption: 'System Node 01' }] } },
  { type: 'team', icon: Users, title: 'Architect Registry', description: 'Showcase your core team & collaborators', defaultContent: { heading: 'System Architects', members: [{ name: 'Elena Kors', role: 'Lead Developer', bio: 'Neural network specialist.' }] } },
  { type: 'faq', icon: MessageSquare, title: 'Knowledge Base', description: 'Collapsible Q&A section', defaultContent: { heading: 'Protocol FAQ', items: [{ question: 'How secure is Zenith?', answer: 'AES-256 encryption at rest.' }] } },
];

const SpatialEditor: React.FC<{ isGlobal?: boolean }> = ({ isGlobal }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [activeRightTab, setActiveRightTab] = useState<'preview' | 'history'>('preview');
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [seoOpen, setSeoOpen] = useState(false);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);
  const [blockSearch, setBlockSearch] = useState('');
  const [injectionIndex, setInjectionIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(300);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);

  const startResizing = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setResizingSide(side);
  }, []);

  const stopResizing = useCallback(() => {
    setResizingSide(null);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (resizingSide === 'left') {
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 500) setLeftSidebarWidth(newWidth);
    } else if (resizingSide === 'right') {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 200 && newWidth <= 700) setRightSidebarWidth(newWidth);
    }
  }, [resizingSide]);

  useEffect(() => {
    if (resizingSide) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resizingSide, resize, stopResizing]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_THEME', theme }, '*');
    }
  }, [theme]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = isGlobal ? await api.get(`/globals/landing-page`) : await api.get(`/pages/${id}`);
let globalNodeCounter = 0;

        const normalizedSections = (res.data.data.sections || []).map((s: Record<string, unknown>) => ({
          ...s,
          id: s.id || `node_${globalNodeCounter++}`,
          content: s.content || s.blockData || {}
        }));
        setData({ ...res.data.data, sections: normalizedSections });
        if (normalizedSections.length > 0) setActiveSection('root');
        const collection = isGlobal ? 'globals' : 'pages';
        const docId = isGlobal ? 'landing-page' : id;
        const historyRes = await api.get(`/versions/${collection}/${docId}`);
        setHistory(historyRes.data.data || []);
      } catch {
        toast.error('Failed to sync editor');
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    fetchData();
  }, [id, isGlobal]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isGlobal) await api.patch(`/globals/landing-page`, data);
      else await api.patch(`/pages/${id}`, data);
      toast.success('Changes saved successfully');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (blockType: string) => {
    const block = BLOCK_LIBRARY.find(b => b.type === blockType);
    if (!block) return;
    const newSection = {
      id: `block_${globalNodeCounter++}`,
      blockType: block.type,
      title: block.title,
      content: { ...block.defaultContent }
    };
    setData((prev: Record<string, unknown>) => {
      const sections = Array.isArray(prev.sections) ? [...prev.sections] : [];
      if (injectionIndex !== null) sections.splice(injectionIndex, 0, newSection);
      else sections.push(newSection);
      return { ...prev, sections };
    });
    setActiveSection(newSection.id);
    setBlockPickerOpen(false);
    setBlockSearch('');
    setInjectionIndex(null);
    toast.success(`Section added: ${blockType.toUpperCase()}`, { icon: '⚡' });
  };

  const updateAlign = (sectionId: string, align: 'left' | 'center' | 'right') => {
    const newSections = [...data.sections];
    const idx = newSections.findIndex(s => s.id === sectionId);
    if (idx !== -1) {
      newSections[idx].align = align;
      setData({ ...data, sections: newSections });
    }
  };

  const removeSection = (id: string) => {
     setData((prev: Record<string, unknown>) => ({ ...prev, sections: Array.isArray(prev.sections) ? prev.sections.filter((s: Record<string, unknown>) => s.id !== id) : [] }));
     if (activeSection === id) setActiveSection(null);
     toast.error('Section removed');
  };

  const handleRestore = async (versionId: string) => {
    const collection = isGlobal ? 'globals' : 'pages';
    const docId = isGlobal ? 'landing-page' : id;
    setSaving(true);
    try {
      const res = await api.post(`/versions/${collection}/${docId}/${versionId}/restore`);
      setData(res.data.data.document);
      toast.success('Version restored');
    } catch {
      toast.error('Restore failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = (newSections: Record<string, unknown>[]) => {
    setData((prev: Record<string, unknown>) => ({ ...prev, sections: newSections }));
  };

  const getSmartMode = (key: string): EditorMode => {
    const k = key.toLowerCase();
    if (k.includes('title') || k.includes('headline') || k.includes('heading')) return 'inline';
    if (k.includes('cta') || k.includes('button') || k.includes('label')) return 'micro';
    if (k.includes('content') || k.includes('description') || k.includes('bio')) return 'full';
    return 'inline';
  };

  const filteredBlocks = BLOCK_LIBRARY.filter(b => 
    b.title.toLowerCase().includes(blockSearch.toLowerCase()) || 
    b.description.toLowerCase().includes(blockSearch.toLowerCase())
  );

  if (loading) return (
    <div className={cn("h-screen w-full flex flex-col items-center justify-center gap-8", theme === 'dark' ? "bg-black" : "bg-[#fafafa]")}>
      <Cpu size={48} className="text-indigo-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 animate-pulse italic">Initializing Canvas...</p>
    </div>
  );

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden transition-colors duration-500", theme === 'dark' ? "bg-black text-white" : "bg-white text-black")}>
      <style>{GLOBAL_EDITOR_STYLES}</style>
      <header className={cn("h-16 border-b flex items-center justify-between px-8 z-[100] backdrop-blur-3xl transition-all", theme === 'dark' ? "bg-black/80 border-white/5" : "bg-white/80 border-gray-100 shadow-sm")}>
        <div className="flex items-center gap-8">
           <button onClick={() => navigate(-1)} className="p-2 hover:text-indigo-500 transition-colors bg-white/5 rounded-none border border-white/5"><ChevronLeft size={20} /></button>
            <div className="flex flex-col">
               <span className="text-[12px] font-black tracking-[0.5em] text-indigo-500 uppercase italic leading-none">Zenith Editor</span>
               <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Build v1.0.0</span>
            </div>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-1.5">
               <button 
                 onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                 className={cn("w-10 h-10 rounded-none flex items-center justify-center transition-all border", leftPanelOpen ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : (theme === 'dark' ? "bg-white/5 border-white/5 text-gray-500 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-400 hover:text-black"))}
               >
                  <PanelLeft size={18} />
               </button>
               <button 
                 onClick={toggleTheme}
                 className={cn("w-10 h-10 rounded-none flex items-center justify-center transition-all border", theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-500 hover:text-black")}
               >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
               </button>
               <button 
                 onClick={() => setRightPanelOpen(!rightPanelOpen)}
                 className={cn("w-10 h-10 rounded-none flex items-center justify-center transition-all border", rightPanelOpen ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : (theme === 'dark' ? "bg-white/5 border-white/5 text-gray-500 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-400 hover:text-black"))}
               >
                  <PanelRight size={18} />
               </button>
           </div>
           <div className={cn("flex items-center gap-1 p-1 rounded-none border", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200")}>
              <button onClick={() => setViewMode('visual')} className={cn("px-4 py-1.5 rounded-none text-[10px] font-black uppercase italic transition-all", viewMode === 'visual' ? (theme === 'dark' ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg") : "text-gray-500 hover:text-indigo-500")}>Visual</button>
              <button onClick={() => setViewMode('code')} className={cn("px-4 py-1.5 rounded-none text-[10px] font-black uppercase italic transition-all", viewMode === 'code' ? (theme === 'dark' ? "bg-white text-black shadow-lg" : "bg-black text-white shadow-lg") : "text-gray-500 hover:text-indigo-500")}>Code</button>
           </div>
           
           <button onClick={() => setSeoOpen(true)} className={cn("flex items-center gap-2 px-4 py-2 rounded-none border transition-all text-[10px] font-black uppercase italic", seoOpen ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : (theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400 hover:text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-black shadow-sm"))}>
              <Globe size={16} /> SEO
           </button>

            <button onClick={handleSave} disabled={saving} className="flex items-center gap-3 px-6 py-2 rounded-none text-[10px] font-black uppercase bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:bg-indigo-500 transition-all active:scale-95">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
            </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence initial={false}>
          {leftPanelOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: leftSidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={cn("border-r flex flex-col z-50 overflow-hidden transition-[width] duration-75 ease-out shrink-0 relative group/sidebar", theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-200 shadow-xl")}
            >
               <div onMouseDown={startResizing('left')} className={cn("absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors", resizingSide === 'left' ? "bg-indigo-500 shadow-[0_0_15px_#6366f1]" : "bg-transparent hover:bg-indigo-500/50")} />
               <div className={cn("p-4 flex items-center justify-between border-b", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                  <div className="flex items-center gap-3">
                     <div className="w-6 h-6 rounded-none bg-indigo-600 flex items-center justify-center text-white"><Layers size={12} /></div>
                     <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] italic", theme === 'dark' ? "text-white" : "text-black")}>Layer Tree</span>
                  </div>
                 <button onClick={() => { setInjectionIndex(0); setBlockPickerOpen(true); }} className={cn("w-6 h-6 rounded-none flex items-center justify-center transition-all shadow-sm border", theme === 'dark' ? "bg-white/5 border-white/5 text-white hover:bg-indigo-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-indigo-600 hover:text-white")}><Plus size={14} /></button>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar px-2 space-y-4 pt-4 custom-editor-scrollbar">
                   <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                         <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] italic opacity-50">Editor Root</span>
                      </div>
                      <button 
                        onClick={() => { setActiveSection('root'); document.getElementById('document-kernel')?.scrollIntoView({ behavior: 'smooth' }); }}
                        className={cn("w-full flex items-center gap-3 p-3 rounded-none border transition-all duration-200", activeSection === 'root' ? (theme === 'dark' ? "bg-white border-white text-black" : "bg-black border-black text-white") : (theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"))}
                      >
                        <Cpu size={12} className={activeSection === 'root' ? "" : "text-indigo-500"} />
                        <span className="text-[10px] font-black uppercase italic tracking-tight">Main Content</span>
                      </button>
                   </div>

                    <div className="space-y-2 pb-20">
                       <div className="flex items-center justify-between px-2">
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] italic opacity-50">Page Sections</span>
                          <span className="text-[8px] font-black text-white italic opacity-10">{data?.sections?.length || 0} Layers</span>
                       </div>
                      <Reorder.Group axis="y" values={data?.sections || []} onReorder={handleReorder} className="space-y-1">
                         {data?.sections?.map((section: Record<string, unknown>) => (
                            <Reorder.Item key={section.id} value={section} className="relative group">
                               <button 
                                 onClick={() => setActiveSection(section.id)}
                                 className={cn("w-full flex items-center gap-3 p-2.5 rounded-none border transition-all duration-200", activeSection === section.id ? (theme === 'dark' ? "bg-white border-white text-black shadow-lg" : "bg-black border-black text-white shadow-lg") : (theme === 'dark' ? "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"))}
                               >
                                 <div className={cn("w-6 h-6 rounded-none flex items-center justify-center shrink-0", activeSection === section.id ? (theme === 'dark' ? "bg-black/10 text-black" : "bg-white/10 text-white") : (theme === 'dark' ? "bg-white/5 text-indigo-500" : "bg-gray-100 text-indigo-600"))}>
                                    {(() => {
                                       const block = BLOCK_LIBRARY.find(b => b.type === section.blockType);
                                       const Icon = block?.icon || Box;
                                       return <Icon size={12} />;
                                    })()}
                                 </div>
                                 <div className="flex-1 text-left overflow-hidden">
                                    <span className="text-[9px] font-black uppercase italic tracking-tight block truncate">{section.title || section.blockType}</span>
                                 </div>
                                 <GripVertical size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                               </button>
                            </Reorder.Item>
                         ))}
                      </Reorder.Group>
                   </div>
               </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className={cn("flex-1 relative flex flex-col overflow-hidden transition-colors", theme === 'dark' ? "bg-[#030303]" : "bg-gray-50")}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
             <div className="absolute inset-0" style={{ backgroundImage: theme === 'dark' ? 'radial-gradient(circle, white 1px, transparent 1px)' : 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          </div>

          <div className="flex-1 overflow-y-auto px-10 pt-10 pb-20 no-scrollbar scroll-smooth relative z-10 custom-editor-scrollbar">
             <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col">
                {viewMode === 'visual' ? (
                   <div className="flex-1 space-y-12">
                   {/* Document_Kernel (Root Fields) */}
                   <div id="document-kernel" className={cn("space-y-6 transition-all duration-500", data.align === 'center' && "text-center", data.align === 'right' && "text-right")}>
                      <div className="flex items-center justify-between">
                         <div className={cn("flex items-center gap-0.5 p-0.5 rounded-none border", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200")}>
                            {(['left', 'center', 'right'] as const).map(align => (
                              <button 
                                key={align} 
                                onClick={() => setData({ ...data, align })} 
                                className={cn("p-1 transition-all", (data.align === align || (!data.align && align === 'left')) ? (theme === 'dark' ? "bg-indigo-500/20 text-indigo-400" : "bg-white text-black shadow-sm") : "text-gray-400 hover:text-indigo-500")}
                              >
                                {align === 'left' && <AlignLeft size={12} />}
                                {align === 'center' && <AlignCenter size={12} />}
                                {align === 'right' && <AlignRight size={12} />}
                              </button>
                            ))}
                         </div>
                      </div>
                      
                      <div className="relative group/title">
                         <RichTextEditor 
                           mode="heading"
                           value={data.title || ''}
                           onChange={(val) => setData({ ...data, title: val })}
                           placeholder="Enter Page Title..."
                         />
                      </div>

                       <div className="space-y-4">
                          <div className={cn("min-h-[200px] transition-all", theme === 'dark' ? "bg-white/[0.01]" : "bg-gray-50 shadow-inner")}>
                            <RichTextEditor mode="full" value={data.heroDescription || ''} onChange={(val) => setData({ ...data, heroDescription: val })} />
                         </div>
                      </div>
                   </div>

                   {/* Modular Sections */}
                   <Reorder.Group axis="y" values={data?.sections || []} onReorder={handleReorder} className="space-y-8">
                      {data?.sections?.map((section: Record<string, unknown>, idx: number) => (
                         <Reorder.Item key={section.id} value={section} className="relative group/item">
                            <div className="relative h-4 group/portal -mt-2">
                               <button onClick={() => { setInjectionIndex(idx); setBlockPickerOpen(true); }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/portal:opacity-100 transition-all z-20">
                                  <div className={cn("px-4 py-1 rounded-none border backdrop-blur-xl text-[8px] font-black uppercase italic flex items-center gap-2", theme === 'dark' ? "bg-black/80 border-white/10 text-white" : "bg-white/80 border-gray-200 text-black")}>
                                     <Plus size={10} className="text-indigo-500" /> Insert Section
                                  </div>
                               </button>
                            </div>

                            <div id={`section-${section.id}`} className={cn("p-6 rounded-none border transition-all duration-500 relative group/section", activeSection === section.id ? (theme === 'dark' ? "bg-white/[0.04] border-indigo-500/40" : "bg-gray-50 border-indigo-500/40") : (theme === 'dark' ? "bg-white/[0.01] border-white/5" : "bg-white border-gray-100"))}>
                               <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-4">
                                     <div className={cn("w-8 h-8 rounded-none border flex items-center justify-center cursor-grab active:cursor-grabbing", theme === 'dark' ? "bg-white/5 border-white/10 text-indigo-400" : "bg-gray-100 border-gray-200 text-indigo-600")}><Grip size={14} /></div>
                                     <div>
                                        <h2 className={cn("text-xl font-black italic uppercase tracking-tighter", theme === 'dark' ? "text-white" : "text-black")}>{section.title}</h2>
                                        <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-[0.4em] block italic">{section.blockType}</span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <div className={cn("flex items-center gap-0.5 p-0.5 rounded-none border", theme === 'dark' ? "bg-black/20 border-white/5" : "bg-gray-100 border-gray-200")}>
                                        {(['left', 'center', 'right'] as const).map(align => (
                                          <button 
                                            key={align} 
                                            onClick={() => updateAlign(section.id, align)} 
                                            className={cn("p-1.5 transition-all", (section.align === align || (!section.align && align === 'left')) ? (theme === 'dark' ? "bg-white/10 text-white" : "bg-white text-black shadow-sm") : "text-gray-400 hover:text-indigo-500")}
                                          >
                                            {align === 'left' && <AlignLeft size={14} />}
                                            {align === 'center' && <AlignCenter size={14} />}
                                            {align === 'right' && <AlignRight size={14} />}
                                          </button>
                                        ))}
                                     </div>
                                     <button onClick={() => removeSection(section.id)} className={cn("p-2 rounded-none transition-all border", theme === 'dark' ? "text-gray-600 border-transparent hover:border-rose-500/20 hover:text-rose-500" : "text-gray-400 border-transparent hover:border-rose-200 hover:text-rose-500")}><Trash2 size={16} /></button>
                                  </div>
                               </div>

                               <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8", section.align === 'center' && "text-center", section.align === 'right' && "text-right")}>
                                  {Object.keys(section.content || {}).map((key) => (
                                     <div key={key} className={cn("space-y-2", (key === 'content' || key === 'description' || key === 'bio') && "md:col-span-2")}>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] italic px-1 opacity-50">{humanize(key)}</label>
                                        {key.toLowerCase().includes('image') ? (
                                           <MediaPicker value={section.content[key]} onChange={(val) => {
                                              const newSections = [...data.sections];
                                              const sIdx = newSections.findIndex(s => s.id === section.id);
                                              newSections[sIdx].content[key] = val;
                                              setData({ ...data, sections: newSections });
                                           }} />
                                        ) : (
                                           <RichTextEditor 
                                             mode={getSmartMode(key)}
                                             value={section.content[key] || ''} 
                                             onChange={(val) => {
                                                const newSections = [...data.sections];
                                                const sIdx = newSections.findIndex(s => s.id === section.id);
                                                newSections[sIdx].content[key] = val;
                                                setData({ ...data, sections: newSections });
                                             }}
                                           />
                                        )}
                                     </div>
                                  ))}
                               </div>
                            </div>
                         </Reorder.Item>
                      ))}
                   </Reorder.Group>

                    <button onClick={() => { setInjectionIndex(data?.sections?.length || 0); setBlockPickerOpen(true); }} className={cn("w-full py-10 rounded-none border-2 border-dashed transition-all flex flex-col items-center gap-4 group", theme === 'dark' ? "border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.01]" : "border-gray-100 hover:border-indigo-500/20 hover:bg-gray-50")}>
                       <div className={cn("w-10 h-10 rounded-none border flex items-center justify-center group-hover:scale-110 transition-all", theme === 'dark' ? "bg-white/5 border-white/5" : "bg-gray-100 border-gray-200")}><Plus size={20} /></div>
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] italic text-gray-500 group-hover:text-indigo-400">Append Section</p>
                    </button>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col pt-10">
                    <div className={cn("flex-1 p-10 font-mono text-sm overflow-auto rounded-none border", theme === 'dark' ? "bg-black/50 border-white/5 text-indigo-300" : "bg-gray-100 border-gray-200 text-indigo-900")}>
                       <pre className="no-scrollbar">{JSON.stringify(data, null, 3)}</pre>
                    </div>
                 </div>
               )}
             </div>
          </div>
        </main>

        <AnimatePresence initial={false}>
          {rightPanelOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightSidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={cn("border-l flex flex-col z-50 overflow-hidden shrink-0 relative group/right-sidebar", theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-200 shadow-xl")}
            >
               <div onMouseDown={startResizing('right')} className={cn("absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 transition-colors", resizingSide === 'right' ? "bg-indigo-500 shadow-[0_0_15px_#6366f1]" : "bg-transparent hover:bg-indigo-500/50")} />
               <div className={cn("p-4 flex items-center justify-between border-b shrink-0", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                 <div className="flex items-center gap-4">
                    {(['preview', 'history'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveRightTab(tab)} className={cn("flex flex-col transition-all", activeRightTab === tab ? "opacity-100" : "opacity-30 hover:opacity-100")}>
                         <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] italic", activeRightTab === tab ? (theme === 'dark' ? "text-indigo-400" : "text-indigo-600") : (theme === 'dark' ? "text-white" : "text-black"))}>{tab === 'preview' ? 'Live' : 'Audit'}</span>
                         <div className={cn("h-0.5 w-full mt-1", activeRightTab === tab ? (theme === 'dark' ? "bg-indigo-500" : "bg-indigo-600") : "bg-transparent")} />
                      </button>
                    ))}
                 </div>
                 <button onClick={() => setRightPanelOpen(false)} className="p-1 hover:text-indigo-500 transition-colors"><X size={16} /></button>
               </div>
               <div className="flex-1 overflow-hidden relative custom-editor-scrollbar">
                 {activeRightTab === 'preview' ? (
                   <div className="w-full h-full flex flex-col">
                     <div className={cn("p-3 border-b flex items-center justify-center gap-4", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                        <button onClick={() => setZoom(z => Math.max(z - 10, 50))} className={cn("p-1.5 rounded-none border transition-colors", theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50")}><Minimize size={12} /></button>
                        <span className="text-[9px] font-black italic w-10 text-center">{zoom}%</span>
                        <button onClick={() => setZoom(z => Math.min(z + 10, 150))} className={cn("p-1.5 rounded-none border transition-colors", theme === 'dark' ? "border-white/5 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50")}><Maximize size={12} /></button>
                     </div>
                     <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
                        <motion.div animate={{ scale: zoom / 100 }} className={cn("w-full h-full shadow-2xl rounded-none border relative group overflow-hidden", theme === 'dark' ? "bg-white border-white/10" : "bg-white border-gray-200")}>
                           <iframe ref={iframeRef} src={`${import.meta.env.VITE_STOREFRONT_URL || "http://localhost:5173"}?preview=true&pageId=${id}`} className="w-full h-full border-none opacity-90 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                     </div>
                   </div>
                 ) : (
                   <div className="w-full h-full p-4 overflow-y-auto custom-editor-scrollbar space-y-4">
                      {history.map((v, idx) => (
                        <div key={v.id} className={cn("group p-4 rounded-none border transition-all cursor-pointer space-y-2", theme === 'dark' ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-gray-50 border-gray-200 hover:bg-gray-100")}>
                           <div className="flex items-center justify-between">
                              <span className={cn("text-[10px] font-black uppercase italic", theme === 'dark' ? "text-white" : "text-black")}>{idx === 0 ? 'Current' : `V1.${history.length - idx}`}</span>
                              <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">{new Date(v.createdAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-[9px] text-gray-500 font-medium italic truncate">{v.changeLog || 'Manual Save'}</p>
                           <button onClick={() => handleRestore(v._id)} className="w-full py-1 bg-indigo-600 text-white text-[7px] font-black uppercase italic tracking-widest opacity-0 group-hover:opacity-100 transition-all">Restore</button>
                        </div>
                      ))}
                   </div>
                 )}
               </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {blockPickerOpen && (
          <div className="fixed inset-0 z-[600]">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBlockPickerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className={cn("absolute right-0 top-0 bottom-0 w-[400px] border-l shadow-2xl flex flex-col", theme === 'dark' ? "bg-[#050505] border-white/10" : "bg-white border-gray-200")}>
               <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-black uppercase italic leading-none text-indigo-500">Add Block</h3>
                     <button onClick={() => setBlockPickerOpen(false)} className={cn("p-2 rounded-none border transition-all", theme === 'dark' ? "bg-white/5 border-white/10 text-white hover:bg-white hover:text-black" : "bg-gray-100 border-gray-200 text-black hover:bg-black hover:text-white")}><X size={16} /></button>
                  </div>
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                     <input type="text" placeholder="Search Modules..." value={blockSearch} onChange={(e) => setBlockSearch(e.target.value)} className={cn("w-full rounded-none py-3 pl-12 pr-4 text-[10px] font-black italic outline-none transition-all border", theme === 'dark' ? "bg-white/5 border-white/10 text-white focus:border-indigo-500/50" : "bg-gray-50 border-gray-200 text-black focus:border-indigo-600/50")} />
                  </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 custom-editor-scrollbar space-y-4">
                  {filteredBlocks.map(block => {
                     const Icon = block.icon;
                     return (
                        <button key={block.type} onClick={() => addBlock(block.type)} className={cn("group w-full flex items-center gap-4 p-4 rounded-none border transition-all text-left", theme === 'dark' ? "bg-white/[0.02] border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5" : "bg-gray-50 border-gray-200 hover:border-indigo-600/50 hover:bg-indigo-50/50")}>
                           <div className={cn("w-10 h-10 rounded-none border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform", theme === 'dark' ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-500" : "bg-white border-gray-200 text-indigo-600")}><Icon size={18} /></div>
                           <div className="flex-1">
                              <h4 className={cn("text-xs font-black uppercase italic tracking-tight", theme === 'dark' ? "text-white" : "text-black")}>{block.title}</h4>
                              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{block.description}</p>
                           </div>
                           <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-all text-indigo-500" />
                        </button>
                     );
                  })}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {seoOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className={cn("w-full max-w-lg border rounded-none overflow-hidden shadow-2xl", theme === 'dark' ? "bg-[#0a0a0a] border-white/10" : "bg-white border-gray-200")}>
               <div className={cn("p-6 border-b flex items-center justify-between", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                  <h3 className={cn("text-lg font-black uppercase italic leading-none", theme === 'dark' ? "text-white" : "text-black")}>SEO Meta</h3>
                  <button onClick={() => setSeoOpen(false)} className="p-1 hover:text-indigo-500 transition-colors"><X size={18} /></button>
               </div>
               <div className="p-6 space-y-4">
                  {['title', 'description', 'keywords'].map(field => (
                    <div key={field} className="space-y-1.5">
                       <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic px-1">{humanize(field)}</label>
                       {field === 'description' ? (
                         <textarea value={data.meta?.[field] || ''} onChange={(e) => setData({ ...data, meta: { ...data.meta, [field]: e.target.value } })} className={cn("w-full rounded-none py-3 px-4 text-[10px] font-black italic outline-none h-24 resize-none transition-all border", theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:border-indigo-500/30" : "bg-gray-50 border-gray-200 text-black focus:border-indigo-600/30")} />
                       ) : (
                         <input type="text" value={data.meta?.[field] || ''} onChange={(e) => setData({ ...data, meta: { ...data.meta, [field]: e.target.value } })} className={cn("w-full rounded-none py-3 px-4 text-[10px] font-black italic outline-none transition-all border", theme === 'dark' ? "bg-white/5 border-white/5 text-white focus:border-indigo-500/30" : "bg-gray-50 border-gray-200 text-black focus:border-indigo-600/30")} />
                       )}
                    </div>
                  ))}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpatialEditor;
