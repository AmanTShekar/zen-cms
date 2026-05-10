import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { 
  Settings, 
  Globe, 
  Shield, 
  Bell, 
  Database, 
  Save, 
  Server, 
  Loader2, 
  Lock, 
  Mail, 
  HardDrive, 
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { useSearchParams } from 'react-router-dom';

const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [dbStats, setDbStats] = useState<any>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const [settings, setSettings] = useState<any>({
    siteName: '',
    publicUrl: '',
    maintenanceMode: false,
    enableDrafts: true,
    defaultLocale: 'en',
    allowedOrigins: ['*'],
    // Security
    jwtExpiresIn: '7d',
    passwordMinLength: 8,
    rateLimitWindow: 15,
    rateLimitMax: 100,
    // Notifications
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    // Database
    maxPoolSize: 10,
    enableBackup: false,
    backupInterval: 'daily'
  });

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'database') {
      fetchDbStats();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/system/settings');
      if (response.data?.data) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDbStats = async () => {
    try {
      const res = await api.get('/system/db/stats');
      setDbStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch DB stats');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/system/settings', settings);
      toast.success('System settings updated successfully');
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await api.post('/system/smtp/test', {
        smtpHost: settings.smtpHost,
        smtpUser: settings.smtpUser
      });
      if (res.data.data.success) {
        toast.success(res.data.data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'SMTP test failed');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleFlushCache = async () => {
    if (!confirm('Are you sure you want to flush the system cache? This may cause a temporary performance dip.')) return;
    setFlushing(true);
    try {
      await api.post('/system/cache/flush');
      toast.success('System cache flushed');
    } catch (err) {
      toast.error('Failed to flush cache');
    } finally {
      setFlushing(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'database', label: 'Database', icon: Database },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-text-primary uppercase tracking-tight italic">System Configuration</h1>
            <p className="text-text-secondary mt-1 text-sm opacity-60">Manage your Zenith instance core parameters and infrastructure.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-success/10 text-success text-[10px] font-bold rounded-full uppercase border border-success/20">System Online</div>
             <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${
                    isActive 
                      ? "bg-accent text-white shadow-lg shadow-accent/25 translate-x-2" 
                      : "text-text-secondary hover:bg-app-surface hover:text-text-primary"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
            
            <div className="pt-8 px-5">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Instance Info</p>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-text-muted uppercase font-bold">Node Version</span>
                  <span className="text-xs text-text-primary font-mono">{process.env.NODE_ENV || 'v18.16.0'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-text-muted uppercase font-bold">Zenith Core</span>
                  <span className="text-xs text-text-primary font-mono">v1.2.4-stable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {activeTab === 'general' && (
                  <div className="card p-8 space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-text-primary uppercase italic flex items-center gap-2">
                        <Globe size={20} className="text-accent" />
                        Global Presence
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Site Identity</label>
                          <input 
                            type="text" 
                            value={settings.siteName}
                            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="e.g. Zenith CMS"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Base Public URL</label>
                          <input 
                            type="text" 
                            value={settings.publicUrl}
                            onChange={(e) => setSettings({ ...settings, publicUrl: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="https://zenith.io"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border pb-2">Operational State</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div 
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${settings.enableDrafts ? 'bg-accent/5 border-accent/20' : 'bg-app-subtle border-border'}`}
                            onClick={() => setSettings({ ...settings, enableDrafts: !settings.enableDrafts })}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${settings.enableDrafts ? 'bg-accent text-white' : 'bg-app-surface text-text-muted'}`}>
                                <RefreshCcw size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary">Drafting Engine</p>
                                <p className="text-[10px] text-text-secondary">Enable multi-stage publishing</p>
                              </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.enableDrafts ? 'bg-accent' : 'bg-app-bg'}`}>
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.enableDrafts ? 'right-1' : 'left-1'}`}></div>
                            </div>
                          </div>

                          <div 
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${settings.maintenanceMode ? 'bg-danger/5 border-danger/20' : 'bg-app-subtle border-border'}`}
                            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${settings.maintenanceMode ? 'bg-danger text-white' : 'bg-app-surface text-text-muted'}`}>
                                <Server size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary">Maintenance</p>
                                <p className="text-[10px] text-text-secondary">Lock API for maintenance</p>
                              </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.maintenanceMode ? 'bg-danger' : 'bg-app-bg'}`}>
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="card p-8 space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-text-primary uppercase italic flex items-center gap-2">
                        <Lock size={20} className="text-accent" />
                        Access & Encryption
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">JWT Lifecycle</label>
                          <select 
                            value={settings.jwtExpiresIn}
                            onChange={(e) => setSettings({ ...settings, jwtExpiresIn: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium appearance-none"
                          >
                            <option value="1h">1 Hour (Highly Secure)</option>
                            <option value="1d">1 Day</option>
                            <option value="7d">7 Days (Default)</option>
                            <option value="30d">30 Days (Extended)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Password Threshold</label>
                          <input 
                            type="number" 
                            value={settings.passwordMinLength}
                            onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="8"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border pb-2">Rate Limiting (WAF)</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Window (Minutes)</label>
                            <input 
                              type="number" 
                              value={settings.rateLimitWindow}
                              onChange={(e) => setSettings({ ...settings, rateLimitWindow: parseInt(e.target.value) })}
                              className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Max Req / IP</label>
                            <input 
                              type="number" 
                              value={settings.rateLimitMax}
                              onChange={(e) => setSettings({ ...settings, rateLimitMax: parseInt(e.target.value) })}
                              className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            />
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="card p-8 space-y-8">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-text-primary uppercase italic flex items-center gap-2">
                          <Mail size={20} className="text-accent" />
                          SMTP Configuration
                        </h3>
                        <button 
                          onClick={handleTestSmtp}
                          disabled={testingSmtp}
                          className="btn btn-secondary btn-sm flex items-center gap-2"
                        >
                          {testingSmtp ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          Test Connection
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">SMTP Host</label>
                          <input 
                            type="text" 
                            value={settings.smtpHost || ''}
                            onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="smtp.resend.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Port</label>
                          <input 
                            type="number" 
                            value={settings.smtpPort || ''}
                            onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="587"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">User / API Key</label>
                          <input 
                            type="text" 
                            value={settings.smtpUser || ''}
                            onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Password</label>
                          <input 
                            type="password" 
                            value={settings.smtpPass || ''}
                            onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sender Address</label>
                          <input 
                            type="email" 
                            value={settings.fromEmail || ''}
                            onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                            placeholder="noreply@zenith.io"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'database' && (
                  <div className="space-y-6">
                    <div className="card p-8 space-y-8">
                      <h3 className="text-lg font-black text-text-primary uppercase italic flex items-center gap-2">
                        <Database size={20} className="text-accent" />
                        Infrastructure Health
                      </h3>
                      
                      {dbStats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-app-subtle rounded-2xl border border-border text-center space-y-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Collections</p>
                            <p className="text-xl font-black text-text-primary italic">{dbStats.collections || 0}</p>
                          </div>
                          <div className="p-4 bg-app-subtle rounded-2xl border border-border text-center space-y-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Objects</p>
                            <p className="text-xl font-black text-text-primary italic">{dbStats.objects || 0}</p>
                          </div>
                          <div className="p-4 bg-app-subtle rounded-2xl border border-border text-center space-y-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Storage Size</p>
                            <p className="text-xl font-black text-text-primary italic">{Math.round((dbStats.storageSize || 0) / 1024 / 1024)} MB</p>
                          </div>
                          <div className="p-4 bg-app-subtle rounded-2xl border border-border text-center space-y-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Avg Doc Size</p>
                            <p className="text-xl font-black text-text-primary italic">{Math.round(dbStats.avgObjSize || 0)} B</p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center gap-2 opacity-50">
                          <Activity className="animate-pulse text-accent" size={32} />
                          <p className="text-xs font-bold uppercase tracking-widest">Polling Database Metrics...</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Max Connection Pool</label>
                          <input 
                            type="number" 
                            value={settings.maxPoolSize}
                            onChange={(e) => setSettings({ ...settings, maxPoolSize: parseInt(e.target.value) })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Backup Frequency</label>
                          <select 
                            value={settings.backupInterval}
                            onChange={(e) => setSettings({ ...settings, backupInterval: e.target.value })}
                            className="w-full bg-app-subtle border border-border rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-medium appearance-none"
                          >
                            <option value="hourly">Every Hour</option>
                            <option value="daily">Once Daily</option>
                            <option value="weekly">Once Weekly</option>
                            <option value="disabled">Disabled (Manual Only)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="card p-6 border-danger/20 bg-danger/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-danger/10 text-danger rounded-2xl flex items-center justify-center">
                          <HardDrive size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary uppercase italic tracking-tight">Flush Dynamic Cache</p>
                          <p className="text-xs text-text-secondary opacity-70">Wipe all cached responses and force re-generation.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleFlushCache}
                        disabled={flushing}
                        className="px-6 py-3 bg-danger text-white text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-danger/20 disabled:opacity-50"
                      >
                        {flushing ? <Loader2 className="animate-spin" size={14} /> : "Purge Now"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button 
                onClick={fetchSettings}
                className="px-6 py-3 text-xs font-black text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
              >
                Reset Changes
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-accent text-white text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-accent/25 flex items-center gap-2 min-w-[180px] justify-center"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                Deploy Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
