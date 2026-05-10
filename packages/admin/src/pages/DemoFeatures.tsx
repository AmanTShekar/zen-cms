import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Zap, Shield, Sparkles, Activity, Search, Command } from 'lucide-react';
import { motion } from 'framer-motion';

const DemoFeatures = () => {
  const [prompt, setPrompt] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initial Fetch: System Stats
    fetch('/api/v1/system/stats')
      .then(res => res.json())
      .then(data => setStats(data.data))
      .catch(err => console.error('Stats failed', err));
  }, []);

  const handleSearch = async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/system/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.data || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const testAI = async () => {
    setLoading(true);
    // This would call /api/v1/system/ai/generate
    setTimeout(() => {
      setAiResult(`Zenith AI: I've analyzed your prompt "${prompt}" and generated a high-converting landing page structure for you.`);
      setLoading(false);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Zenith Playground</h1>
          <p className="text-text-secondary">Test the bleeding-edge features of the Zenith v2 Engine</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AI Content Generation */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 text-accent">
              <Sparkles size={24} />
              <h3 className="text-xl font-bold text-text-primary">AI Content Engine</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Generate SEO-optimized content, meta descriptions, and image alt-texts automatically.
            </p>
            <div className="space-y-2">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask Zenith AI to generate something..."
                className="w-full bg-app-subtle border border-border rounded-lg p-3 text-sm focus:border-accent outline-none h-24"
              />
              <button 
                onClick={testAI}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? 'Thinking...' : <><Zap size={16} /> Generate with Zenith AI</>}
              </button>
            </div>
            {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'System Uptime', value: stats ? `${Math.floor(stats.uptime / 3600)}h ${Math.floor((stats.uptime % 3600) / 60)}m` : '...', icon: Activity, color: 'text-green-500' },
          { label: 'Collections', value: stats?.collectionsCount || '...', icon: Zap, color: 'text-yellow-500' },
          { label: 'Memory Usage', value: stats ? `${Math.round(stats.memory.rss / 1024 / 1024)}MB` : '...', icon: Shield, color: 'text-blue-500' },
          { label: 'Node Version', value: stats?.nodeVersion || '...', icon: Command, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </motion.div>
        ))}
      </div>
            {aiResult && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-sm text-accent italic"
              >
                {aiResult}
              </motion.div>
            )}
          </div>

          {/* Real-time Collaboration */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 text-success">
              <Activity size={24} />
              <h3 className="text-xl font-bold text-text-primary">Live Presence</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Multi-user awareness for collaborative editing. No more content overwrites.
            </p>
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-app-bg bg-accent flex items-center justify-center text-white font-bold text-xs">
                  U{i}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-app-bg bg-app-subtle flex items-center justify-center text-text-muted text-xs font-bold">
                +4
              </div>
            </div>
            <div className="text-xs text-text-muted italic">
              7 users currently exploring the Zenith ecosystem
            </div>
          </div>

          {/* Global Search */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 text-warning">
              <Search size={24} />
              <h3 className="text-xl font-bold text-text-primary">Omni-Search</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Fast, cross-collection search powered by Zenith's unified indexing.
            </p>
            <div className="p-3 bg-app-subtle border border-border rounded flex items-center gap-3 text-text-muted cursor-pointer hover:border-accent group transition-all">
              <Command size={14} className="group-hover:text-accent" />
              <span className="text-sm">Press <kbd className="bg-border px-1 rounded">Ctrl</kbd> + <kbd className="bg-border px-1 rounded">K</kbd> to search</span>
            </div>
          </div>

          {/* Security & Hardening */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 text-error">
              <Shield size={24} />
              <h3 className="text-xl font-bold text-text-primary">Bulletproof Security</h3>
            </div>
            <ul className="text-sm text-text-secondary space-y-2">
              <li className="flex items-center gap-2">✓ Field-level RBAC</li>
              <li className="flex items-center gap-2">✓ CSRF Protection</li>
              <li className="flex items-center gap-2">✓ Rate Limiting (Tiered)</li>
              <li className="flex items-center gap-2">✓ Automated Audit Trails</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DemoFeatures;
