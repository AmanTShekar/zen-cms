import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Save, 
  Globe, 
  History, 
  ArrowLeft,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Terminal,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import FormBuilder from '../components/FormBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const CollectionDetail: React.FC<{ isGlobal?: boolean }> = ({ isGlobal: initialIsGlobal }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug: string, id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>[]>([]);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [versions, setVersions] = useState<Record<string, unknown>[]>([]);
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal);
  const [resolvedSlug, setResolvedSlug] = useState(routeSlug);
  const [resolvedId, setResolvedId] = useState(routeId?.split(':')[0] || 'singleton');

  useEffect(() => {
    const fetchSchemaAndData = async () => {
      setLoading(true);
      try {
        const healthRes = await api.get('/health');
        const collections = healthRes.data.data?.collections || [];
        const globals = healthRes.data.data?.globals || [];
        
        const globalMatch = globals.find((g: Record<string, unknown>) => g.slug === routeSlug);
        const collectionMatch = collections.find((c: Record<string, unknown>) => c.slug === routeSlug);
        
        const effectiveIsGlobal = !!globalMatch || initialIsGlobal;
        const effectiveSlug = effectiveIsGlobal ? `globals/${routeSlug}` : routeSlug;
        const effectiveId = effectiveIsGlobal ? 'singleton' : (routeId?.split(':')[0] || 'singleton');
        
        setIsGlobal(effectiveIsGlobal);
        setResolvedSlug(effectiveSlug);
        setResolvedId(effectiveId);
        
        const schema = globalMatch || collectionMatch;
        if (schema) {
          setFields(schema.fields || []);
          setConfig(schema);
        }

        if (effectiveId !== 'new') {
          try {
            const dataRes = await api.get(`/${effectiveSlug}/${effectiveId}`);
            setData(dataRes.data.data);
            
            if (!effectiveIsGlobal) {
              try {
                const versionsRes = await api.get(`/${effectiveSlug}/${effectiveId}/versions`);
                setVersions(versionsRes.data.data || []);
              } catch {
                setVersions([]);
              }
            }
          } catch {
            console.error('Failed to fetch data');
          }
        } else {
          setData({});
        }
      } catch {
        console.error('Failed to fetch schema');
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchSchemaAndData();
  }, [routeSlug, routeId, initialIsGlobal]);

  const id = resolvedId;

  const handleSave = async (formData: Record<string, unknown>) => {
    // 🔍 Pre-flight Validation check
    if (Object.keys(formData).length === 0 && id === 'new') {
      toast.error('EMPTY_MANIFEST_REJECTED');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (id === 'new') {
        const res = await api.post(`/${resolvedSlug}`, payload);
        toast.success('DATA_NODE_INITIALIZED_OK');
        // Guided transition to active session
        setTimeout(() => {
          navigate(`/collections/${routeSlug}/${res.data.data._id}`);
        }, 500);
      } else {
        await api.patch(`/${resolvedSlug}/${id}`, payload);
        toast.success('PERSISTENCE_SYNC_SUCCESS');
        
        // Refresh local version archive
        if (!isGlobal) {
          const versionsRes = await api.get(`/${resolvedSlug}/${id}/versions`);
          setVersions(versionsRes.data.data || []);
        }
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'SYNCHRONIZATION_FAILURE';
      toast.error(errorMsg.toUpperCase());
      console.error('Persistence Error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={cn("h-screen w-full flex flex-col items-center justify-center gap-6", theme === 'dark' ? "bg-black" : "bg-[#fafafa]")}>
       <Loader2 size={32} className="animate-spin text-indigo-500" strokeWidth={1.5} />
       <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">Synchronizing_Spatial_Record...</p>
    </div>
  );

  return (
    <div className={cn(
      "p-12 space-y-14 animate-fade-in min-h-screen transition-colors duration-500",
      theme === 'dark' ? "bg-black text-white" : "bg-[#fafafa] text-gray-900",
      isZenMode && "p-0"
    )}>
      <AnimatePresence>
        {!isZenMode && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center gap-5">
               <button onClick={() => navigate(-1)} className={cn(
                 "w-10 h-10 flex items-center justify-center border rounded-none transition-all shadow-sm",
                 theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-white border-gray-100 text-gray-400 hover:text-gray-900"
               )}>
                  <ArrowLeft size={18} />
               </button>
                <div className="flex flex-col">
                   <div className="flex items-center gap-4 mb-3">
                      <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">Record_Entry_Module</span>
                      <div className="w-2.5 h-2.5 rounded-none bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">{id === 'new' ? 'Initialize_Protocol_V6' : 'Active_Session_Established'}</span>
                   </div>
                   <h1 className="text-7xl font-black tracking-tighter uppercase italic leading-[0.9] truncate max-w-3xl">
                     {id === 'new' ? 'New_Record_Init' : (data?.name || data?.title || config?.labels?.singular || 'Manifest_Update')}
                   </h1>
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
               <button onClick={() => setIsZenMode(true)} className={cn(
                 "p-4 border rounded-none transition-all shadow-sm",
                 theme === 'dark' ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-white border-gray-100 text-gray-400 hover:text-gray-900"
               )}>
                  <Maximize2 size={18} />
               </button>
               <div className="flex items-center gap-2 p-1 border rounded-none bg-white/[0.02] border-white/5">
                 <button 
                    onClick={() => document.getElementById('record-form-submit')?.click()} 
                    disabled={saving}
                    className={cn(
                      "px-6 py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all italic leading-none flex items-center gap-3",
                      theme === 'dark' ? "bg-white/5 text-gray-400 hover:text-white" : "bg-white border-gray-100 text-gray-400 hover:text-gray-900"
                    )}
                 >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Save Draft</span>
                 </button>
                 <button 
                    onClick={() => {
                      // Logic to set status to published and save
                      const form = document.querySelector('form');
                      if (form) {
                        const statusInput = document.createElement('input');
                        statusInput.type = 'hidden';
                        statusInput.name = 'status';
                        statusInput.value = 'published';
                        form.appendChild(statusInput);
                        document.getElementById('record-form-submit')?.click();
                      }
                    }} 
                    disabled={saving}
                    className={cn(
                      "px-8 py-4 rounded-none font-black text-[10px] uppercase tracking-widest shadow-xl transition-all italic leading-none flex items-center gap-3",
                      theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                    )}
                 >
                    <Globe size={16} strokeWidth={3} />
                    <span>Publish</span>
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-16">
         {/* Edit Interface */}
         <div className={cn("xl:col-span-3 space-y-16", isZenMode && "xl:col-span-4 max-w-7xl mx-auto py-32 px-16")}>
            <AnimatePresence>
               {isZenMode && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("flex items-center justify-between mb-12 border-b pb-8", theme === 'dark' ? "border-white/5" : "border-gray-100")}>
                     <button onClick={() => setIsZenMode(false)} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-500 transition-colors italic">
                        <Minimize2 size={16} /> Exit_Tactical_View
                     </button>
                     <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                           <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">Live_Session</span>
                           <span className="text-xl font-black tracking-tighter italic leading-none">ORCHESTRATOR_LOCKED</span>
                        </div>
                        <button onClick={() => document.getElementById('record-form-submit')?.click()} className={cn(
                          "px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-widest shadow-lg italic leading-none transition-all",
                          theme === 'dark' ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white"
                        )}>
                           Sync Node
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>

            <div className={cn(
              "border rounded-none p-10 shadow-sm relative overflow-hidden transition-colors",
              theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-100"
            )}>
               <div className="absolute top-0 right-0 p-10 opacity-[0.01] pointer-events-none">
                  <Terminal size={180} strokeWidth={0.5} />
               </div>
               <FormBuilder 
                  fields={fields} 
                  initialData={data} 
                  onSubmit={handleSave} 
                  isSubmitting={saving}
               />
               <button id="record-form-submit" type="submit" className="hidden" />
            </div>
         </div>

         {/* Meta Orchestration Sidebar */}
         {!isZenMode && (
            <div className="space-y-8">
               {/* Record Intelligence */}
               <div className={cn(
                 "border rounded-none p-8 shadow-sm space-y-8 relative overflow-hidden group",
                 theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-100"
               )}>
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                     <ShieldCheck size={100} strokeWidth={0.5} />
                  </div>
                  <div className="flex items-center gap-4 px-2">
                     <div className={cn(
                       "w-9 h-9 rounded-none flex items-center justify-center shadow-inner",
                       theme === 'dark' ? "bg-white/5 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                     )}>
                        <ShieldCheck size={18} />
                     </div>
                     <h3 className="text-xs font-black uppercase italic tracking-widest">Metadata_Node</h3>
                  </div>
                  <div className="space-y-4">
                     <div className={cn("p-5 border rounded-none flex flex-col gap-1.5 shadow-inner transition-colors", theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-100")}>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic leading-none">Kernel_ID</span>
                        <span className="text-[10px] font-black uppercase italic truncate text-indigo-500">#{id.toUpperCase()}</span>
                     </div>
                     <div className={cn("p-5 border rounded-none flex flex-col gap-1.5 shadow-inner transition-colors", theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-100")}>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic leading-none">Sync_Status</span>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black text-emerald-500 uppercase italic">Operational</span>
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none shadow-[0_0_8px_#10b981]" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Temporal History */}
               <div className={cn(
                 "border rounded-none p-8 shadow-sm space-y-8 relative overflow-hidden group",
                 theme === 'dark' ? "bg-[#080808] border-white/5" : "bg-white border-gray-100"
               )}>
                  <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                     <History size={100} strokeWidth={0.5} />
                  </div>
                  <div className="flex items-center gap-4 px-2">
                     <div className={cn(
                       "w-9 h-9 rounded-none flex items-center justify-center shadow-inner",
                       theme === 'dark' ? "bg-white/5 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                     )}>
                        <History size={18} />
                     </div>
                     <h3 className="text-xs font-black uppercase italic tracking-widest">Version_Archive</h3>
                  </div>
                  <div className="space-y-3">
                     {versions.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center gap-4">
                           <RefreshCw size={24} className="text-gray-500/20 animate-spin-slow" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] italic leading-relaxed">No historical_manifests_detected</span>
                        </div>
                     ) : (
                        versions.map((v, i) => (
                           <div key={v._id} className={cn(
                             "p-4 border rounded-none transition-all cursor-pointer group flex items-center justify-between",
                             theme === 'dark' ? "bg-white/[0.02] border-white/5 hover:border-indigo-500/30" : "bg-gray-50 border-gray-100 hover:border-indigo-100"
                           )}>
                              <div className="flex flex-col gap-1.5">
                                 <span className="text-[9px] font-black uppercase italic leading-none">Revision_Manifest_{versions.length - i}</span>
                                 <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic">{new Date(v.createdAt).toLocaleDateString()}</span>
                              </div>
                              <ArrowRight size={12} className="text-gray-500 group-hover:text-indigo-500 transition-colors" />
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default CollectionDetail;
