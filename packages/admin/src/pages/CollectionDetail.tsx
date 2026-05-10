import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Save, Trash2, Globe, FileText } from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../layouts/DashboardLayout';
import FormBuilder from '../components/FormBuilder';

const CollectionDetail: React.FC<{ isGlobal?: boolean }> = ({ isGlobal: initialIsGlobal }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug: string, id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        
        // Find if the slug is a global or collection
        const globalMatch = globals.find((g: any) => g.slug === routeSlug);
        const collectionMatch = collections.find((c: any) => c.slug === routeSlug);
        
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
          const res = await api.get(`/${effectiveSlug}/${effectiveId}`);
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchemaAndData();
  }, [routeSlug, routeId, initialIsGlobal]);

  const id = resolvedId;
  const slug = resolvedSlug;
  const isNew = id === 'new';

  const handleSubmit = async (formData: any) => {
    setSaving(true);
    try {
      if (isNew) {
        await api.post(`/${slug}`, formData);
      } else {
        await api.patch(`/${slug}/${id}`, formData);
      }
      
      // Broadcast update for live preview
      const channel = new BroadcastChannel('zenith-sync');
      channel.postMessage({ type: 'UPDATE', slug: routeSlug });
      channel.close();

      navigate(isGlobal ? `/globals/${routeSlug}` : `/collections/${slug}`);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.delete(`/${slug}/${id}`);
      navigate(isGlobal ? `/globals/${routeSlug}` : `/collections/${slug}`);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-app-subtle rounded text-text-secondary">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight italic">
                {isGlobal ? `Manage ${routeSlug?.replace(/-/g, ' ')}` : isNew ? `New ${config?.labels?.singular || slug}` : `Edit ${config?.labels?.singular || slug}`}
              </h1>
              <p className="text-xs text-text-muted mt-1 font-medium opacity-60">
                {isGlobal ? `Optimize your global ${routeSlug?.replace(/-/g, ' ')} sections and site-wide content.` : `Update and manage details for this ${config?.labels?.singular || 'entry'}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {resolvedId !== 'new' && (
              <a 
                href="http://localhost:5173" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <Globe size={18} />
                Live Preview
              </a>
            )}
            {!isNew && (
              <button onClick={handleDelete} className="p-2 text-danger hover:bg-danger/10 rounded" title="Delete Entry">
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={() => handleSubmit(data)}
              disabled={saving}
              className="btn btn-primary shadow-lg shadow-accent/20"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-8">
              {loading ? (
                <div className="py-20 flex justify-center">
                  <Loader2 className="animate-spin text-accent" />
                </div>
              ) : (
                <FormBuilder 
                  fields={fields} 
                  initialData={data} 
                  onSubmit={handleSubmit} 
                  isSubmitting={saving} 
                />
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <FileText size={16} />
                Status & Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Status</span>
                  <span className="badge bg-success/10 text-success capitalize">{data?._status || 'Draft'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Created</span>
                  <span className="text-text-primary">{data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Now'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">ID</span>
                  <span className="text-text-primary font-mono truncate max-w-[100px]">{id}</span>
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4 bg-app-subtle/50">
              <h3 className="text-sm font-semibold text-text-primary">SEO & Meta</h3>
              <p className="text-xs text-text-muted">Configure how this entry appears in search engines and social media.</p>
              <button className="text-xs font-bold text-accent hover:underline">Edit SEO Data</button>
            </div>

            <div className="card p-6 space-y-4 border border-accent/20">
              <h3 className="text-sm font-semibold text-accent flex items-center gap-2">
                <Globe size={16} />
                AI Content Tools
              </h3>
              <p className="text-xs text-text-muted">Automated utilities for content managers.</p>
              
              <div className="space-y-2">
                <button 
                  className="w-full btn btn-secondary justify-start text-xs font-medium"
                  onClick={async () => {
                    try {
                      // Grab content to scan (naive approach for demo)
                      const contentStr = data?.content || data?.description || JSON.stringify(data);
                      const res = await api.post('/content-tools/auto-link', { content: contentStr });
                      const suggestions = res.data.data.suggestions;
                      if (suggestions.length > 0) {
                        alert(`Found ${suggestions.length} internal link suggestions!\n\n` + suggestions.map((s: any) => `"${s.text}" → ${s.url}`).join('\n'));
                      } else {
                        alert('No internal link keywords found in the text.');
                      }
                    } catch (e) {
                      console.error(e);
                      alert('Auto-linking failed.');
                    }
                  }}
                >
                  <Globe size={14} /> Auto-Link Keywords
                </button>

                <button 
                  className="w-full btn btn-secondary justify-start text-xs font-medium"
                  onClick={async () => {
                    try {
                      // Fetch versions
                      const vRes = await api.get(`/${slug}/${id}/versions`);
                      const versions = vRes.data.data;
                      if (!versions || versions.length === 0) return alert('No previous versions found.');
                      
                      const lastVersion = versions[0];
                      const diffRes = await api.get(`/${slug}/${id}/versions/${lastVersion._id}/diff`);
                      const diffs = diffRes.data.data;
                      
                      alert(`Changes since last version:\n\n${JSON.stringify(diffs, null, 2)}`);
                    } catch (e) {
                      console.error(e);
                      alert('Version diffing failed.');
                    }
                  }}
                >
                  <FileText size={14} /> Compare Version Diff
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CollectionDetail;
