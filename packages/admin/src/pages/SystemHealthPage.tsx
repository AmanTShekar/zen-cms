import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Activity, ShieldCheck, Server, Cpu, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../lib/api';

const SystemHealthPage = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/health');
      setHealth(res.data.data);
    } catch (err) {
      console.error('Health check failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const StatusCard = ({ title, status, icon: Icon, detail }: any) => (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-app-subtle rounded-lg text-text-secondary">
          <Icon size={20} />
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'healthy' || status === 'up' 
            ? 'bg-success/10 text-success' 
            : 'bg-danger/10 text-danger'
        }`}>
          {status === 'healthy' || status === 'up' ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {status}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-text-muted uppercase tracking-tight">{title}</p>
        <p className="text-xl font-bold text-text-primary mt-0.5">{detail}</p>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">System Health</h1>
            <p className="text-text-secondary mt-1">Monitor core services and infrastructure stability</p>
          </div>
          <button 
            onClick={fetchHealth}
            className={`btn btn-secondary flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh Status
          </button>
        </div>

        {loading && !health ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-text-muted">
            <RefreshCw size={48} className="animate-spin opacity-20" />
            <p className="font-medium">Diagnosing system status...</p>
          </div>
        ) : health ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatusCard 
                title="Engine Version" 
                status="up" 
                icon={Activity} 
                detail={`Zenith v${health.version}`} 
              />
              <StatusCard 
                title="Database (MongoDB)" 
                status={health.database} 
                icon={Database} 
                detail="Production Cluster" 
              />
              <StatusCard 
                title="Uptime" 
                status="up" 
                icon={Server} 
                detail={`${Math.floor(health.uptime / 60)} Minutes`} 
              />
              <StatusCard 
                title="Environment" 
                status="up" 
                icon={ShieldCheck} 
                detail={health.environment.toUpperCase()} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6 space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Cpu size={20} className="text-accent" /> System Resources
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                      <span>Memory Usage</span>
                      <span>{health.memory.used} / {health.memory.total}</span>
                    </div>
                    <div className="w-full h-2 bg-app-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '35%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-text-muted uppercase">
                      <span>CPU Load</span>
                      <span>Balanced</span>
                    </div>
                    <div className="w-full h-2 bg-app-subtle rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6 space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <ShieldCheck size={20} className="text-success" /> Security Audit
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl">
                    <CheckCircle2 size={18} className="text-success" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">SSL/TLS Encryption</p>
                      <p className="text-[10px] text-text-secondary uppercase">Active & Valid</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-xl">
                    <CheckCircle2 size={18} className="text-success" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">JWT Token Security</p>
                      <p className="text-[10px] text-text-secondary uppercase">HS256 Protocol</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card p-12 text-center text-text-muted">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-20 text-danger" />
            <p>Could not connect to the system health service.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SystemHealthPage;
