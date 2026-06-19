import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap, Plus, Settings, Webhook, Mail, Database, Trash2, Clock, Terminal,
  Workflow, Save, X, Loader2, Info, MessageSquare, Globe, Cpu, Play, AlertCircle, CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { PageHeader } from '../components/ui/PageHeader'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  Panel,
  MarkerType,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTheme } from '../context/ThemeContext'

// ── Types ──────────────────────────────────────────────────────────────────────

interface FlowNode {
  id: string
  type: 'trigger' | 'action'
  position: { x: number; y: number }
  data: Record<string, any>
  selected?: boolean
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
  style?: any
  markerEnd?: any
}

interface Flow {
  _id?: string
  name: string
  description: string
  active: boolean
  nodes: FlowNode[]
  edges: FlowEdge[]
  trigger?: any
  steps?: any[]
}

interface RunLog {
  level: 'info' | 'error' | 'success'
  msg: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  { id: 'http',           name: 'HTTP Request',    icon: Globe,         color: 'text-z-active-text',    desc: 'Outbound REST API call' },
  { id: 'ai_prompt',      name: 'AI Engine',       icon: Cpu,           color: 'text-purple-400',  desc: 'Pass payload to AI model' },
  { id: 'slack',          name: 'Slack Alert',     icon: MessageSquare, color: 'text-z-active-text', desc: 'Team webhook notification' },
  { id: 'email',          name: 'Email Dispatch',  icon: Mail,          color: 'text-sky-400',     desc: 'SMTP relay' },
  { id: 'log',            name: 'System Log',      icon: Terminal,      color: 'text-z-muted',    desc: 'Permanent audit entry' },
  { id: 'update_content', name: 'Database Update', icon: Database,      color: 'text-amber-400',   desc: 'Mutate Zenith records' },
  { id: 'webhook',        name: 'Webhook',         icon: Webhook,       color: 'text-pink-400',    desc: 'Standard webhook push' },
]

const TRIGGER_TYPES = [
  { id: 'webhook',           name: 'Webhook',        icon: Zap,      detail: 'POST',  desc: 'Triggered by inbound HTTP POST' },
  { id: 'collection_change', name: 'Data Event',     icon: Database, detail: 'DB',    desc: 'On create/update/delete' },
  { id: 'schedule',          name: 'Cron Schedule',  icon: Clock,    detail: 'CRON',  desc: 'Time-based execution' },
]

const EDGE_STYLE = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: 'var(--z-accent)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--z-accent)' }
}

// ── Custom Nodes ───────────────────────────────────────────────────────────────

const TriggerNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const t = TRIGGER_TYPES.find(x => x.id === data.triggerType) || TRIGGER_TYPES[0]
  return (
    <div className={cn(
      'px-5 py-4 bg-black border min-w-[220px] transition-all duration-200 cursor-pointer',
      selected
        ? 'border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
        : 'border-white/10 hover:border-white/20 shadow-[var(--z-active-glow)]'
    )}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">
          <t.icon size={16} />
        </div>
        <div>
          <div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-500/70">Trigger · {t.detail}</div>
          <div className="text-[11px] font-bold text-white mt-0.5">{t.name}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-z-accent !border-2 !border-black" />
    </div>
  )
}

const ActionNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const t = ACTION_TYPES.find(x => x.id === data.actionType) || ACTION_TYPES[0]
  return (
    <div className={cn(
      'px-5 py-4 bg-black border min-w-[220px] transition-all duration-200 cursor-pointer',
      selected
        ? 'border-z-accent shadow-[var(--z-active-glow)]'
        : 'border-white/10 hover:border-white/20 shadow-[var(--z-active-glow)]'
    )}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-500 !border-2 !border-black" />
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 flex items-center justify-center bg-z-hover border border-white/10 flex-shrink-0', t.color)}>
          <t.icon size={16} />
        </div>
        <div>
          <div className={cn('text-[8px] font-black uppercase tracking-[0.3em]', t.color.replace('text-', 'text-').replace('-400', '-400/70'))}>
            Action · {t.id}
          </div>
          <div className="text-[11px] font-bold text-white mt-0.5">{data.label || t.name}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-z-accent !border-2 !border-black" />
    </div>
  )
}

const nodeTypes = { trigger: TriggerNode, action: ActionNode }

// ── Config Panel Fields ────────────────────────────────────────────────────────

const FieldInput = ({ label, value, onChange, placeholder, type = 'text', mono = false }: any) => (
  <div className="space-y-1.5">
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-z-panel backdrop-blur-md border border-z-border px-3 py-2.5 text-[11px] text-white outline-none rounded-none',
        'focus:border-z-accent/50 transition-colors placeholder:text-gray-700',
        mono && 'font-mono'
      )}
    />
  </div>
)

const FieldTextarea = ({ label, value, onChange, placeholder, rows = 4, mono = false }: any) => (
  <div className="space-y-1.5">
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'w-full bg-z-panel backdrop-blur-md border border-z-border px-3 py-2.5 text-[11px] text-white outline-none resize-none rounded-none',
        'focus:border-z-accent/50 transition-colors placeholder:text-gray-700',
        mono && 'font-mono'
      )}
    />
  </div>
)

const FieldSelect = ({ label, value, onChange, options }: any) => (
  <div className="space-y-1.5">
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-z-panel backdrop-blur-md border border-z-border px-3 py-2.5 text-[11px] text-white outline-none focus:border-z-accent/50 transition-colors appearance-none rounded-none"
    >
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

// ── Main Page ──────────────────────────────────────────────────────────────────

const FlowBuilderPage: React.FC = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [flows, setFlows] = useState<Flow[]>([])
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [runLogs, setRunLogs] = useState<RunLog[]>([])
  const [showLogs, setShowLogs] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  const activeNode = nodes.find(n => n.selected)

  // ── Data Fetching ────────────────────────────────────────────────────────────

  const fetchFlows = async () => {
    try {
      const res = await api.get('/flows')
      setFlows(res.data.data || [])
    } catch {
      toast.error('Registry sync failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFlows() }, [])

  useEffect(() => {
    if (!selectedFlow) return
    if (selectedFlow.nodes?.length > 0) {
      setNodes(selectedFlow.nodes as any)
      setEdges(selectedFlow.edges as any || [])
    } else {
      const n = [{ id: 'trigger_1', type: 'trigger' as const, position: { x: 200, y: 80 }, data: { triggerType: selectedFlow.trigger?.type || 'webhook', ...selectedFlow.trigger?.config } }]
      setNodes(n as any)
      setEdges([])
    }
    setRunLogs([])
    setShowLogs(false)
  }, [selectedFlow?._id])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, ...EDGE_STYLE }, eds))
  }, [setEdges])

  const createNewFlow = () => {
    const initialNodes: FlowNode[] = [
      { id: 'trigger_1', type: 'trigger', position: { x: 200, y: 80 }, data: { triggerType: 'webhook' } }
    ]
    const newFlow: Flow = {
      name: 'NEW_AUTOMATION',
      description: 'Untitled automation sequence',
      active: false,
      nodes: initialNodes,
      edges: []
    }
    setSelectedFlow(newFlow)
    setNodes(initialNodes as any)
    setEdges([])
    setRunLogs([])
    setShowLogs(false)
  }

  const saveFlow = async () => {
    if (!selectedFlow) return
    setSaving(true)
    try {
      const payload = { ...selectedFlow, nodes, edges }
      if (selectedFlow._id) {
        await api.patch(`/flows/${selectedFlow._id}`, payload)
        toast.success('Automation saved')
      } else {
        const res = await api.post('/flows', payload)
        setSelectedFlow(res.data.data)
        setFlows(prev => [res.data.data, ...prev])
        toast.success('Automation created')
      }
      fetchFlows()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteFlow = async (id?: string) => {
    if (!id) { setSelectedFlow(null); return }
    if (!confirm('Delete this automation permanently?')) return
    try {
      await api.delete(`/flows/${id}`)
      setFlows(prev => prev.filter(f => f._id !== id))
      setSelectedFlow(null)
      toast.success('Automation deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  const addActionNode = (actionType: string) => {
    const sourceId = activeNode?.id || nodes[nodes.length - 1]?.id
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: 'action',
      position: { x: 200, y: nodes.length * 170 + 80 },
      data: { actionType, label: ACTION_TYPES.find(a => a.id === actionType)?.name }
    }
    setNodes(nds => [...nds, newNode as any])
    if (sourceId) {
      setEdges(eds => addEdge({
        id: `e_${sourceId}_${newNode.id}`,
        source: sourceId,
        target: newNode.id,
        ...EDGE_STYLE
      }, eds))
    }
    setShowNodeMenu(false)
  }

  const updateNodeData = (id: string, patch: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
  }

  const deselectAll = () => {
    setNodes(nds => nds.map(n => ({ ...n, selected: false })))
  }

  const testFlow = async () => {
    if (!selectedFlow?._id) {
      toast.error('Save the automation before testing')
      return
    }
    setTestRunning(true)
    setShowLogs(true)
    setRunLogs([{ level: 'info', msg: 'Dispatching test trigger...' }])
    try {
      const res = await api.post(`/flows/${selectedFlow._id}/test`, { payload: { test: true, timestamp: new Date().toISOString() } })
      const logs: RunLog[] = res.data?.data?.logs || [{ level: 'success', msg: 'Flow executed successfully' }]
      setRunLogs(logs)
    } catch (err: any) {
      setRunLogs([{ level: 'error', msg: err?.response?.data?.message || 'Test execution failed' }])
    } finally {
      setTestRunning(false)
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-[calc(100vh-73px)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">Loading Automations…</span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={cn('-m-6 md:-m-10 h-[calc(100vh-73px)] flex overflow-hidden font-sans', dark ? 'bg-black' : 'bg-[#fafafa]')}>

      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <div className={cn('w-64 flex-shrink-0 border-r flex flex-col z-10', dark ? 'bg-black border-z-border' : 'bg-z-panel border-z-border')}>
        <div className={cn('p-5 border-b flex items-center justify-between flex-shrink-0', dark ? 'border-z-border' : 'border-z-border')}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-[var(--z-active-glow)]" />
            <span className={cn('text-[9px] font-black uppercase tracking-[0.3em]', dark ? 'text-white' : 'text-black')}>Automations</span>
          </div>
          <button
            onClick={createNewFlow}
            title="New automation"
            className={cn('w-7 h-7 flex items-center justify-center hover:scale-105 transition-all', dark ? 'bg-white text-black' : 'bg-black text-white')}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {flows.length === 0 && (
            <p className="text-[9px] text-gray-600 uppercase tracking-widest p-3 text-center">No automations yet</p>
          )}
          {flows.map(flow => (
            <button
              key={flow._id}
              onClick={() => setSelectedFlow(flow)}
              className={cn(
                'w-full text-left px-3 py-3 transition-all flex flex-col border group',
                selectedFlow?._id === flow._id
                  ? (dark ? 'bg-white/[0.06] border-z-border-strong' : 'bg-black/5 border-gray-400')
                  : (dark ? 'border-transparent hover:bg-z-hover hover:border-z-border' : 'border-transparent hover:bg-black/[0.03] hover:border-z-border')
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-[9px] font-black uppercase tracking-tight truncate max-w-[140px]', dark ? 'text-white' : 'text-z-primary')}>
                  {flow.name}
                </span>
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', flow.active ? 'bg-z-accent shadow-[var(--z-active-glow)]' : 'bg-gray-700')} />
              </div>
              <p className="text-[8px] text-z-secondary uppercase tracking-tight truncate">
                {(flow.nodes?.length || 0)} nodes · {flow.active ? 'Live' : 'Idle'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedFlow ? (
          <>
            {/* Header */}
            <PageHeader
              title={
                <input
                  value={selectedFlow.name}
                  onChange={e => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                  className="bg-transparent text-xl font-black uppercase tracking-tighter outline-none focus-visible:ring-2 focus-visible:ring-z-active-border min-w-[200px] max-w-[400px]"
                />
              }
              description={
                <input
                  value={selectedFlow.description}
                  onChange={e => setSelectedFlow({ ...selectedFlow, description: e.target.value })}
                  className="bg-transparent text-inherit uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-z-active-border w-full max-w-md"
                />
              }
              actions={
                <>
                  <button
                    onClick={testFlow}
                    disabled={testRunning || !selectedFlow._id}
                    title={!selectedFlow._id ? 'Save first to test' : 'Run test execution'}
                    className={cn(
                      'px-4 h-9 border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                      'border-z-border text-z-muted hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    {testRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Test Run
                  </button>
                  <button
                    onClick={() => setSelectedFlow({ ...selectedFlow, active: !selectedFlow.active })}
                    className={cn(
                      'px-4 h-9 border text-[9px] font-black uppercase tracking-widest transition-all',
                      selectedFlow.active
                        ? 'border-z-accent text-z-active-text bg-z-active-bg hover:bg-z-accent/20'
                        : 'border-z-border text-z-secondary hover:border-white/20 hover:text-white'
                    )}
                  >
                    {selectedFlow.active ? '● Live' : '○ Idle'}
                  </button>
                  <button
                    onClick={saveFlow}
                    disabled={saving}
                    className="px-5 h-9 bg-z-accent text-white text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save
                  </button>
                  <button
                    onClick={() => deleteFlow(selectedFlow._id)}
                    className="h-9 w-9 flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              }
            />

            {/* Canvas + Config Panel Row */}
            <div className="flex-1 flex overflow-hidden">

              {/* React Flow Canvas */}
              <div className="flex-1 overflow-hidden">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  onPaneClick={() => { deselectAll(); setShowNodeMenu(false) }}
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  minZoom={0.2}
                  maxZoom={2}
                  deleteKeyCode="Delete"
                >
                  <Background color={dark ? '#222' : '#ddd'} gap={20} size={1} />
                  <Controls
                    showInteractive={false}
                    className={cn(
                      '!shadow-xl !border',
                      dark ? '!bg-z-panel backdrop-blur-md !border-z-border' : '!bg-white !border-z-border'
                    )}
                  />
                  <MiniMap
                    nodeColor={() => dark ? '#27272a' : '#e4e4e7'}
                    maskColor={dark ? 'rgba(0,0,0,0.75)' : 'rgba(250,250,250,0.75)'}
                    className={cn('!border !shadow-xl', dark ? '!bg-z-panel backdrop-blur-md !border-z-border' : '!bg-white !border-z-border')}
                  />

                  {/* Add Node Panel */}
                  <Panel position="bottom-center" className="mb-6 pointer-events-auto">
                    <div className="relative flex flex-col items-center">
                      <AnimatePresence>
                        {showNodeMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full mb-3 bg-z-panel backdrop-blur-md border border-white/10 p-2 grid grid-cols-2 gap-1.5 min-w-[320px] shadow-[var(--z-active-glow)]"
                          >
                            <div className="col-span-2 px-2 pt-1 pb-2 border-b border-z-border">
                              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">Add Action Node</p>
                            </div>
                            {ACTION_TYPES.map(type => (
                              <button
                                key={type.id}
                                onClick={() => addActionNode(type.id)}
                                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-z-hover border border-transparent hover:border-z-border transition-all text-left"
                              >
                                <div className={cn('w-7 h-7 flex items-center justify-center bg-black border border-z-border flex-shrink-0', type.color)}>
                                  <type.icon size={13} />
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-white">{type.name}</div>
                                  <div className="text-[7px] text-gray-600 uppercase tracking-wider">{type.desc}</div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={() => setShowNodeMenu(v => !v)}
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200',
                          showNodeMenu
                            ? 'bg-z-accent border-z-active-border text-white rotate-45 shadow-[var(--z-active-glow)]'
                            : 'bg-black border-white/10 text-white hover:border-z-accent hover:text-z-active-text shadow-[var(--z-active-glow)]'
                        )}
                      >
                        <Plus size={22} className="transition-transform duration-200" />
                      </button>
                    </div>
                  </Panel>
                </ReactFlow>
              </div>

              {/* Right Config Panel — flex sibling, not absolute */}
              <AnimatePresence mode="wait">
                {activeNode && (
                  <motion.div
                    key={activeNode.id}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 360, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex-shrink-0 border-l flex flex-col overflow-hidden',
                      'z-panel'
                    )}
                    style={{ width: 360 }}
                  >
                    {/* Panel Header */}
                    <div className={cn('px-5 py-4 border-b flex items-center justify-between flex-shrink-0', dark ? 'border-z-border' : 'border-z-border')}>
                      <div className="flex items-center gap-2.5">
                        <Settings size={13} className="text-z-secondary" />
                        <span className={cn('text-[9px] font-black uppercase tracking-[0.25em]', dark ? 'text-white' : 'text-z-primary')}>
                          Configure Node
                        </span>
                      </div>
                      <button onClick={deselectAll} className="text-z-secondary hover:text-white transition-colors p-1">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Panel Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                      {/* Interpolation hint */}
                      <div className="bg-z-accent/5 border border-z-accent/15 p-3 flex gap-2.5">
                        <Info size={11} className="text-z-active-text flex-shrink-0 mt-0.5" />
                        <p className="text-[8px] text-z-muted uppercase tracking-widest leading-relaxed">
                          Use <code className="text-z-active-text font-mono">{'{{payload.field}}'}</code> to inject data from the trigger into any field.
                        </p>
                      </div>

                      {activeNode.type === 'trigger' ? (
                        <TriggerConfigPanel
                          node={activeNode}
                          flowId={selectedFlow._id}
                          updateNodeData={updateNodeData}
                          dark={dark}
                        />
                      ) : (
                        <ActionConfigPanel
                          node={activeNode}
                          updateNodeData={updateNodeData}
                          dark={dark}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Execution Log Panel */}
            <AnimatePresence>
              {showLogs && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 180 }}
                  exit={{ height: 0 }}
                  className={cn('flex-shrink-0 border-t overflow-hidden', dark ? 'border-z-border bg-black' : 'border-z-border bg-gray-50')}
                >
                  <div className={cn('px-5 py-2.5 border-b flex items-center justify-between', dark ? 'border-z-border' : 'border-z-border')}>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-z-secondary">Execution Log</span>
                    <button onClick={() => setShowLogs(false)} className="text-gray-600 hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  <div className="p-4 space-y-1.5 overflow-y-auto h-[calc(180px-36px)] font-mono">
                    {runLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {log.level === 'error'
                          ? <AlertCircle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
                          : log.level === 'success'
                          ? <CheckCircle2 size={11} className="text-z-active-text flex-shrink-0 mt-0.5" />
                          : <div className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />}
                        <span className={cn('text-[9px]', log.level === 'error' ? 'text-red-400' : log.level === 'success' ? 'text-z-active-text' : 'text-z-muted')}>
                          {log.msg}
                        </span>
                      </div>
                    ))}
                    {testRunning && (
                      <div className="flex items-center gap-2.5">
                        <Loader2 size={11} className="animate-spin text-z-secondary" />
                        <span className="text-[9px] text-z-secondary">Running…</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className={cn('w-28 h-28 border flex items-center justify-center mb-10 group transition-all duration-500', dark ? 'border-z-border bg-z-panel hover:border-z-active-border' : 'border-z-border bg-gray-50 hover:border-z-active-border')}>
              <Workflow size={44} className="text-gray-600 group-hover:text-z-active-text transition-colors duration-500" />
            </div>
            <h2 className={cn('text-2xl font-black uppercase tracking-tighter mb-3', dark ? 'text-white' : 'text-z-primary')}>
              Enterprise Automations
            </h2>
            <p className="text-[10px] text-z-secondary uppercase tracking-[0.3em] max-w-sm leading-loose">
              Build visual workflow graphs connecting triggers to actions. Supports HTTP, AI, Slack, email, and database operations.
            </p>
            <button
              onClick={createNewFlow}
              className="mt-10 px-10 py-3.5 bg-z-accent text-white font-black uppercase tracking-[0.25em] text-[9px] hover:opacity-90 active:scale-95 transition-all shadow-[var(--z-active-glow)]"
            >
              Create Automation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components for config panel ───────────────────────────────────────────

function TriggerConfigPanel({ node, flowId, updateNodeData, dark }: any) {
  const d = node.data
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Trigger Type</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TRIGGER_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => updateNodeData(node.id, { triggerType: t.id })}
              title={t.desc}
              className={cn(
                'py-2.5 px-2 text-[8px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5',
                d.triggerType === t.id
                  ? 'bg-white text-black border-white'
                  : (dark ? 'bg-z-hover border-z-border text-z-muted hover:text-white hover:border-white/20' : 'bg-gray-100 border-z-border text-gray-600 hover:border-gray-400')
              )}
            >
              <t.icon size={13} />
              {t.detail}
            </button>
          ))}
        </div>
      </div>

      {d.triggerType === 'webhook' && (
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">Inbound Webhook URL</label>
          <div className={cn('px-3 py-2.5 border flex items-center gap-2', dark ? 'bg-black border-z-border' : 'bg-gray-100 border-z-border')}>
            <code className="text-[9px] text-z-active-text font-mono truncate flex-1">
              {flowId ? `POST /api/v1/hooks/${flowId}` : 'Save automation to get URL'}
            </code>
          </div>
          <p className="text-[8px] text-gray-600 uppercase tracking-wider">Send a POST request to this endpoint to trigger the flow</p>
        </div>
      )}

      {d.triggerType === 'collection_change' && (
        <>
          <FieldInput label="Collection Slug" value={d.collection} onChange={(v: string) => updateNodeData(node.id, { collection: v })} placeholder="e.g. posts, products" />
          <FieldSelect
            label="Event Action"
            value={d.action || ''}
            onChange={(v: string) => updateNodeData(node.id, { action: v })}
            options={[
              { value: '', label: 'Any (create, update, delete)' },
              { value: 'create', label: 'Create only' },
              { value: 'update', label: 'Update only' },
              { value: 'delete', label: 'Delete only' },
            ]}
          />
        </>
      )}

      {d.triggerType === 'schedule' && (
        <FieldInput label="Cron Expression" value={d.cron} onChange={(v: string) => updateNodeData(node.id, { cron: v })} placeholder="0 9 * * 1 (every Monday 9am)" mono />
      )}
    </div>
  )
}

function ActionConfigPanel({ node, updateNodeData, dark }: any) {
  const d = node.data
  const upd = (patch: Record<string, any>) => updateNodeData(node.id, patch)

  return (
    <div className="space-y-5">
      <FieldInput label="Node Label" value={d.label} onChange={(v: string) => upd({ label: v })} placeholder="Describe this step…" />

      {d.actionType === 'http' && (
        <>
          <FieldSelect
            label="Method"
            value={d.method || 'POST'}
            onChange={(v: string) => upd({ method: v })}
            options={['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m }))}
          />
          <FieldInput label="Endpoint URL" value={d.url} onChange={(v: string) => upd({ url: v })} placeholder="https://api.example.com/v1/..." mono />
          <FieldTextarea label="Headers (JSON)" value={d.headers} onChange={(v: string) => upd({ headers: v })} placeholder={'{"Authorization": "Bearer {{env.API_KEY}}"}'} rows={3} mono />
          <FieldTextarea label="Body (JSON)" value={d.body} onChange={(v: string) => upd({ body: v })} placeholder={'{"event": "{{payload.type}}", "data": "{{payload}}"}'} rows={5} mono />
        </>
      )}

      {d.actionType === 'slack' && (
        <>
          <FieldInput label="Slack Webhook URL" value={d.webhookUrl} onChange={(v: string) => upd({ webhookUrl: v })} placeholder="https://hooks.slack.com/services/..." mono />
          <FieldTextarea label="Message" value={d.message} onChange={(v: string) => upd({ message: v })} placeholder="🚨 Alert: {{payload.title}} was updated!" rows={4} />
        </>
      )}

      {d.actionType === 'email' && (
        <>
          <FieldInput label="To" value={d.to} onChange={(v: string) => upd({ to: v })} placeholder="user@example.com or {{payload.email}}" />
          <FieldInput label="Subject" value={d.subject} onChange={(v: string) => upd({ subject: v })} placeholder="Notification: {{payload.title}}" />
          <FieldTextarea label="Body (HTML)" value={d.body} onChange={(v: string) => upd({ body: v })} placeholder="<h2>Hello!</h2><p>{{payload.content}}</p>" rows={5} mono />
        </>
      )}

      {d.actionType === 'ai_prompt' && (
        <>
          <FieldTextarea label="Prompt" value={d.prompt} onChange={(v: string) => upd({ prompt: v })} placeholder="Translate the following to French: {{payload.content}}" rows={6} />
          <p className="text-[8px] text-gray-600 uppercase tracking-wider">AI output is injected into context as <code className="text-purple-400 font-mono">{'{{nodeId.output}}'}</code> for downstream nodes.</p>
        </>
      )}

      {d.actionType === 'webhook' && (
        <>
          <FieldInput label="Webhook URL" value={d.url} onChange={(v: string) => upd({ url: v })} placeholder="https://..." mono />
          <FieldInput label="Secret (optional)" value={d.secret} onChange={(v: string) => upd({ secret: v })} placeholder="Signing secret" type="password" />
        </>
      )}

      {d.actionType === 'update_content' && (
        <>
          <FieldInput label="Collection Slug" value={d.collection} onChange={(v: string) => upd({ collection: v })} placeholder="e.g. posts" />
          <FieldSelect
            label="Operation"
            value={d.operation || 'update'}
            onChange={(v: string) => upd({ operation: v })}
            options={[
              { value: 'update', label: 'Update document' },
              { value: 'create', label: 'Create document' },
              { value: 'delete', label: 'Delete document' },
            ]}
          />
          <FieldInput label="Document ID (or $.path)" value={d.documentId} onChange={(v: string) => upd({ documentId: v })} placeholder="{{payload._id}} or $.id" mono />
          <FieldTextarea label="Fields (JSON)" value={d.fields} onChange={(v: string) => upd({ fields: v })} placeholder={'{"status": "published", "updatedAt": "{{payload.updatedAt}}"}'} rows={5} mono />
        </>
      )}

      {d.actionType === 'log' && (
        <FieldInput label="Log Message" value={d.message} onChange={(v: string) => upd({ message: v })} placeholder="Flow executed: {{payload.title}}" />
      )}
    </div>
  )
}

export default FlowBuilderPage


