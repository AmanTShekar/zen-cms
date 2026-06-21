import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Globe,
  History,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Save,
  Settings,
  Share2,
  Terminal,
  Trash2,
  Wand2,
  Webhook,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { PageHeader } from '../components/ui/PageHeader'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import { cn } from '../lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface FlowNode {
  id: string
  type: 'trigger' | 'action' | 'condition'
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
  sourceHandle?: string
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
  runId?: string
  nodeId?: string
  timestamp?: string | Date
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_TYPES = [
  {
    id: 'http',
    name: 'HTTP Request',
    icon: Globe,
    color: 'text-z-active-text',
    desc: 'Outbound REST API call',
  },
  {
    id: 'ai_prompt',
    name: 'AI Engine',
    icon: Cpu,
    color: 'text-purple-400',
    desc: 'Pass payload to AI model',
  },
  {
    id: 'update_content',
    name: 'Database Update',
    icon: Database,
    color: 'text-amber-400',
    desc: 'Mutate Zenith records',
  },
  { id: 'email', name: 'Email Dispatch', icon: Mail, color: 'text-sky-400', desc: 'SMTP relay' },
  {
    id: 'slack',
    name: 'Slack Alert',
    icon: MessageSquare,
    color: 'text-z-active-text',
    desc: 'Team webhook notification',
  },
  {
    id: 'webhook',
    name: 'Webhook',
    icon: Webhook,
    color: 'text-pink-400',
    desc: 'Standard webhook push',
  },
  {
    id: 'delay',
    name: 'Delay / Sleep',
    icon: Clock,
    color: 'text-indigo-300',
    desc: 'Pause execution timer',
  },
  {
    id: 'code',
    name: 'Data Transformer',
    icon: Terminal,
    color: 'text-emerald-400',
    desc: 'Raw JS Payload Mutation',
  },
  {
    id: 'loop',
    name: 'Sub-Flow Iterator',
    icon: Workflow,
    color: 'text-indigo-400',
    desc: 'Spawn Sub-Flow per item',
  },
  {
    id: 'log',
    name: 'System Log',
    icon: Terminal,
    color: 'text-z-muted',
    desc: 'Permanent audit entry',
  },
]

const LOGIC_TYPES = [
  {
    id: 'condition',
    name: 'If / Else',
    icon: Share2,
    color: 'text-indigo-500',
    desc: 'Branch based on payload rules',
  },
]

const TRIGGER_TYPES = [
  {
    id: 'webhook',
    name: 'Webhook',
    icon: Zap,
    detail: 'POST',
    desc: 'Triggered by inbound HTTP POST',
  },
  {
    id: 'collection_change',
    name: 'Data Event',
    icon: Database,
    detail: 'DB',
    desc: 'On create/update/delete',
  },
  {
    id: 'schedule',
    name: 'Cron Schedule',
    icon: Clock,
    detail: 'CRON',
    desc: 'Time-based execution',
  },
]

const EDGE_STYLE = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#10B981', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' },
}

// ── Custom Nodes ───────────────────────────────────────────────────────────────

const TriggerNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = TRIGGER_TYPES.find((x) => x.id === data.triggerType) || TRIGGER_TYPES[0]

  const statusClass =
    data.runStatus === 'success'
      ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500'
      : data.runStatus === 'error'
        ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500 animate-pulse'
        : data.runStatus === 'skipped'
          ? 'opacity-40 grayscale'
          : selected
            ? 'ring-2 ring-amber-500 border-amber-500'
            : 'hover:border-amber-500/50'

  let badgeText = ''
  if (t.id === 'webhook') badgeText = 'Awaiting POST payload'
  if (t.id === 'schedule') badgeText = data.cron || 'Every 1 hour'
  if (t.id === 'collection_change')
    badgeText = data.collection ? `Watch: ${data.collection}` : 'Any collection change'

  return (
    <div
      className={cn(
        'px-5 py-4 border min-w-[220px] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
        dark ? 'bg-black/65 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black',
        statusClass
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 text-amber-500 flex-shrink-0 rounded-sm">
          <t.icon size={16} />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Trigger · {t.detail}
          </div>
          <div className="text-sm font-bold mt-0.5">{t.name}</div>
        </div>
      </div>
      {badgeText && (
        <div
          className={cn(
            'mt-3 px-2.5 py-1.5 border-t text-[10px] font-mono font-bold truncate',
            dark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'
          )}
        >
          {badgeText}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-black"
      />
    </div>
  )
}

const ActionNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const t = ACTION_TYPES.find((x) => x.id === data.actionType) || ACTION_TYPES[0]

  const statusClass =
    data.runStatus === 'success'
      ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500'
      : data.runStatus === 'error'
        ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500 animate-pulse'
        : data.runStatus === 'skipped'
          ? 'opacity-40 grayscale'
          : selected
            ? 'ring-2 ring-z-accent border-z-accent'
            : 'hover:border-z-accent/50'

  let badgeText = ''
  if (t.id === 'http') badgeText = `[${data.method || 'GET'}] ${data.url || 'No URL'}`
  else if (t.id === 'slack') badgeText = `Channel: ${data.channel || '#general'}`
  else if (t.id === 'email') badgeText = `To: ${data.to || 'Unknown'}`
  else if (t.id === 'update_content') badgeText = `Update: ${data.collection || 'Record'}`
  else if (t.id === 'ai_prompt')
    badgeText = `Prompt: ${data.prompt ? data.prompt.substring(0, 20) + '...' : 'Unknown'}`
  else if (t.id === 'delay') badgeText = `Wait: ${data.amount || 0} ${data.unit || 'seconds'}`
  else if (t.id === 'code') badgeText = `{ JS Transformer }`
  else if (t.id === 'loop') badgeText = `Iterate: ${data.arrayPath || 'Array'}`

  return (
    <div
      className={cn(
        'px-5 py-4 border min-w-[220px] transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)]',
        dark ? 'bg-black/65 border-white/10 text-white' : 'bg-white/80 border-black/10 text-black',
        statusClass
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-black"
      />
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-9 h-9 flex items-center justify-center border flex-shrink-0 rounded-sm',
            dark ? 'bg-z-hover border-z-border' : 'bg-gray-50 border-gray-200',
            t.color
          )}
        >
          <t.icon size={16} />
        </div>
        <div>
          <div
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider',
              t.color.replace('text-', 'text-').replace('-400', '-500')
            )}
          >
            Action · {t.id}
          </div>
          <div className="text-sm font-bold mt-0.5">{data.label || t.name}</div>
        </div>
      </div>
      {badgeText && (
        <div
          className={cn(
            'mt-3 px-2.5 py-1.5 border-t text-[10px] font-mono font-bold truncate',
            dark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'
          )}
        >
          {badgeText}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-black"
      />
    </div>
  )
}

const ConditionNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const statusClass =
    data.runStatus === 'success'
      ? 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500'
      : data.runStatus === 'error'
        ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] border-red-500 animate-pulse'
        : data.runStatus === 'skipped'
          ? 'opacity-40 grayscale'
          : selected
            ? 'ring-2 ring-indigo-500 border-indigo-500'
            : 'hover:border-indigo-500/50'

  return (
    <div
      className={cn(
        'px-5 py-4 border-2 min-w-[220px] transition-all duration-300 cursor-pointer shadow-[4px_4px_0_0_#000]',
        dark ? 'bg-black border-white text-white shadow-[4px_4px_0_0_#fff]' : 'bg-white border-black text-black',
        statusClass
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-black"
      />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex-shrink-0 rounded-sm">
          <Share2 size={16} />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
            Condition
          </div>
          <div className="text-sm font-bold mt-0.5">{data.label || 'If / Else'}</div>
        </div>
      </div>
      <div
        className={cn(
          'mt-3 px-2.5 py-1.5 border-t text-[10px] font-mono font-bold flex items-center justify-center',
          dark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'
        )}
      >
        {data.condition || 'No condition set'}
      </div>
      <div className={cn("mt-4 pt-2 border-t flex justify-between px-2 text-[8px] font-black uppercase tracking-wider", dark ? "border-white/10" : "border-black/10")}>
        <span className="text-emerald-500">True</span>
        <span className="text-red-500">False</span>
      </div>
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white dark:!border-black !left-[20%]"
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white dark:!border-black !left-[80%]"
      />
    </div>
  )
}


const nodeTypes = { trigger: TriggerNode, action: ActionNode, condition: ConditionNode }

// ── Config Panel Fields ────────────────────────────────────────────────────────

const FieldInput = ({ label, value, onChange, placeholder, type = 'text', mono = false }: any) => (
  <div className="space-y-1.5">
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
      {label}
    </label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
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
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
      {label}
    </label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
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
    <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
      {label}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-z-panel backdrop-blur-md border border-z-border px-3 py-2.5 text-[11px] text-white outline-none focus:border-z-accent/50 transition-colors appearance-none rounded-none"
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
)

// ── Dagre Auto Layout ────────────────────────────────────────────────────────
const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 260, height: 160 })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 260 / 2,
        y: nodeWithPosition.y - 160 / 2,
      },
    }
  })

  return { nodes: newNodes, edges }
}

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
  const [runs, setRuns] = useState<any[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const [showTestModal, setShowTestModal] = useState(false)
  const [testPayload, setTestPayload] = useState('{\n  "amount": 1500,\n  "type": "sale"\n}')
  const [rfInstance, setRfInstance] = useState<any>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  const activeNode = nodes.find((n) => n.selected)

  // ── Visual Tracing Hook ──────────────────────────────────────────────────────
  const activeRun = runs.find((r) => r._id === activeRunId || r.id === activeRunId)

  const visualNodes = React.useMemo(() => {
    if (!activeRun || !showLogs)
      return nodes.map((n) => ({ ...n, data: { ...n.data, runStatus: 'idle' } }))
    const errorLog = runLogs.find((l) => l.runId === activeRunId && l.level === 'error')
    const errorNodeId = errorLog?.nodeId

    return nodes.map((n) => {
      let status = 'skipped'
      if (activeRun.completedNodes?.[n.id]) status = 'success'
      else if (n.id === errorNodeId) status = 'error'
      return { ...n, data: { ...n.data, runStatus: status } }
    })
  }, [nodes, activeRun, showLogs, runLogs, activeRunId])

  const visualEdges = React.useMemo(() => {
    if (!activeRun || !showLogs)
      return edges.map((e) => ({ ...e, animated: false, style: EDGE_STYLE.style }))

    return edges.map((e) => {
      let traversed = false
      const parentResult = activeRun.completedNodes?.[e.source]
      if (parentResult) {
        if (!parentResult.isCondition) {
          traversed = true
        } else {
          const expectedHandle = e.sourceHandle || e.source
          if (parentResult.branch === expectedHandle) traversed = true
        }
      }

      if (traversed) {
        return {
          ...e,
          animated: true,
          style: {
            stroke: '#10B981',
            strokeWidth: 3,
            filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.5))',
          },
          zIndex: 10,
        }
      } else {
        return {
          ...e,
          animated: false,
          style: { stroke: '#444', strokeWidth: 1, opacity: 0.3 },
        }
      }
    })
  }, [edges, activeRun, showLogs])

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

  useEffect(() => {
    fetchFlows()
  }, [])

  useEffect(() => {
    if (!selectedFlow) return
    if (selectedFlow.nodes?.length > 0) {
      setNodes(selectedFlow.nodes as any)
      setEdges((selectedFlow.edges as any) || [])
    } else {
      const n = [
        {
          id: 'trigger_1',
          type: 'trigger' as const,
          position: { x: 200, y: 80 },
          data: {
            triggerType: selectedFlow.trigger?.type || 'webhook',
            ...selectedFlow.trigger?.config,
          },
        },
      ]
      setNodes(n as any)
      setEdges([])
    }
    setRunLogs([])
    setShowLogs(false)
  }, [selectedFlow?._id])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, ...EDGE_STYLE }, eds))
    },
    [setEdges]
  )

  const onLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges)
    setNodes([...layoutedNodes])
    setEdges([...layoutedEdges])
    setTimeout(() => {
      rfInstance?.fitView({ padding: 0.3, duration: 800 })
    }, 100)
  }, [nodes, edges, rfInstance, setNodes, setEdges])

  const createNewFlow = () => {
    const initialNodes: FlowNode[] = [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 200, y: 80 },
        data: { triggerType: 'webhook' },
      },
    ]
    const newFlow: Flow = {
      name: 'NEW_AUTOMATION',
      description: 'Untitled automation sequence',
      active: false,
      nodes: initialNodes,
      edges: [],
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
        setFlows((prev) => [res.data.data, ...prev])
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
    if (!id) {
      setSelectedFlow(null)
      return
    }
    if (!confirm('Delete this automation permanently?')) return
    try {
      await api.delete(`/flows/${id}`)
      setFlows((prev) => prev.filter((f) => f._id !== id))
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
      data: { actionType, label: ACTION_TYPES.find((a) => a.id === actionType)?.name },
    }
    setNodes((nds) => [...nds, newNode as any])
    if (sourceId) {
      setEdges((eds) =>
        addEdge(
          {
            id: `e_${sourceId}_${newNode.id}`,
            source: sourceId,
            target: newNode.id,
            ...EDGE_STYLE,
          },
          eds
        )
      )
    }
    setShowNodeMenu(false)
  }

  const addLogicNode = () => {
    const sourceId = activeNode?.id || nodes[nodes.length - 1]?.id
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type: 'condition',
      position: { x: 200, y: nodes.length * 170 + 80 },
      data: { label: 'If / Else', condition: '{{payload.amount}} > 1000' },
    }
    setNodes((nds) => [...nds, newNode as any])
    if (sourceId) {
      setEdges((eds) =>
        addEdge(
          {
            id: `e_${sourceId}_${newNode.id}`,
            source: sourceId,
            target: newNode.id,
            ...EDGE_STYLE,
          },
          eds
        )
      )
    }
    setShowNodeMenu(false)
  }

  const updateNodeData = (id: string, patch: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)))
  }

  const deselectAll = () => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
  }

  const executeTestFlow = async () => {
    if (!selectedFlow?._id) {
      toast.error('Please save the automation before testing')
      return
    }
    let parsed
    try {
      parsed = JSON.parse(testPayload)
    } catch {
      toast.error('Invalid JSON payload')
      return
    }

    setTestRunning(true)
    setShowLogs(true)
    setShowTestModal(false)
    setRunLogs([{ level: 'info', msg: 'Dispatching test trigger...' }])
    try {
      const res = await api.post(`/flows/${selectedFlow._id}/test`, { payload: parsed })
      setActiveRunId(res.data?.data?.runId)
      fetchLogsLoop(res.data?.data?.runId)
    } catch (err: any) {
      setRunLogs([{ level: 'error', msg: err?.response?.data?.message || 'Test execution failed' }])
      setTestRunning(false)
    }
  }

  const fetchLogsLoop = async (runId: string) => {
    let polling = true
    let attempts = 0
    while (polling && attempts < 15) {
      attempts++
      try {
        const res = await api.get(`/flows/${selectedFlow?._id}/logs`)
        const allRuns = res.data?.data?.runs || []
        const allLogs = res.data?.data?.logs || []

        setRuns(allRuns)
        const myLogs = allLogs
          .filter((l: any) => l.runId === runId)
          .sort(
            (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        setRunLogs(myLogs)

        const myRun = allRuns.find((r: any) => r._id === runId || r.id === runId)
        if (myRun && myRun.status !== 'running') {
          polling = false
          setTestRunning(false)
        }
      } catch (err) {
        console.error(err)
      }
      if (polling) await new Promise((r) => setTimeout(r, 2000))
    }
    setTestRunning(false)
  }

  const openHistory = async () => {
    setShowLogs(true)
    try {
      const res = await api.get(`/flows/${selectedFlow?._id}/logs`)
      setRuns(res.data?.data?.runs || [])
      setRunLogs(res.data?.data?.logs || [])
      setActiveRunId(res.data?.data?.runs?.[0]?._id || null)
    } catch (err) {
      toast.error('Failed to load history')
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-[calc(100vh-73px)] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">
          Loading Automations…
        </span>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'absolute inset-0 flex text-white overflow-hidden',
        dark ? 'bg-black' : 'bg-gray-50'
      )}
    >
      {/* ── Left Sidebar ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'w-64 flex-shrink-0 border-r flex flex-col z-10',
          dark ? 'bg-black border-z-border' : 'bg-z-panel border-z-border'
        )}
      >
        <div
          className={cn(
            'p-5 border-b flex items-center justify-between flex-shrink-0',
            dark ? 'border-z-border' : 'border-z-border'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-z-accent shadow-sm" />
            <span
              className={cn(
                'text-[9px] font-black uppercase tracking-[0.3em]',
                dark ? 'text-white' : 'text-black'
              )}
            >
              Automations
            </span>
          </div>
          <button
            onClick={createNewFlow}
            title="New automation"
            className={cn(
              'w-7 h-7 flex items-center justify-center hover:scale-105 transition-all',
              dark ? 'bg-white text-black' : 'bg-black text-white'
            )}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {flows.length === 0 && (
            <p className="text-[9px] text-gray-600 uppercase tracking-widest p-3 text-center">
              No automations yet
            </p>
          )}
          {flows.map((flow) => (
            <button
              key={flow._id}
              onClick={() => setSelectedFlow(flow)}
              className={cn(
                'w-full text-left px-3 py-3 transition-all flex flex-col border group',
                selectedFlow?._id === flow._id
                  ? dark
                    ? 'bg-white/[0.06] border-z-border-strong'
                    : 'bg-black/5 border-gray-400'
                  : dark
                    ? 'border-transparent hover:bg-z-hover hover:border-z-border'
                    : 'border-transparent hover:bg-black/[0.03] hover:border-z-border'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-[9px] font-black uppercase tracking-tight truncate max-w-[140px]',
                    dark ? 'text-white' : 'text-z-primary'
                  )}
                >
                  {flow.name}
                </span>
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0',
                    flow.active ? 'bg-z-accent shadow-sm' : 'bg-gray-700'
                  )}
                />
              </div>
              <p className="text-[8px] text-z-secondary uppercase tracking-tight truncate">
                {flow.nodes?.length || 0} nodes · {flow.active ? 'Live' : 'Idle'}
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
                  onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                  className="bg-transparent text-xl font-black uppercase tracking-tighter outline-none focus-visible:ring-2 focus-visible:ring-z-active-border min-w-[200px] max-w-[400px]"
                />
              }
              description={
                <input
                  value={selectedFlow.description}
                  onChange={(e) =>
                    setSelectedFlow({ ...selectedFlow, description: e.target.value })
                  }
                  className="bg-transparent text-inherit uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-z-active-border w-full max-w-md"
                />
              }
              actions={
                <>
                  <button
                    onClick={onLayout}
                    title="Auto-Layout Graph"
                    className={cn(
                      'px-4 h-9 border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                      'border-z-border text-z-muted hover:border-white/20 hover:text-white'
                    )}
                  >
                    <Wand2 size={12} />
                    Tidy
                  </button>
                  <button
                    onClick={openHistory}
                    disabled={!selectedFlow._id}
                    title="View Execution History"
                    className={cn(
                      'px-4 h-9 border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                      'border-z-border text-z-muted hover:border-white/20 hover:text-white'
                    )}
                  >
                    <History size={12} />
                    History
                  </button>
                  <button
                    onClick={() => setShowTestModal(true)}
                    disabled={testRunning || !selectedFlow._id}
                    title={!selectedFlow._id ? 'Save first to test' : 'Run test execution'}
                    className={cn(
                      'px-4 h-9 border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                      'border-z-border text-z-muted hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    {testRunning ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={12} />
                    )}
                    Test Run
                  </button>
                  <button
                    onClick={() =>
                      setSelectedFlow({ ...selectedFlow, active: !selectedFlow.active })
                    }
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
                  nodes={visualNodes}
                  edges={visualEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setRfInstance}
                  nodeTypes={nodeTypes}
                  onPaneClick={() => {
                    deselectAll()
                    setShowNodeMenu(false)
                  }}
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
                      '!border-2 !rounded-none !shadow-[4px_4px_0_0_#000]',
                      dark
                        ? '!bg-black !border-white !text-white !shadow-[4px_4px_0_0_#fff] [&_button]:!bg-black [&_button]:!border-b [&_button]:!border-white/20 [&_button_svg]:!fill-white hover:[&_button]:!bg-white hover:[&_button_svg]:!fill-black'
                        : '!bg-white !border-black !text-black [&_button]:!bg-white [&_button]:!border-b [&_button]:!border-black/20 [&_button_svg]:!fill-black hover:[&_button]:!bg-black hover:[&_button_svg]:!fill-white'
                    )}
                  />
                  <MiniMap
                    nodeColor={() => (dark ? '#333' : '#eee')}
                    maskColor={dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
                    className={cn(
                      '!border-2 !rounded-none !shadow-[4px_4px_0_0_#000]',
                      dark ? '!bg-black !border-white !shadow-[4px_4px_0_0_#fff]' : '!bg-white !border-black'
                    )}
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
                            className={cn(
                              'absolute bottom-full mb-3 p-2 grid grid-cols-2 gap-1.5 min-w-[340px] shadow-lg rounded-md border',
                              dark ? 'bg-[#1c1c1c] border-gray-800' : 'bg-white border-gray-300'
                            )}
                          >
                            <div
                              className={cn(
                                'col-span-2 px-2 pt-1 pb-2 border-b',
                                dark ? 'border-gray-800' : 'border-gray-200'
                              )}
                            >
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Add Action Node
                              </p>
                            </div>
                            {ACTION_TYPES.map((type) => (
                              <button
                                key={type.id}
                                onClick={() => addActionNode(type.id)}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-all text-left',
                                  dark
                                    ? 'border-transparent hover:bg-[#2c2c2c] hover:border-gray-700'
                                    : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-8 h-8 flex items-center justify-center border flex-shrink-0 rounded-sm',
                                    type.color,
                                    dark
                                      ? 'bg-[#2c2c2c] border-gray-700'
                                      : 'bg-gray-50 border-gray-200'
                                  )}
                                >
                                  <type.icon size={14} />
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-white">{type.name}</div>
                                  <div className="text-[7px] text-gray-600 uppercase tracking-wider">
                                    {type.desc}
                                  </div>
                                </div>
                              </button>
                            ))}
                            <div
                              className={cn(
                                'col-span-2 px-2 pt-1 pb-2 border-b mt-2',
                                dark ? 'border-gray-800' : 'border-gray-200'
                              )}
                            >
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Logic & Routing
                              </p>
                            </div>
                            {LOGIC_TYPES.map((type) => (
                              <button
                                key={type.id}
                                onClick={() => addLogicNode()}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-all text-left',
                                  dark
                                    ? 'border-transparent hover:bg-[#2c2c2c] hover:border-gray-700'
                                    : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-8 h-8 flex items-center justify-center border flex-shrink-0 rounded-sm',
                                    type.color,
                                    dark
                                      ? 'bg-[#2c2c2c] border-gray-700'
                                      : 'bg-gray-50 border-gray-200'
                                  )}
                                >
                                  <type.icon size={14} />
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-white">{type.name}</div>
                                  <div className="text-[7px] text-gray-600 uppercase tracking-wider">
                                    {type.desc}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={() => setShowNodeMenu((v) => !v)}
                        className={cn(
                          'w-12 h-12 flex items-center justify-center border-2 transition-all duration-200 !shadow-[4px_4px_0_0_#000]',
                          showNodeMenu
                            ? 'bg-z-accent border-z-active-border text-white rotate-45'
                            : dark ? 'bg-black border-white text-white !shadow-[4px_4px_0_0_#fff]' : 'bg-white border-black text-black'
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
                    <div
                      className={cn(
                        'px-5 py-4 border-b flex items-center justify-between flex-shrink-0',
                        dark ? 'border-z-border' : 'border-z-border'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings size={13} className="text-z-secondary" />
                        <span
                          className={cn(
                            'text-[9px] font-black uppercase tracking-[0.25em]',
                            dark ? 'text-white' : 'text-z-primary'
                          )}
                        >
                          Configure Node
                        </span>
                      </div>
                      <button
                        onClick={deselectAll}
                        className="text-z-secondary hover:text-white transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Panel Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                      {/* Interpolation hint */}
                      <div className="bg-z-accent/5 border border-z-accent/15 p-3 flex gap-2.5">
                        <Info size={11} className="text-z-active-text flex-shrink-0 mt-0.5" />
                        <p className="text-[8px] text-z-muted uppercase tracking-widest leading-relaxed">
                          Use{' '}
                          <code className="text-z-active-text font-mono">
                            {'{{payload.field}}'}
                          </code>{' '}
                          to inject data from the trigger into any field.
                        </p>
                      </div>

                      {activeNode.type === 'trigger' ? (
                        <TriggerConfigPanel
                          node={activeNode}
                          flowId={selectedFlow._id}
                          updateNodeData={updateNodeData}
                          dark={dark}
                        />
                      ) : activeNode.type === 'condition' ? (
                        <ConditionConfigPanel
                          node={activeNode}
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

            <AnimatePresence>
              {showLogs && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 250 }}
                  exit={{ height: 0 }}
                  className={cn(
                    'flex-shrink-0 border-t flex overflow-hidden',
                    dark ? 'border-z-border bg-black' : 'border-z-border bg-gray-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-64 border-r flex flex-col',
                      dark ? 'border-z-border' : 'border-z-border'
                    )}
                  >
                    <div
                      className={cn(
                        'px-4 py-3 border-b flex items-center justify-between',
                        dark ? 'border-z-border' : 'border-z-border'
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">
                        Execution History
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {runs.map((r) => (
                        <button
                          key={r._id}
                          onClick={() => setActiveRunId(r._id)}
                          className={cn(
                            'w-full text-left px-3 py-2 border rounded-sm flex items-center justify-between transition-colors',
                            activeRunId === r._id
                              ? 'border-z-border-strong bg-white/5'
                              : 'border-transparent hover:bg-white/[0.02]',
                            dark ? '' : 'text-black'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {r.status === 'running' ? (
                              <Loader2 size={12} className="animate-spin text-amber-500" />
                            ) : r.status === 'failed' ? (
                              <AlertCircle size={12} className="text-red-500" />
                            ) : (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            )}
                            <span className="text-[10px] font-mono text-gray-400">
                              {String(r._id).slice(-6)}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-500">
                            {new Date(r.createdAt).toLocaleTimeString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div
                      className={cn(
                        'px-5 py-3 border-b flex items-center justify-between',
                        dark ? 'border-z-border' : 'border-z-border'
                      )}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">
                        Run Logs
                      </span>
                      <button
                        onClick={() => setShowLogs(false)}
                        className="text-gray-600 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-4 space-y-1.5 overflow-y-auto flex-1 font-mono">
                      {runLogs
                        .filter((l) => l.runId === activeRunId || testRunning)
                        .map((log, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            {log.level === 'error' ? (
                              <AlertCircle
                                size={11}
                                className="text-red-500 flex-shrink-0 mt-0.5"
                              />
                            ) : log.level === 'success' ? (
                              <CheckCircle2
                                size={11}
                                className="text-z-active-text flex-shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />
                            )}
                            <span
                              className={cn(
                                'text-[10px]',
                                log.level === 'error'
                                  ? 'text-red-400'
                                  : log.level === 'success'
                                    ? 'text-z-active-text'
                                    : 'text-gray-300'
                              )}
                            >
                              <span className="text-gray-600 mr-2">
                                [{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]
                              </span>
                              {log.nodeId && (
                                <span className="text-indigo-400 mr-2">[{log.nodeId}]</span>
                              )}
                              {log.msg}
                            </span>
                          </div>
                        ))}
                      {testRunning && (
                        <div className="flex items-center gap-2.5 mt-2">
                          <Loader2 size={11} className="animate-spin text-z-secondary" />
                          <span className="text-[10px] text-z-secondary">Engine running…</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Payload Injector Modal */}
            <AnimatePresence>
              {showTestModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className={cn(
                      'w-full max-w-lg overflow-hidden flex flex-col border rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md',
                      dark ? 'bg-black/65 border-white/10' : 'bg-white/80 border-black/10'
                    )}
                  >
                    <div
                      className={cn(
                        'px-5 py-4 border-b flex items-center justify-between',
                        dark ? 'border-white/10' : 'border-black/10'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <Zap size={14} className="text-indigo-400" />
                        </div>
                        <div>
                          <h3
                            className={cn(
                              'text-xs font-bold uppercase tracking-wider',
                              dark ? 'text-white' : 'text-black'
                            )}
                          >
                            Inject Test Payload
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            Provide JSON data to trigger the workflow.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTestModal(false)}
                        className="p-1 hover:bg-white/10 rounded-sm text-gray-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 flex-1 bg-black/20">
                      <textarea
                        value={testPayload}
                        onChange={(e) => setTestPayload(e.target.value)}
                        className={cn(
                          'w-full h-48 text-emerald-400 font-mono text-[11px] p-4 outline-none border rounded-none resize-none',
                          dark ? 'bg-black/40 border-white/10 focus:border-z-accent/50' : 'bg-white/40 border-black/10 focus:border-z-accent/50'
                        )}
                        spellCheck={false}
                      />
                    </div>

                    <div
                      className={cn(
                        'px-5 py-3 border-t flex justify-end gap-3',
                        dark ? 'border-white/10 bg-black/20' : 'border-black/10 bg-white/20'
                      )}
                    >
                      <button
                        onClick={() => setShowTestModal(false)}
                        className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeTestFlow}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors flex items-center gap-2"
                      >
                        <Play size={12} />
                        Run Sequence
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div
              className={cn(
                'w-28 h-28 border flex items-center justify-center mb-10 group transition-all duration-500',
                dark
                  ? 'border-z-border bg-z-panel hover:border-z-active-border'
                  : 'border-z-border bg-gray-50 hover:border-z-active-border'
              )}
            >
              <Workflow
                size={44}
                className="text-gray-600 group-hover:text-z-active-text transition-colors duration-500"
              />
            </div>
            <h2
              className={cn(
                'text-2xl font-black uppercase tracking-tighter mb-3',
                dark ? 'text-white' : 'text-z-primary'
              )}
            >
              Enterprise Automations
            </h2>
            <p className="text-[10px] text-z-secondary uppercase tracking-[0.3em] max-w-sm leading-loose">
              Build visual workflow graphs connecting triggers to actions. Supports HTTP, AI, Slack,
              email, and database operations.
            </p>
            <button
              onClick={createNewFlow}
              className="mt-10 px-10 py-3.5 bg-z-accent text-white font-black uppercase tracking-[0.25em] text-[9px] hover:opacity-90 active:scale-95 transition-all shadow-sm"
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

function ConditionConfigPanel({ node, updateNodeData, dark }: any) {
  const d = node.data
  const upd = (patch: Record<string, any>) => updateNodeData(node.id, patch)

  return (
    <div className="space-y-5">
      <FieldInput
        label="Node Label"
        value={d.label}
        onChange={(v: string) => upd({ label: v })}
        placeholder="If / Else"
      />
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
          Evaluation Condition
        </label>
        <textarea
          value={d.condition || ''}
          onChange={(e) => upd({ condition: e.target.value })}
          placeholder="{{payload.amount}} > 1000"
          rows={3}
          className={cn(
            'w-full bg-z-panel backdrop-blur-md border border-z-border px-3 py-2.5 text-[11px] text-white outline-none resize-none rounded-none font-mono',
            'focus:border-z-accent/50 transition-colors placeholder:text-gray-700'
          )}
        />
        <p className="text-[8px] text-gray-500 uppercase tracking-wider mt-1">
          Must evaluate to a boolean True or False. Standard JavaScript syntax is supported.
        </p>
      </div>
    </div>
  )
}

function TriggerConfigPanel({ node, flowId, updateNodeData, dark }: any) {
  const d = node.data
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
          Trigger Type
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {TRIGGER_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => updateNodeData(node.id, { triggerType: t.id })}
              title={t.desc}
              className={cn(
                'py-2.5 px-2 text-[8px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5',
                d.triggerType === t.id
                  ? 'bg-white text-black border-white'
                  : dark
                    ? 'bg-z-hover border-z-border text-z-muted hover:text-white hover:border-white/20'
                    : 'bg-gray-100 border-z-border text-gray-600 hover:border-gray-400'
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
          <label className="text-[8px] font-black uppercase tracking-widest text-z-secondary">
            Inbound Webhook URL
          </label>
          <div
            className={cn(
              'px-3 py-2.5 border flex items-center gap-2',
              dark ? 'bg-black border-z-border' : 'bg-gray-100 border-z-border'
            )}
          >
            <code className="text-[9px] text-z-active-text font-mono truncate flex-1">
              {flowId ? `POST /api/v1/hooks/${flowId}` : 'Save automation to get URL'}
            </code>
          </div>
          <p className="text-[8px] text-gray-600 uppercase tracking-wider">
            Send a POST request to this endpoint to trigger the flow
          </p>
        </div>
      )}

      {d.triggerType === 'collection_change' && (
        <>
          <FieldInput
            label="Collection Slug"
            value={d.collection}
            onChange={(v: string) => updateNodeData(node.id, { collection: v })}
            placeholder="e.g. posts, products"
          />
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
        <FieldInput
          label="Cron Expression"
          value={d.cron}
          onChange={(v: string) => updateNodeData(node.id, { cron: v })}
          placeholder="0 9 * * 1 (every Monday 9am)"
          mono
        />
      )}
    </div>
  )
}

function ActionConfigPanel({ node, updateNodeData, dark }: any) {
  const d = node.data
  const t = d.actionType
  const upd = (patch: Record<string, any>) => updateNodeData(node.id, patch)

  const [flows, setFlows] = useState<any[]>([])
  useEffect(() => {
    if (t === 'loop') api.get('/flows').then((r) => setFlows(r.data.data))
  }, [t])

  return (
    <div className="space-y-5">
      <FieldInput
        label="Node Label"
        value={d.label}
        onChange={(v: string) => upd({ label: v })}
        placeholder="Describe this step…"
      />

      {t === 'delay' && (
        <>
          <FieldInput
            label="Duration Amount"
            value={d.amount}
            onChange={(v: string) => upd({ amount: v })}
            type="number"
            placeholder="15"
          />
          <FieldSelect
            label="Time Unit"
            value={d.unit}
            onChange={(v: string) => upd({ unit: v })}
            options={[
              { label: 'Seconds', value: 'seconds' },
              { label: 'Minutes', value: 'minutes' },
              { label: 'Hours', value: 'hours' },
              { label: 'Days', value: 'days' },
            ]}
          />
          <p className="text-[8px] text-gray-500 uppercase mt-2">
            The execution engine will suspend this workflow into durable storage and wake it up
            automatically when the timer expires.
          </p>
        </>
      )}

      {t === 'code' && (
        <>
          <FieldTextarea
            label="Javascript Transformer Code"
            value={d.code}
            onChange={(v: string) => upd({ code: v })}
            placeholder="payload.total = payload.price * 2;&#10;return payload;"
            rows={8}
            mono
          />
          <p className="text-[8px] text-gray-500 uppercase mt-2">
            Write raw JS. You must return an object. The returned object will become the new Payload
            for all downstream nodes.
          </p>
        </>
      )}

      {t === 'loop' && (
        <>
          <FieldInput
            label="Array Path (Inside Payload)"
            value={d.arrayPath}
            onChange={(v: string) => upd({ arrayPath: v })}
            placeholder="payload.customers"
            mono
          />
          <FieldSelect
            label="Target Sub-Flow"
            value={d.targetFlowId}
            onChange={(v: string) => upd({ targetFlowId: v })}
            options={[
              { label: 'Select automation...', value: '' },
              ...flows.map((f: any) => ({ label: f.name, value: f._id })),
            ]}
          />
          <p className="text-[8px] text-gray-500 uppercase mt-2">
            The engine will read the array and spawn a parallel background run of the selected
            Sub-Flow for every single item.
          </p>
        </>
      )}

      {d.actionType === 'http' && (
        <>
          <FieldSelect
            label="Method"
            value={d.method || 'POST'}
            onChange={(v: string) => upd({ method: v })}
            options={['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }))}
          />
          <FieldInput
            label="Endpoint URL"
            value={d.url}
            onChange={(v: string) => upd({ url: v })}
            placeholder="https://api.example.com/v1/..."
            mono
          />
          <FieldTextarea
            label="Headers (JSON)"
            value={d.headers}
            onChange={(v: string) => upd({ headers: v })}
            placeholder={'{"Authorization": "Bearer {{env.API_KEY}}"}'}
            rows={3}
            mono
          />
          <FieldTextarea
            label="Body (JSON)"
            value={d.body}
            onChange={(v: string) => upd({ body: v })}
            placeholder={'{"event": "{{payload.type}}", "data": "{{payload}}"}'}
            rows={5}
            mono
          />
        </>
      )}

      {d.actionType === 'slack' && (
        <>
          <FieldInput
            label="Slack Webhook URL"
            value={d.webhookUrl}
            onChange={(v: string) => upd({ webhookUrl: v })}
            placeholder="https://hooks.slack.com/services/..."
            mono
          />
          <FieldTextarea
            label="Message"
            value={d.message}
            onChange={(v: string) => upd({ message: v })}
            placeholder="🚨 Alert: {{payload.title}} was updated!"
            rows={4}
          />
        </>
      )}

      {d.actionType === 'email' && (
        <>
          <FieldInput
            label="To"
            value={d.to}
            onChange={(v: string) => upd({ to: v })}
            placeholder="user@example.com or {{payload.email}}"
          />
          <FieldInput
            label="Subject"
            value={d.subject}
            onChange={(v: string) => upd({ subject: v })}
            placeholder="Notification: {{payload.title}}"
          />
          <FieldTextarea
            label="Body (HTML)"
            value={d.body}
            onChange={(v: string) => upd({ body: v })}
            placeholder="<h2>Hello!</h2><p>{{payload.content}}</p>"
            rows={5}
            mono
          />
        </>
      )}

      {d.actionType === 'ai_prompt' && (
        <>
          <FieldTextarea
            label="Prompt"
            value={d.prompt}
            onChange={(v: string) => upd({ prompt: v })}
            placeholder="Translate the following to French: {{payload.content}}"
            rows={6}
          />
          <p className="text-[8px] text-gray-600 uppercase tracking-wider">
            AI output is injected into context as{' '}
            <code className="text-purple-400 font-mono">{'{{nodeId.output}}'}</code> for downstream
            nodes.
          </p>
        </>
      )}

      {d.actionType === 'webhook' && (
        <>
          <FieldInput
            label="Webhook URL"
            value={d.url}
            onChange={(v: string) => upd({ url: v })}
            placeholder="https://..."
            mono
          />
          <FieldInput
            label="Secret (optional)"
            value={d.secret}
            onChange={(v: string) => upd({ secret: v })}
            placeholder="Signing secret"
            type="password"
          />
        </>
      )}

      {d.actionType === 'update_content' && (
        <>
          <FieldInput
            label="Collection Slug"
            value={d.collection}
            onChange={(v: string) => upd({ collection: v })}
            placeholder="e.g. posts"
          />
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
          <FieldInput
            label="Document ID (or $.path)"
            value={d.documentId}
            onChange={(v: string) => upd({ documentId: v })}
            placeholder="{{payload._id}} or $.id"
            mono
          />
          <FieldTextarea
            label="Fields (JSON)"
            value={d.fields}
            onChange={(v: string) => upd({ fields: v })}
            placeholder={'{"status": "published", "updatedAt": "{{payload.updatedAt}}"}'}
            rows={5}
            mono
          />
        </>
      )}

      {d.actionType === 'log' && (
        <FieldInput
          label="Log Message"
          value={d.message}
          onChange={(v: string) => upd({ message: v })}
          placeholder="Flow executed: {{payload.title}}"
        />
      )}
    </div>
  )
}

export default FlowBuilderPage
