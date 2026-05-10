import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Star
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../layouts/DashboardLayout';

const CollectionList: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const healthRes = await api.get('/health');
        const globals = healthRes.data.data?.globals || [];
        const collections = healthRes.data.data?.collections || [];
        
        const isGlobal = globals.some((g: any) => g.slug === slug);
        const colConfig = collections.find((c: any) => c.slug === slug);
        const isSingleton = colConfig?.singleton || isGlobal;

        if (isSingleton) {
          navigate(isGlobal ? `/globals/${slug}` : `/collections/${slug}/singleton`);
          return;
        }

        const res = await api.get(`/${slug}?page=${page}`);
        setData(res.data.data || []);
        setTotal(res.data.meta?.pagination?.total || (res.data.data?.length || 0));
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.response?.data?.error?.message || 'Failed to fetch collection data.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchData();
  }, [slug, page, navigate]);

  // Derive columns from the first item
  const columns = data.length > 0 
    ? Object.keys(data[0]).filter(k => k !== '__v' && k !== '_id' && typeof data[0][k] !== 'object') 
    : ['id'];

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanData, setKanbanData] = useState<Record<string, any>>({});
  const [kanbanLoading, setKanbanLoading] = useState(false);

  useEffect(() => {
    if (viewMode === 'kanban' && slug) {
      const fetchKanban = async () => {
        setKanbanLoading(true);
        try {
          const res = await api.get(`/${slug}/kanban?groupBy=_status`);
          setKanbanData(res.data.data);
        } catch (err) {
          console.error(err);
        } finally {
          setKanbanLoading(false);
        }
      };
      fetchKanban();
    }
  }, [slug, viewMode]);

  const handleToggleFocus = async (item: any) => {
    try {
      const newVal = !item.isFocused;
      await api.patch(`/${slug}/${item._id}`, { isFocused: newVal });
      setData(prev => prev.map(i => i._id === item._id ? { ...i, isFocused: newVal } : i));
      setActiveMenu(null);
    } catch (err) {
      console.error('Failed to toggle focus', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/${slug}/${id}`);
      setData(prev => prev.filter(item => item._id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      alert('Failed to delete entry');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-text-primary uppercase tracking-tighter italic">{slug?.replace(/-/g, ' ')}</h1>
            <p className="text-text-muted text-sm mt-1 font-medium opacity-60">Manage and organize all entries for your {slug?.replace(/-/g, ' ')} collection.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-app-surface p-1 rounded-lg border border-border flex items-center shadow-sm">
               <button 
                 onClick={() => setViewMode('list')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
               >List</button>
               <button 
                 onClick={() => setViewMode('kanban')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'kanban' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
               >Kanban</button>
            </div>
            <Link to={`/collections/${slug}/new`} className="btn btn-primary shadow-lg shadow-accent/20">
              <Plus size={18} />
              Create New
            </Link>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="flex-1 min-h-[500px] flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
             {kanbanLoading ? (
                <div className="w-full flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>
             ) : Object.keys(kanbanData).length === 0 ? (
                <div className="w-full flex items-center justify-center text-text-muted border-2 border-dashed border-border rounded-2xl">No items found for Kanban view.</div>
             ) : (
                Object.entries(kanbanData).map(([column, colData]: [string, any]) => (
                  <div key={column} className="flex-shrink-0 w-80 flex flex-col gap-4 bg-app-surface/50 p-4 rounded-xl border border-border/50">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${column === 'published' ? 'bg-success' : 'bg-warning'}`}></span>
                          <h3 className="font-bold text-text-primary uppercase tracking-wider text-xs">{column === 'undefined' ? 'Draft' : column}</h3>
                        </div>
                        <span className="bg-app-surface border border-border px-2 py-0.5 rounded-full text-[10px] font-bold text-text-muted">{colData.count}</span>
                     </div>
                     <div className="flex flex-col gap-3">
                        {colData.items.map((item: any) => (
                           <Link key={item._id} to={`/collections/${slug}/${item._id}`} className="block bg-app-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-accent transition-all cursor-pointer group relative">
                              <h4 className="font-semibold text-text-primary group-hover:text-accent transition-colors truncate pr-6">
                                {item.title || item.name || item._id}
                              </h4>
                              <p className="text-[10px] text-text-muted mt-2 font-medium">Updated {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
                           </Link>
                        ))}
                     </div>
                  </div>
                ))
             )}
          </div>
        ) : (
          <div className="card overflow-hidden shadow-xl border-border/40">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-border bg-app-surface flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search entries..." 
                    className="w-full pl-9 h-9 bg-app-subtle border border-border rounded-lg text-sm focus:border-accent outline-none"
                  />
                </div>
                <button className="btn btn-secondary border-dashed">
                  <Filter size={16} />
                  Filter
                </button>
              </div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {total} entries
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-accent" />
                  <p className="text-sm text-text-muted font-semibold tracking-tight">Accessing Database...</p>
                </div>
              ) : error ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-danger px-10 text-center">
                  <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Fetch Error</p>
                    <p className="text-sm opacity-80 mt-1 max-w-sm mx-auto">{error}</p>
                  </div>
                  <button onClick={() => window.location.reload()} className="btn btn-secondary text-xs">Retry Connection</button>
                </div>
              ) : data.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-app-subtle rounded-full flex items-center justify-center">
                    <FileText size={40} className="text-text-muted opacity-40" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary">No entries found</p>
                    <p className="text-sm text-text-secondary mt-1">This collection is currently empty.</p>
                  </div>
                  <Link to={`/collections/${slug}/new`} className="btn btn-primary mt-2">
                    <Plus size={18} />
                    Create First Entry
                  </Link>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr>
                      {columns.map(col => (
                        <th key={col} className="text-xs uppercase tracking-widest text-text-muted py-4 px-6">{col}</th>
                      ))}
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr key={item._id} className="group hover:bg-app-subtle/30 transition-colors">
                        {columns.map(col => (
                          <td key={col} className="py-4 px-6">
                            <Link to={`/collections/${slug}/${item._id}`} className="hover:text-accent font-medium text-sm transition-colors">
                              {String(item[col])}
                            </Link>
                          </td>
                        ))}
                        <td className="py-4 px-6 text-right relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(activeMenu === item._id ? null : item._id);
                            }}
                            className={`p-2 rounded-lg transition-all ${activeMenu === item._id ? 'bg-accent text-white' : 'hover:bg-app-subtle text-text-muted hover:text-text-primary'}`}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {/* Context Menu */}
                          {activeMenu === item._id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setActiveMenu(null)}></div>
                              <div className="absolute right-6 top-12 w-40 bg-app-surface border border-border rounded-xl shadow-2xl z-30 overflow-hidden py-1">
                                <Link to={`/collections/${slug}/${item._id}`} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-primary hover:bg-app-subtle transition-colors">
                                  <Edit size={14} /> Edit Entry
                                </Link>
                                <button 
                                  onClick={() => handleToggleFocus(item)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-primary hover:bg-app-subtle transition-colors text-left"
                                >
                                  <Star size={14} className={item.isFocused ? 'fill-warning text-warning' : 'text-text-muted'} /> 
                                  {item.isFocused ? 'Unfocus Entry' : 'Focus Entry'}
                                </button>
                                <button className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-primary hover:bg-app-subtle transition-colors text-left">
                                  <Eye size={14} /> Preview
                                </button>
                                <div className="h-px bg-border my-1 mx-2"></div>
                                <button 
                                  onClick={() => handleDelete(item._id)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors text-left"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-border bg-app-surface flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Showing {data.length} of {total} items
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 hover:bg-app-subtle border border-border rounded-lg disabled:opacity-20 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="px-3 py-1.5 bg-app-subtle rounded-lg text-sm font-bold text-text-primary">
                  {page}
                </div>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={data.length < 25}
                  className="p-2 hover:bg-app-subtle border border-border rounded-lg disabled:opacity-20 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CollectionList;
