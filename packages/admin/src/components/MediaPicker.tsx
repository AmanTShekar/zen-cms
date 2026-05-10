import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Plus, Search, Check } from 'lucide-react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
      setFiles(res.data.data);
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {selectedFiles.map((file, i) => (
          <div key={file._id || i} className="relative w-24 h-24 rounded-lg border border-border overflow-hidden group">
            <img 
              src={file.url?.startsWith('http') ? file.url : `http://localhost:3000${file.url}`} 
              className="w-full h-full object-cover" 
              alt="" 
            />
            <button 
              type="button"
              onClick={() => hasMany ? onChange(selectedFiles.filter((_, idx) => idx !== i)) : onChange(null)}
              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {(hasMany || selectedFiles.length === 0) && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-accent hover:text-accent transition-all"
          >
            <Plus size={20} />
            <span className="text-[10px] font-medium">Add Media</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-app-surface border border-border rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Select Media</h3>
                  <p className="text-sm text-text-secondary">Choose from your library or upload new assets</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-app-subtle rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search files..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-app-subtle border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:border-accent outline-none"
                    />
                  </div>
                  <label className="btn btn-primary flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <Plus size={18} />
                    Upload New
                    <input type="file" className="hidden" onChange={handleUpload} />
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 pr-2">
                  {loading ? (
                    <div className="col-span-full h-64 flex items-center justify-center text-text-muted">Loading...</div>
                  ) : (
                    files.filter(f => (f.alt || f.id || '').toLowerCase().includes(search.toLowerCase())).map((file) => {
                      const isSelected = selectedFiles.some(f => f._id === file._id);
                      return (
                        <div 
                          key={file._id}
                          onClick={() => toggleSelect(file)}
                          className={`relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                            isSelected ? 'border-accent shadow-lg scale-[0.98]' : 'border-border hover:border-text-muted'
                          }`}
                        >
                          <img 
                            src={file.url?.startsWith('http') ? file.url : `http://localhost:3000${file.url}`} 
                            className="w-full h-full object-cover" 
                            alt="" 
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                              <div className="bg-accent text-white rounded-full p-1 shadow-lg">
                                <Check size={16} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border flex justify-end gap-3">
                <button onClick={() => setIsOpen(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={() => setIsOpen(false)} className="btn btn-primary">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaPicker;
