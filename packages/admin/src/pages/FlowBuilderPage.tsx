import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Plus, 
  Settings, 
  Bell, 
  Webhook, 
  Mail, 
  Database, 
  Trash2,
  Clock,
  Activity,
  Terminal,
  Workflow,
  Braces,
  Save,
  GripVertical,
  ChevronRight,
  X,
  Play,
  Loader2,
  Code2,
  Variable,
  Layers,
  ArrowDown,
  Info,
  Maximize2,
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import api from '../lib/api';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface FlowStep {
  id: string;
  type: string;
  name: string;
  config: any;
}

interface Flow {
  _id?: string;
  name: string;
  description: string;
  active: boolean;
  trigger: {
    type: 'webhook' | 'collection_change' | 'schedule';
    config: any;
  };
  steps: FlowStep[];
}

const STEP_TYPES = [
  { id: 'notify', name: 'Notification', icon: Bell, color: 'text-amber-500', description: 'Internal system alert dispatch' },
  { id: 'webhook', name: 'Webhook', icon: Webhook, color: 'text-blue-500', description: 'Outbound HTTP POST request' },
  { id: 'email', name: 'Email', icon: Mail, color: 'text-emerald-500', description: 'SMTP communication relay' },
  { id: 'transform', name: 'Script', icon: Code2, color: 'text-purple-500', description: 'Custom JS/Logic execution' },
  { id: 'log', name: 'Audit Log', icon: Terminal, color: 'text-gray-400', description: 'Permanent record entry' }
];

const TRIGGER_TYPES = [
  { id: 'webhook', name: 'Web_Trigger', icon: Zap, detail: 'POST' },
  { id: 'collection_change', name: 'Data_Event', icon: Database, detail: 'DB' },
  { id: 'schedule', name: 'Cron_Pulse', icon: Clock, detail: 'TIME' }
];

const FlowBuilderPage: React.FC = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      const res = await api.get('/flows');
      setFlows(res.data.data || []);
    } catch (err) {
      toast.error('Registry Sync Failed');
    } finally {
      setLoading(false);
    }
  };

  const createNewFlow = () => {
    const newFlow: Flow = {
      name: 'NEW_OPERATIONAL_SEQUENCE',
      description: 'System autonomy protocol for automated execution.',
      active: false,
      trigger: { type: 'webhook', config: {} },
      steps: []
    };
    setSelectedFlow(newFlow);
    setActiveStepId(null);
  };

  const saveFlow = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      if (selectedFlow._id) {
        await api.patch(`/flows/${selectedFlow._id}`, selectedFlow);
        toast.success('SEQUENCE_STABILIZED');
      } else {
        const res = await api.post('/flows', selectedFlow);
        setFlows([res.data.data, ...flows]);
        setSelectedFlow(res.data.data);
        toast.success('SEQUENCE_INITIALIZED');
      }
      fetchFlows();
    } catch (err) {
      toast.error('SYNC_ABORTED');
    } finally {
      setSaving(false);
    }
  };

  const deleteFlow = async (id?: string) => {
    if (!id) { setSelectedFlow(null); return; }
    if (!confirm('Execute permanent purge protocol?')) return;
    try {
      await api.delete(`/flows/${id}`);
      setFlows(flows.filter(f => f._id !== id));
      setSelectedFlow(null);
      toast.success('SEQUENCE_PURGED');
    } catch (err) {
      toast.error('PURGE_FAILED');
    }
  };

  const addStep = (typeId: string) => {
    if (!selectedFlow) return;
    const type = STEP_TYPES.find(t => t.id === typeId);
    const newStep: FlowStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: typeId,
      name: type?.name || 'New Step',
      config: typeId === 'transform' ? { script: '// Execute custom logic\nreturn payload;' } : { message: '', target: '' }
    };
    setSelectedFlow({
      ...selectedFlow,
      steps: [...selectedFlow.steps, newStep]
    });
    setActiveStepId(newStep.id);
    setShowNodeMenu(false);
  };

  const activeStep = selectedFlow?.steps.find(s => s.id === activeStepId);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-6">
        <div className="w-16 h-16 border-2 border-indigo-500 border-t-transparent animate-spin rounded-none" />
        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500 italic">Accessing_Flow_Matrix...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#050505] overflow-hidden select-none font-sans">
      {/* ── Left Sidebar: Sequences ── */}
      <div className="w-full md:w-72 border-r border-white/5 flex flex-col bg-black/40">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 indicator-blue" />
             <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Registry</h1>
          </div>
          <button 
            onClick={createNewFlow}
            className="w-8 h-8 flex items-center justify-center bg-white text-black hover:scale-105 transition-all rounded-none"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          {flows.map(flow => (
            <button 
              key={flow._id}
              onClick={() => setSelectedFlow(flow)}
              className={cn(
                "w-full text-left p-4 transition-all flex flex-col border rounded-none group",
                selectedFlow?._id === flow._id 
                  ? "bg-white/5 border-white/10" 
                  : "border-transparent hover:bg-white/[0.02] hover:border-white/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tight",
                  selectedFlow?._id === flow._id ? "text-white" : "text-gray-500"
                )}>
                  {flow.name}
                </span>
                <div className={cn(
                  "w-1 h-1",
                  flow.active ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : "bg-zinc-800"
                )} />
              </div>
              <p className="text-[8px] text-gray-700 uppercase tracking-tighter truncate w-full group-hover:text-gray-500">{flow.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Canvas ── */}
      <div className="flex-1 flex flex-col relative bg-noise">
        {selectedFlow ? (
          <>
            {/* Context Header */}
            <div className="px-8 h-20 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-md z-10">
              <div className="flex flex-col">
                <div className="flex items-center gap-4">
                  <input 
                    value={selectedFlow.name}
                    onChange={(e) => setSelectedFlow({...selectedFlow, name: e.target.value})}
                    className="bg-transparent text-xl font-black text-white uppercase italic tracking-tighter outline-none focus:text-indigo-500 transition-colors"
                  />
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5">
                    <button 
                      onClick={() => setViewMode('visual')}
                      className={cn("px-2 py-1 text-[8px] font-black uppercase tracking-widest", viewMode === 'visual' ? "bg-white text-black" : "text-gray-600 hover:text-white")}
                    >Visual</button>
                    <button 
                      onClick={() => setViewMode('code')}
                      className={cn("px-2 py-1 text-[8px] font-black uppercase tracking-widest", viewMode === 'code' ? "bg-white text-black" : "text-gray-600 hover:text-white")}
                    >Code</button>
                  </div>
                </div>
                <input 
                  value={selectedFlow.description}
                  onChange={(e) => setSelectedFlow({...selectedFlow, description: e.target.value})}
                  className="bg-transparent text-[9px] text-gray-600 uppercase tracking-widest outline-none mt-1 w-96"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedFlow({...selectedFlow, active: !selectedFlow.active})}
                  className={cn(
                    "px-4 py-2 border text-[9px] font-black uppercase tracking-widest transition-all",
                    selectedFlow.active ? "border-indigo-500 text-indigo-500 bg-indigo-500/5" : "border-white/10 text-gray-600"
                  )}
                >
                  {selectedFlow.active ? 'STATUS:_LIVE' : 'STATUS:_IDLE'}
                </button>
                <button 
                  onClick={saveFlow}
                  disabled={saving}
                  className="px-6 h-10 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 rounded-none disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Execute_Save
                </button>
                <button 
                  onClick={() => deleteFlow(selectedFlow._id)}
                  className="p-2.5 text-gray-700 hover:text-red-500 transition-all border border-transparent hover:border-red-500/10"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Flow Visualizer */}
               <div className="flex-1 overflow-y-auto no-scrollbar py-12 px-8 flex flex-col items-center">
                  <div className="w-full max-w-2xl space-y-12">
                    {/* TRIGGER NODE */}
                    <div className="flex flex-col items-center">
                       <div className={cn(
                         "w-full bg-zinc-950 border p-8 flex flex-col items-center gap-6 relative transition-all group",
                         activeStepId === 'trigger' ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.1)]" : "border-white/5"
                       )}
                       onClick={() => setActiveStepId('trigger')}>
                          <div className="absolute top-0 left-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Zap size={10} className="text-amber-500" />
                          </div>
                          
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-white/10 flex items-center justify-center text-amber-500">
                              <Zap size={24} />
                            </div>
                            <div className="text-center">
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">Pulse_Initiator</span>
                              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter mt-1">
                                {TRIGGER_TYPES.find(t => t.id === selectedFlow.trigger.type)?.name}
                              </h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-white/5">
                             {TRIGGER_TYPES.map(t => (
                               <button 
                                key={t.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFlow({...selectedFlow, trigger: { ...selectedFlow.trigger, type: t.id as any }});
                                }}
                                className={cn(
                                  "py-2 text-[8px] font-black uppercase tracking-widest transition-all",
                                  selectedFlow.trigger.type === t.id ? "bg-white text-black" : "text-gray-600 hover:text-white bg-white/5"
                                )}
                               >
                                 {t.detail}
                               </button>
                             ))}
                          </div>
                       </div>
                       
                       <div className="w-px h-16 bg-gradient-to-b from-indigo-500 to-white/5 relative">
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 border-b border-r border-white/20 rotate-45" />
                       </div>
                    </div>

                    {/* ACTION NODES */}
                    <Reorder.Group 
                      axis="y" 
                      values={selectedFlow.steps} 
                      onReorder={(newSteps) => setSelectedFlow({...selectedFlow, steps: newSteps})} 
                      className="space-y-12"
                    >
                      {selectedFlow.steps.map((step, idx) => {
                        const stepType = STEP_TYPES.find(t => t.id === step.type) || STEP_TYPES[0];
                        const isActive = activeStepId === step.id;
                        
                        return (
                          <Reorder.Item 
                            key={step.id} 
                            value={step}
                            className="flex flex-col items-center"
                          >
                            <div className={cn(
                              "w-full bg-zinc-950 border p-6 flex items-center gap-6 relative transition-all group cursor-pointer",
                              isActive ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.1)]" : "border-white/5 hover:border-white/10"
                            )}
                            onClick={() => setActiveStepId(step.id)}>
                               <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-800 hover:text-white transition-colors">
                                  <GripVertical size={16} />
                               </div>

                               <div className={cn("w-12 h-12 flex items-center justify-center bg-black border border-white/5", stepType.color)}>
                                  <stepType.icon size={24} />
                               </div>

                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                     <span className="text-[10px] font-black text-white uppercase tracking-tight">{step.name}</span>
                                     <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest border border-white/5 px-1">NODE_{idx + 1}</span>
                                  </div>
                                  <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1 truncate">{stepType.description}</p>
                               </div>

                               <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFlow({...selectedFlow, steps: selectedFlow.steps.filter(s => s.id !== step.id)});
                                  if (isActive) setActiveStepId(null);
                                }}
                                className="p-2 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>

                            <div className="w-px h-16 bg-gradient-to-b from-white/10 to-white/5 relative">
                               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 border-b border-r border-white/10 rotate-45" />
                            </div>
                          </Reorder.Item>
                        );
                      })}
                    </Reorder.Group>

                    {/* ADD NODE INTERFACE */}
                    <div className="flex flex-col items-center">
                       <div className="relative">
                          <button 
                            onClick={() => setShowNodeMenu(!showNodeMenu)}
                            className={cn(
                              "w-16 h-16 border-2 transition-all flex items-center justify-center group relative overflow-hidden",
                              showNodeMenu ? "bg-white text-black border-white" : "bg-black text-white border-white/10 hover:border-white/20"
                            )}
                          >
                             <Plus size={32} className={cn("transition-transform duration-500", showNodeMenu && "rotate-45")} />
                          </button>

                          <AnimatePresence>
                             {showNodeMenu && (
                               <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="absolute top-full left-1/2 -translate-x-1/2 mt-6 bg-zinc-900 border border-white/10 p-4 grid grid-cols-2 gap-3 z-50 min-w-[320px] shadow-2xl"
                               >
                                  {STEP_TYPES.map(type => (
                                    <button 
                                      key={type.id}
                                      onClick={() => addStep(type.id)}
                                      className="flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/5"
                                    >
                                       <div className={cn("w-10 h-10 flex items-center justify-center bg-black border border-white/10", type.color)}>
                                          <type.icon size={18} />
                                       </div>
                                       <div>
                                          <div className="text-[9px] font-black text-white uppercase tracking-tight leading-none">{type.name}</div>
                                          <div className="text-[7px] text-gray-600 uppercase tracking-tighter mt-1 italic">{type.id}</div>
                                       </div>
                                    </button>
                                  ))}
                               </motion.div>
                             )}
                          </AnimatePresence>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Configuration Side Panel */}
               <AnimatePresence>
                  {activeStepId && (
                    <motion.div 
                      initial={{ x: 400 }}
                      animate={{ x: 0 }}
                      exit={{ x: 400 }}
                      className="w-96 border-l border-white/5 bg-black/60 backdrop-blur-2xl flex flex-col z-20"
                    >
                       <div className="p-6 border-b border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Settings size={14} className="text-gray-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Node_Configuration</span>
                          </div>
                          <button onClick={() => setActiveStepId(null)} className="text-gray-500 hover:text-white transition-colors">
                            <X size={16} />
                          </button>
                       </div>

                       <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                          {activeStepId === 'trigger' ? (
                            <div className="space-y-6">
                               <div className="bg-indigo-500/5 border border-indigo-500/20 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                     <Info size={12} className="text-indigo-400" />
                                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Protocol_Info</span>
                                  </div>
                                  <p className="text-[9px] text-gray-500 uppercase tracking-tighter leading-relaxed italic">
                                     This sequence initiates when the specified trigger condition is met. Ensure your endpoint or event listener is correctly synchronized.
                                  </p>
                               </div>

                               <div className="space-y-2">
                                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Execution_Model</label>
                                  <div className="text-[10px] font-black text-white bg-white/5 border border-white/10 p-4 italic uppercase">
                                     {selectedFlow.trigger.type}_Protocol_Active
                                  </div>
                               </div>

                               <div className="space-y-2">
                                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Webhook_URL (Mock)</label>
                                  <div className="p-4 bg-zinc-950 border border-white/5 flex items-center justify-between group">
                                     <code className="text-[9px] text-indigo-400 truncate">https://api.zenith.sys/flows/trg_{selectedFlow._id || 'pending'}</code>
                                     <button className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white">
                                        <Layers size={12} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          ) : activeStep ? (
                            <div className="space-y-8">
                               <div className="space-y-4">
                                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Node_Alias</label>
                                  <input 
                                    value={activeStep.name}
                                    onChange={(e) => {
                                      const newSteps = selectedFlow.steps.map(s => s.id === activeStepId ? { ...s, name: e.target.value } : s);
                                      setSelectedFlow({...selectedFlow, steps: newSteps});
                                    }}
                                    className="w-full bg-zinc-950 border border-white/10 p-4 text-[11px] text-white uppercase italic tracking-tighter outline-none focus:border-indigo-500 transition-all"
                                  />
                               </div>

                               {activeStep.type === 'transform' ? (
                                 <div className="space-y-4 h-full flex flex-col">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Logic_Script (V8_Engine)</label>
                                      <Code2 size={12} className="text-purple-500" />
                                    </div>
                                    <textarea 
                                      value={activeStep.config.script}
                                      onChange={(e) => {
                                        const newSteps = selectedFlow.steps.map(s => s.id === activeStepId ? { ...s, config: { ...s.config, script: e.target.value } } : s);
                                        setSelectedFlow({...selectedFlow, steps: newSteps});
                                      }}
                                      className="flex-1 w-full bg-zinc-950 border border-white/10 p-4 text-[10px] text-emerald-500 font-mono resize-none outline-none focus:border-indigo-500 transition-all h-64 no-scrollbar"
                                    />
                                    <div className="flex items-center gap-2 text-[8px] text-gray-700 italic">
                                      <Info size={10} />
                                      <span>Available Variables: payload, metadata, env</span>
                                    </div>
                                 </div>
                               ) : (
                                 <div className="space-y-6">
                                    {Object.entries(activeStep.config).map(([key, val]) => (
                                       <div key={key} className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{key}_Registry</label>
                                            <Variable size={10} className="text-gray-800 hover:text-indigo-500 transition-colors cursor-pointer" />
                                          </div>
                                          <input 
                                            type="text"
                                            value={val as string}
                                            onChange={(e) => {
                                              const newSteps = selectedFlow.steps.map(s => s.id === activeStepId ? { ...s, config: { ...s.config, [key]: e.target.value } } : s);
                                              setSelectedFlow({...selectedFlow, steps: newSteps});
                                            }}
                                            className="w-full bg-zinc-950 border border-white/10 p-4 text-[10px] text-white uppercase tracking-widest outline-none focus:border-indigo-500 transition-all"
                                          />
                                       </div>
                                    ))}
                                 </div>
                               )}

                               <div className="pt-8 border-t border-white/5">
                                  <button className="w-full py-4 bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] hover:bg-white hover:text-black hover:border-white transition-all flex items-center justify-center gap-2">
                                     <Play size={12} />
                                     Test_Node_Logic
                                  </button>
                               </div>
                            </div>
                          ) : null}
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full" />
             
             <div className="w-32 h-32 border-2 border-white/5 flex items-center justify-center text-gray-900 mb-10 bg-zinc-950/20 relative z-10 group">
                <Workflow size={64} className="group-hover:text-indigo-500 transition-all duration-700 group-hover:scale-110" />
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-indigo-500" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-500" />
             </div>
             
             <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6 relative z-10">
                Strategic_Automation
             </h2>
             <p className="text-[11px] text-gray-600 uppercase tracking-[0.4em] max-w-lg leading-[2.2] italic relative z-10">
                Construct high-fidelity operational sequences. Orchestrate data flows, system protocols, and tactical notifications with absolute geometric precision.
             </p>
             
             <button 
                onClick={createNewFlow}
                className="mt-12 px-16 py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[12px] hover:scale-105 active:scale-95 transition-all relative z-10 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
              >
                Launch_New_Sequence
              </button>

              <div className="absolute bottom-12 flex items-center gap-12 opacity-20">
                 <div className="flex items-center gap-3">
                    <History size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Registry_v2.4</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <CheckCircle2 size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Protocol_Ready</span>
                 </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowBuilderPage;
