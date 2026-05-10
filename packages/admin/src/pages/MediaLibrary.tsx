import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Image as ImageIcon, File, Search, Trash2, Download, Plus } from 'lucide-react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const MediaLibrary = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    fetchFiles();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchFiles();
    } catch (err) {
      console.error('Upload failed');
    }
  };

  const deleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/media/${id}`);
      fetchFiles();
    } catch (err) {
      console.error('Delete failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Media Library</h1>
            <p className="text-text-secondary mt-1">Manage all your digital assets in one secure place</p>
          </div>
          <label className="btn btn-primary flex items-center gap-2 cursor-pointer">
            <Plus size={18} />
            Upload File
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        </div>

        <div className="flex items-center gap-4 p-4 bg-app-surface border border-border rounded-lg">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent pl-10 pr-4 py-1 text-sm outline-none"
            />
          </div>
          <div className="text-xs text-text-muted font-medium border-l border-border pl-4">
            {files.length} Assets
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-text-muted animate-pulse">
            Loading your assets...
          </div>
        ) : files.length === 0 ? (
          <div className="h-96 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 text-text-muted">
            <ImageIcon size={48} className="opacity-20" />
            <p>Your library is empty. Start by uploading a file.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <AnimatePresence>
              {files.filter(f => (f.alt || f.id || '').toLowerCase().includes(search.toLowerCase())).map((file) => {
                const fullUrl = file.url.startsWith('http') ? file.url : `http://localhost:3000${file.url}`;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={file._id}
                    className="group relative bg-app-surface border border-border rounded-xl overflow-hidden hover:border-accent transition-all"
                  >
                    <div className="aspect-square flex items-center justify-center bg-app-subtle overflow-hidden">
                      {file.mimetype?.startsWith('image') ? (
                        <img src={fullUrl} alt={file.alt} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <File size={32} className="text-text-muted" />
                      )}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button onClick={() => deleteFile(file._id)} className="p-2 bg-error text-white rounded-full hover:scale-110 transition-transform">
                        <Trash2 size={16} />
                      </button>
                      <a href={fullUrl} download className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                        <Download size={16} />
                      </a>
                    </div>

                    <div className="p-3 border-t border-border">
                      <p className="text-[10px] font-mono text-text-muted truncate uppercase tracking-tighter">
                        {file.id?.split('-').pop() || 'FILE'}
                      </p>
                      <p className="text-[10px] text-text-secondary mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MediaLibrary;
