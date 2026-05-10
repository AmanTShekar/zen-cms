import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Layout, Settings, Box, FileText, Users, CreditCard, HelpCircle, Zap, BarChart, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlocksBuilderProps {
  value?: any[];
  onChange: (value: any[]) => void;
  availableBlocks: any[];
  renderField: (field: any, value: any, onChange: (val: any) => void) => React.ReactNode;
}

const BlocksBuilder: React.FC<BlocksBuilderProps> = ({ value = [], onChange, availableBlocks, renderField }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [collapsedIndices, setCollapsedIndices] = useState<number[]>([]);

  const toggleCollapse = (index: number) => {
    setCollapsedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const addBlock = (blockConfig: any) => {
    const newBlock = {
      blockType: blockConfig.slug,
    };
    onChange([...value, newBlock]);
    setShowPicker(false);
  };

  const removeBlock = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newValue = [...value];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newValue.length) return;
    [newValue[index], newValue[newIndex]] = [newValue[newIndex], newValue[index]];
    onChange(newValue);
  };

  const updateBlockData = (index: number, fieldName: string, fieldValue: any) => {
    const newValue = [...value];
    newValue[index] = {
      ...newValue[index],
      [fieldName]: fieldValue
    };
    onChange(newValue);
  };

  const getBlockIcon = (slug: string) => {
    switch(slug) {
      case 'hero': return <Layout size={16} className="text-blue-400" />;
      case 'features': return <Box size={16} className="text-purple-400" />;
      case 'testimonials': return <Users size={16} className="text-green-400" />;
      case 'pricing': return <CreditCard size={16} className="text-yellow-400" />;
      case 'faq': return <HelpCircle size={16} className="text-orange-400" />;
      case 'cta': return <Zap size={16} className="text-red-400" />;
      case 'stats': return <BarChart size={16} className="text-indigo-400" />;
      case 'richTextSection': return <FileText size={16} className="text-gray-400" />;
      default: return <Grid size={16} className="text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6 col-span-2">
      <div className="flex items-center justify-between bg-app-surface/50 p-4 rounded-2xl border border-border">
        <div>
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Layout size={16} className="text-accent" />
            Dynamic Page Sections
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">Drag to reorder or add new interactive sections.</p>
        </div>
        <button 
          type="button" 
          onClick={() => setShowPicker(true)}
          className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg shadow-accent/20"
        >
          <Plus size={16} /> Add Section
        </button>
      </div>

      <div className="space-y-4">
        {value.map((block, index) => {
          const config = availableBlocks.find(b => b.slug === block.blockType);
          if (!config) return null;
          const isCollapsed = collapsedIndices.includes(index);

          return (
            <motion.div 
              layout
              key={index}
              className="bg-app-surface border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group"
            >
              <div className="bg-app-subtle/50 px-5 py-4 border-b border-border flex items-center justify-between select-none cursor-pointer" onClick={() => toggleCollapse(index)}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-app-bg border border-border rounded-xl flex items-center justify-center group-hover:border-accent/50 transition-colors">
                    {getBlockIcon(block.blockType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-text-primary uppercase tracking-tight">
                        {config.labels?.singular || config.name || block.blockType.replace(/-/g, ' ')}
                      </span>
                      <span className="text-[9px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-black uppercase">Section</span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[300px]">
                      {Object.entries(block || {}).filter(([k, v]) => k !== 'blockType' && typeof v === 'string').map(([_, v]) => v).join(' • ') || 'Empty configuration'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => moveBlock(index, 'up')} className="p-2 hover:bg-app-bg rounded-lg transition-colors text-text-secondary"><ChevronUp size={16} /></button>
                  <button type="button" onClick={() => moveBlock(index, 'down')} className="p-2 hover:bg-app-bg rounded-lg transition-colors text-text-secondary"><ChevronDown size={16} /></button>
                  <div className="w-px h-6 bg-border mx-2" />
                  <button type="button" onClick={() => removeBlock(index)} className="p-2 hover:bg-danger/10 hover:text-danger rounded-lg transition-colors text-text-muted"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-app-surface">
                      {config.fields.map((field: any) => (
                        <div key={field.name} className={`space-y-2 ${['richtext', 'blocks', 'array'].includes(field.type) ? 'col-span-2' : ''}`}>
                          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{field.label || field.name}</label>
                          {renderField(field, block?.[field.name], (val) => updateBlockData(index, field.name, val))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {value.length === 0 && (
        <div className="h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 text-text-muted">
          <Layout size={32} className="opacity-20" />
          <p className="text-sm font-medium">No blocks added yet.</p>
          <button type="button" onClick={() => setShowPicker(true)} className="text-accent text-sm font-bold hover:underline underline-offset-4">Add your first section</button>
        </div>
      )}

      {/* Block Picker Modal */}
      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-app-surface border border-border rounded-[24px] w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowPicker(false)} 
                className="absolute top-4 right-4 p-2 bg-app-subtle hover:bg-danger/10 hover:text-danger rounded-xl transition-all z-20 group"
              >
                <Plus className="rotate-45 group-hover:scale-110 transition-transform" size={18} />
              </button>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
                    <Box className="text-accent" size={20} />
                    Add Section
                  </h3>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">Modular block selection.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {availableBlocks.map(block => (
                    <button
                      key={block.slug}
                      type="button"
                      onClick={() => addBlock(block)}
                      className="flex flex-col items-center gap-2 p-4 rounded-[20px] border border-border hover:border-accent hover:bg-accent/5 transition-all text-center group bg-app-subtle/20"
                    >
                      <div className="w-12 h-12 bg-app-surface border border-border rounded-xl flex items-center justify-center group-hover:bg-accent group-hover:text-white group-hover:border-accent group-hover:scale-105 transition-all shadow-sm">
                        {getBlockIcon(block.slug)}
                      </div>
                      <div>
                        <h4 className="font-black text-text-primary uppercase tracking-tight text-[10px] group-hover:text-accent transition-colors">{block.labels?.singular || block.name || block.slug}</h4>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-3 bg-app-subtle/30 border-t border-border flex items-center justify-between">
                <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">Modular Engine v1</p>
                <div className="flex gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-accent/20"></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlocksBuilder;
