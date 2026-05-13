import React, { useState } from 'react';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Layout, 
  Image as ImageIcon, 
  Puzzle, 
  Layers, 
  Box, 
  CreditCard,
  Target,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../lib/utils';

interface Block {
  blockType: string;
  [key: string]: unknown;
}

interface BlocksBuilderProps {
  value: Block[];
  onChange: (value: Block[]) => void;
  availableBlocks?: unknown[];
  renderField?: (field: unknown, value: unknown, onChange: (val: unknown) => void) => React.ReactNode;
}

const STOCK_BLOCKS = [
  { id: 'hero', name: 'Hero_Banner', icon: <Sparkles />, description: 'High-impact entry node with cinematic text and media.' },
  { id: 'features', name: 'Feature_Grid', icon: <Layout />, description: 'Surgical arrangement of service attributes or product highlights.' },
  { id: 'pricing', name: 'Pricing_Matrix', icon: <CreditCard />, description: 'Tiered subscription or product pricing visualization.' },
  { id: 'testimonials', name: 'Social_Proof', icon: <Target />, description: 'Trust-building feedback stream from the user collective.' },
  { id: 'plugin-node', name: 'Plugin_Injection', icon: <Puzzle />, description: 'External logic node provided by active extensions.', isPlugin: true }
];

const BlocksBuilder: React.FC<BlocksBuilderProps> = ({ value, onChange }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addBlock = (type: string) => {
    const newBlock = { blockType: type, headline: `New_${type}_Node`, subheadline: '', content: '' };
    onChange([...value, newBlock]);
    setIsPickerOpen(false);
    setExpandedIndex(value.length);
  };

  const removeBlock = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], ...updates };
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-2">
         <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-500" />
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] italic">Structural_Manifest</h3>
         </div>
         <button 
            onClick={() => setIsPickerOpen(true)}
            className="w-8 h-8 rounded-none bg-gray-900 text-white flex items-center justify-center hover:scale-110 shadow-lg shadow-gray-900/10 transition-all"
         >
            <Plus size={16} />
         </button>
      </div>

      <Reorder.Group axis="y" values={value} onReorder={onChange} className="space-y-3">
        {value.map((block, index) => (
          <Reorder.Item 
             key={`${block.blockType}-${index}`} 
             value={block}
             className={cn(
                 "group relative bg-white border border-gray-100 rounded-none overflow-hidden shadow-sm hover:shadow-md transition-all duration-300",
                expandedIndex === index && "border-indigo-200 ring-4 ring-indigo-50/50 shadow-xl"
             )}
          >
            <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}>
               <div className="p-2 text-gray-300 group-hover:text-gray-900 transition-colors"><GripVertical size={14} /></div>
               <div className="w-8 h-8 rounded-none bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-all shadow-inner">
                  {STOCK_BLOCKS.find(b => b.id === block.blockType)?.icon || <Box size={14} />}
               </div>
               <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{block.headline || block.blockType}</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic">{block.blockType}</span>
               </div>
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <button onClick={(e) => { e.stopPropagation(); removeBlock(index); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                  <div className="text-gray-300">{expandedIndex === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
               </div>
            </div>

            <AnimatePresence>
               {expandedIndex === index && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-50 bg-[#fafafa]">
                     <div className="p-6 space-y-5">
                        <div className="space-y-1.5">
                           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic px-1">Headline_Attribute</label>
                           <input 
                              type="text" 
                              value={block.headline || ''} 
                              onChange={(e) => updateBlock(index, { headline: e.target.value })}
                              className="w-full bg-white border border-gray-100 rounded-none p-2 text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all" 
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic px-1">Body_Configuration</label>
                           <textarea 
                              value={block.content || ''} 
                              onChange={(e) => updateBlock(index, { content: e.target.value })}
                              className="w-full bg-white border border-gray-100 rounded-none p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all h-20 resize-none no-scrollbar" 
                           />
                        </div>
                        {block.blockType === 'hero' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic px-1">CTA_Primary</label>
                                 <input type="text" placeholder="Button Label" className="w-full bg-white border border-gray-100 rounded-none p-2 text-[10px] font-bold" />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic px-1">Asset_ID</label>
                                 <div className="w-full bg-white border border-gray-100 rounded-none p-2 text-[10px] font-bold flex items-center justify-between">
                                    <span className="text-gray-300 italic">No_Media_Selected</span>
                                    <ImageIcon size={12} className="text-gray-300" />
                                 </div>
                              </div>
                           </div>
                        )}
                        {block.blockType === 'plugin-node' && (
                           <div className="p-4 bg-indigo-50/50 rounded-none border border-indigo-100/50 flex flex-col items-center justify-center gap-3 py-8">
                              <Puzzle size={24} className="text-indigo-400 animate-pulse" />
                              <p className="text-[10px] font-black text-indigo-600 uppercase italic">External_Plugin_Awaiting_Injection</p>
                              <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-none text-[8px] font-bold uppercase tracking-widest italic hover:bg-indigo-700 transition-all">Configure Plugin</button>
                           </div>
                        )}
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* 🧩 Block Injection Interface */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-none w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                 <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">ARCHITECT_INJECTION</span>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Inject_New_Node</h3>
                 </div>
                 <button onClick={() => setIsPickerOpen(false)} className="p-2 text-gray-300 hover:text-gray-900 transition-colors"><Plus className="rotate-45" size={24} /></button>
              </div>
              <div className="p-4 grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto no-scrollbar">
                {STOCK_BLOCKS.map(stock => (
                  <button 
                    key={stock.id} 
                    onClick={() => addBlock(stock.id)}
                    className="flex items-start gap-5 p-5 hover:bg-indigo-50 rounded-none text-left group transition-all relative overflow-hidden"
                  >
                     <div className="w-12 h-12 rounded-none bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all shadow-inner">
                        {React.isValidElement(stock.icon) && React.cloneElement(stock.icon as React.ReactElement<{ size: number }>, { size: 20 })}
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-black text-gray-900 uppercase italic tracking-tight">{stock.name}</span>
                           {stock.isPlugin && <span className="text-[7px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-none uppercase italic">PLUGIN</span>}
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium leading-tight">{stock.description}</p>
                     </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlocksBuilder;
