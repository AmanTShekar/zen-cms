import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Plus, Search, Check, Loader2, UploadCloud } from 'lucide-react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface MediaPickerProps {
  value?: any;
  onChange: (value: any) => void;
  hasMany?: boolean;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ value, onChange, hasMany }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const selectedFiles = Array.isArray(value) ? value : value ? [value] : [];

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media');
      setFiles(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  const toggleSelect = (file: any) => {
    if (hasMany) {
      const exists = selectedFiles.find(f => f._id === file._id);
      if (exists) {
        onChange(selectedFiles.filter(f => f._id !== file._id));
      } else {
        onChange([...selectedFiles, file]);
      }
    } else {
      onChange(file);
      setIsOpen(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newFile = res.data.data;
      setFiles([newFile, ...files]);
      if (!hasMany) {
        onChange(newFile);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Upload failed');
    }
  };

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {selectedFiles.map((file, i) => (
          <div key={file._id || i} className="relative w-20 h-20 rounded-none border border-gray-100 overflow-hidden group shadow-sm transition-all hover:scale-105 active:scale-95">
            <img 
              src={getMediaUrl(file.url)} 
              className="w-full h-full object-cover" 
              alt="" 
            />
            <button 
              type="button"
              onClick={() => hasMany ? onChange(selectedFiles.filter((_, idx) => idx !== i)) : onChange(null)}
              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {(hasMany || selectedFiles.length === 0) && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-20 h-20 rounded-none border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all group"
          >
            <Plus size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest italic">Add_Media</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white border border-gray-100 rounded-none w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-gray-900 rounded-none flex items-center justify-center text-white shadow-lg">
                      <ImageIcon size={20} />
                   </div>
                   <div className="flex flex-col">
                     <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight leading-none">Asset_Registry</h3>
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic mt-1.5">Centralized_Repository_For_Media_Architectures</p>
                   </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-none transition-all">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8 bg-white">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="Filter assets by sequence or ID..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-none pl-12 pr-4 py-3.5 text-xs font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <label className="flex items-center gap-3 px-8 py-3.5 bg-gray-900 text-white rounded-none transition-all text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 cursor-pointer hover:brightness-110 active:scale-95 italic leading-none shrink-0">
                    <UploadCloud size={16} strokeWidth={3} />
                    <span>Ingest New Asset</span>
                    <input type="file" className="hidden" onChange={handleUpload} />
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="col-span-full h-full flex flex-col items-center justify-center gap-6">
                       <Loader2 className="animate-spin text-indigo-500" size={32} />
                       <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 italic animate-pulse">Syncing_Asset_Library...</span>
                    </div>
                  ) : (
                    files.filter(f => (f.alt || f.id || f.filename || '').toLowerCase().includes(search.toLowerCase())).map((file) => {
                      const isSelected = selectedFiles.some(f => f._id === file._id);
                      return (
                        <div 
                          key={file._id}
                          onClick={() => toggleSelect(file)}
                          className={cn(
                            "group relative aspect-square rounded-none border-2 overflow-hidden cursor-pointer transition-all",
                            isSelected ? "border-indigo-600 shadow-xl scale-[0.98]" : "border-gray-50 hover:border-indigo-200"
                          )}
                        >
                          <img 
                            src={getMediaUrl(file.url)} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            alt="" 
                          />
                          <div className={cn(
                            "absolute inset-0 transition-all duration-300",
                            isSelected ? "bg-indigo-600/10" : "bg-black/0 group-hover:bg-black/20"
                          )} />
                          
                          <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all bg-gradient-to-t from-black/60 to-transparent">
                             <p className="text-[7px] font-black text-white uppercase tracking-widest truncate">{file.filename || 'Untitled_Asset'}</p>
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-none p-1.5 shadow-xl animate-in zoom-in-50 duration-300">
                              <Check size={10} strokeWidth={4} />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-8 border-t border-gray-50 flex items-center justify-between bg-white relative z-10">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-none bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest italic">All_Systems_Operational</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsOpen(false)} className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors italic">Cancel</button>
                  <button onClick={() => setIsOpen(false)} className="px-8 py-3 bg-gray-900 text-white rounded-none text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:brightness-110 active:scale-95 transition-all italic leading-none">Apply Selection</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaPicker;
