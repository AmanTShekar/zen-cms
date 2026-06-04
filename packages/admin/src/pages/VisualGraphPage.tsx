import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Network, ZoomIn, ZoomOut, Maximize2, Search, X, Info, Database, Link2, Layers, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

interface FieldDef {
 name: string
 type: string
 label?: string
 required?: boolean
 relationTo?: string | string[]
}

interface CollectionSchema {
 slug: string
 name?: string
 label?: string
 fields: FieldDef[]
 drafts?: boolean
 singleton?: boolean
 group?: string
}

interface GraphNode {
 id: string
 label: string
 x: number
 y: number
 fields: FieldDef[]
 singleton?: boolean
 drafts?: boolean
 group?: string
 color: string
}

interface GraphEdge {
 source: string
 target: string
 fieldName: string
 hasMany?: boolean
}

const NODE_COLORS = [
 '#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899',
 '#06B6D4', '#EF4444', '#84CC16', '#F97316', '#6366F1',
]

const TYPE_COLORS: Record<string, string> = {
 text: '#6b7280', number: '#3b82f6', email: '#8b5cf6', textarea: '#6b7280',
 checkbox: '#10b981', date: '#f59e0b', select: '#f97316', media: '#06b6d4',
 richtext: '#84cc16', relation: '#ec4899', json: '#6366f1', slug: '#10b981',
 array: '#f59e0b', blocks: '#8b5cf6', group: '#3b82f6', password: '#ef4444',
}

const BADGE_COLORS: Record<string, string> = {
 text: 'bg-gray-700/60 text-gray-300',
 number: 'bg-blue-900/60 text-blue-300',
 email: 'bg-purple-900/60 text-purple-300',
 textarea: 'bg-gray-700/60 text-gray-300',
 checkbox: 'bg-emerald-900/60 text-emerald-300',
 date: 'bg-amber-900/60 text-amber-300',
 select: 'bg-orange-900/60 text-orange-300',
 media: 'bg-cyan-900/60 text-cyan-300',
 richtext: 'bg-lime-900/60 text-lime-300',
 relation: 'bg-pink-900/60 text-pink-300',
 json: 'bg-indigo-900/60 text-indigo-300',
 slug: 'bg-emerald-900/60 text-emerald-300',
 array: 'bg-amber-900/60 text-amber-300',
 blocks: 'bg-purple-900/60 text-purple-300',
 default: 'bg-white/5 text-gray-400',
}

function getBadgeClass(type: string): string {
 return BADGE_COLORS[type] || BADGE_COLORS.default
}

export const VisualGraphPage = () => {
 const { theme } = useTheme()
 const dark = theme === 'dark'
 const [nodes, setNodes] = useState<GraphNode[]>([])
 const [edges, setEdges] = useState<GraphEdge[]>([])
 const [loading, setLoading] = useState(true)
 const [zoom, setZoom] = useState(0.75)
 const [pan, setPan] = useState({ x: 0, y: 0 })
 const [isPanning, setIsPanning] = useState(false)
 const panStart = useRef({ x: 0, y: 0 })
 const panOrigin = useRef({ x: 0, y: 0 })
 const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
 const [search, setSearch] = useState('')
 const [draggingNode, setDraggingNode] = useState<string | null>(null)
 const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
 const containerRef = useRef<HTMLDivElement>(null)
 const svgRef = useRef<SVGSVGElement>(null)

 useEffect(() => {
 const fetchSchemas = async () => {
 try {
 // /schemas returns live engine config: { collections, globals }
 const res = await api.get('/schemas')
 const d = res.data?.data
 const engineCols: CollectionSchema[] = Array.isArray(d?.collections)
 ? d.collections
 : Array.isArray(d) ? d : []

 // Also merge in CRUD-persisted custom schemas from z_schemas
 let customCols: CollectionSchema[] = []
 try {
 const cRes = await api.get('/schemas')
 const cRaw = cRes.data?.data
 customCols = Array.isArray(cRaw) ? cRaw : []
 } catch { /* ignore */ }

 // Merge, deduplicating by slug (engine wins)
 const engineSlugs = new Set(engineCols.map(c => c.slug))
 const cols: CollectionSchema[] = [
 ...engineCols,
 ...customCols.filter(c => !engineSlugs.has(c.slug))
 ]

 const newNodes: GraphNode[] = []
 const newEdges: GraphEdge[] = []

 // Layout: radial with clustering by group
 const groups: Record<string, CollectionSchema[]> = {}
 cols.forEach(col => {
 const g = (col as any).admin?.group || col.group || 'Default'
 if (!groups[g]) groups[g] = []
 groups[g].push(col)
 })

 const groupKeys = Object.keys(groups)
 const totalRadius = Math.max(350, cols.length * 55)
 let nodeIdx = 0

 groupKeys.forEach((groupKey, gi) => {
 const groupCols = groups[groupKey]
 const groupAngleBase = (gi / groupKeys.length) * 2 * Math.PI
 const groupRadius = totalRadius
 const groupCenterX = 700 + groupRadius * Math.cos(groupAngleBase)
 const groupCenterY = 500 + groupRadius * Math.sin(groupAngleBase)
 const subRadius = Math.min(150, groupCols.length * 40)

 groupCols.forEach((col, i) => {
 const subAngle = (i / groupCols.length) * 2 * Math.PI
 const x = groupCenterX + subRadius * Math.cos(subAngle)
 const y = groupCenterY + subRadius * Math.sin(subAngle)
 const color = NODE_COLORS[nodeIdx % NODE_COLORS.length]
 nodeIdx++

 newNodes.push({
 id: col.slug,
 label: col.name || col.label || col.slug,
 x, y,
 fields: col.fields || [],
 singleton: col.singleton,
 drafts: col.drafts,
 group: groupKey,
 color,
 })

 // Relations
 if (Array.isArray(col.fields)) {
 col.fields.forEach(field => {
 if (field.type === 'relation' && field.relationTo) {
 const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo]
 targets.forEach(target => {
 if (cols.some(c => c.slug === target)) {
 newEdges.push({
 source: col.slug,
 target,
 fieldName: field.name,
 hasMany: (field as any).hasMany,
 })
 }
 })
 }
 })
 }
 })
 })

 setNodes(newNodes)
 setEdges(newEdges)

 // Init positions
 const positions: Record<string, { x: number; y: number }> = {}
 newNodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y } })
 setNodePositions(positions)
 } catch (err) {
 console.error('Failed to load schemas for graph', err)
 } finally {
 setLoading(false)
 }
 }
 fetchSchemas()
 }, [])

 // Drag node
 const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
 e.stopPropagation()
 setDraggingNode(nodeId)
 setSelectedNode(nodes.find(n => n.id === nodeId) || null)
 }, [nodes])

 useEffect(() => {
 if (!draggingNode) return
 const handleMouseMove = (e: MouseEvent) => {
 setNodePositions(prev => ({
 ...prev,
 [draggingNode]: {
 x: prev[draggingNode].x + e.movementX / zoom,
 y: prev[draggingNode].y + e.movementY / zoom,
 }
 }))
 }
 const handleMouseUp = () => setDraggingNode(null)
 window.addEventListener('mousemove', handleMouseMove)
 window.addEventListener('mouseup', handleMouseUp)
 return () => {
 window.removeEventListener('mousemove', handleMouseMove)
 window.removeEventListener('mouseup', handleMouseUp)
 }
 }, [draggingNode, zoom])

 // Pan canvas
 const handleCanvasMouseDown = (e: React.MouseEvent) => {
 if (draggingNode) return
 setIsPanning(true)
 panStart.current = { x: e.clientX, y: e.clientY }
 panOrigin.current = { ...pan }
 }
 useEffect(() => {
 if (!isPanning) return
 const handleMouseMove = (e: MouseEvent) => {
 setPan({
 x: panOrigin.current.x + (e.clientX - panStart.current.x),
 y: panOrigin.current.y + (e.clientY - panStart.current.y),
 })
 }
 const handleMouseUp = () => setIsPanning(false)
 window.addEventListener('mousemove', handleMouseMove)
 window.addEventListener('mouseup', handleMouseUp)
 return () => {
 window.removeEventListener('mousemove', handleMouseMove)
 window.removeEventListener('mouseup', handleMouseUp)
 }
 }, [isPanning, pan])

 // Wheel zoom
 const handleWheel = useCallback((e: React.WheelEvent) => {
 e.preventDefault()
 setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)))
 }, [])

 const filteredNodes = search
 ? nodes.filter(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.id.toLowerCase().includes(search.toLowerCase()))
 : nodes

 const highlightIds = new Set(filteredNodes.map(n => n.id))

 const totalFields = nodes.reduce((acc, n) => acc + n.fields.length, 0)

 return (
 <div className={cn('w-full h-[calc(100vh-4rem)] flex relative overflow-hidden', dark ? 'bg-[#030507]' : 'bg-gray-50')}>

 {/* ── Top HUD Bar ──────────────────────────────────────────────── */}
 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 pointer-events-none">
 <div className={cn(
 'flex items-center gap-6 px-6 py-3 border backdrop-blur-xl rounded-none',
 dark ? 'bg-black/80 border-white/[0.08]' : 'bg-white/90 border-gray-200'
 )}>
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
 <Network size={16} className="text-emerald-400" />
 </div>
 <div>
 <p className={cn('text-xs font-black uppercase tracking-widest', dark ? 'text-white' : 'text-black')}>Schema Graph</p>
 <p className="text-[10px] text-gray-500 font-medium">Relation Map</p>
 </div>
 </div>
 <div className="w-px h-8 bg-white/10" />
 <div className="flex items-center gap-4">
 <div className="text-center">
 <p className={cn('text-lg font-black tabular-nums', dark ? 'text-white' : 'text-black')}>{nodes.length}</p>
 <p className="text-[9px] text-gray-500 uppercase tracking-widest">Collections</p>
 </div>
 <div className="text-center">
 <p className="text-lg font-black tabular-nums text-pink-400">{edges.length}</p>
 <p className="text-[9px] text-gray-500 uppercase tracking-widest">Relations</p>
 </div>
 <div className="text-center">
 <p className="text-lg font-black tabular-nums text-blue-400">{totalFields}</p>
 <p className="text-[9px] text-gray-500 uppercase tracking-widest">Fields</p>
 </div>
 </div>
 </div>
 </div>

 {/* ── Controls ─────────────────────────────────────────────────── */}
 <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
 <div className={cn('relative', dark ? '' : '')}>
 <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
 <input
 type="text"
 placeholder="Search..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className={cn(
 'pl-8 pr-8 py-2 text-[11px] border rounded-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black w-44 transition-all',
 dark ? 'bg-black/80 border-white/[0.08] text-white placeholder:text-gray-600 focus:border-emerald-500/50 backdrop-blur-xl' : 'bg-white border-gray-200 text-gray-900 focus:border-emerald-500'
 )}
 />
 {search && (
 <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
 <X size={12} />
 </button>
 )}
 </div>

 {[
 { icon: ZoomIn, action: () => setZoom(z => Math.min(2, z + 0.15)), title: 'Zoom In' },
 { icon: ZoomOut, action: () => setZoom(z => Math.max(0.3, z - 0.15)), title: 'Zoom Out' },
 { icon: Maximize2, action: () => { setZoom(0.75); setPan({ x: 0, y: 0 }) }, title: 'Reset View' },
 ].map(({ icon: Icon, action, title }) => (
 <button key={title} onClick={action} title={title} className={cn(
 'p-2.5 border rounded-none backdrop-blur-xl transition-all hover:scale-105 active:scale-95',
 dark ? 'bg-black/80 border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.08]' : 'bg-white border-gray-200 text-gray-600 hover:text-black shadow-sm'
 )}>
 <Icon size={16} />
 </button>
 ))}

 <div className={cn('text-center px-2 py-1.5 border rounded-none backdrop-blur-xl text-[10px] font-black tabular-nums', dark ? 'bg-black/80 border-white/[0.08] text-gray-400' : 'bg-white border-gray-200 text-gray-500')}>
 {Math.round(zoom * 100)}%
 </div>
 </div>

 {/* ── Canvas ───────────────────────────────────────────────────── */}
 <div
 ref={containerRef}
 className={cn('flex-1 overflow-hidden relative', isPanning ? 'cursor-grabbing' : 'cursor-grab')}
 onMouseDown={handleCanvasMouseDown}
 onWheel={handleWheel}
 >
 {loading ? (
 <div className="absolute inset-0 flex items-center justify-center">
 <Activity className="animate-spin text-emerald-500" size={32} />
 </div>
 ) : (
 <svg
 ref={svgRef}
 className="absolute inset-0 w-full h-full pointer-events-none"
 style={{ overflow: 'visible' }}
 >
 <defs>
 {nodes.map(node => (
 <marker
 key={node.id}
 id={`arrow-${node.id}`}
 markerWidth="6" markerHeight="6"
 refX="5" refY="3"
 orient="auto"
 markerUnits="strokeWidth"
 >
 <path d="M0,0 L6,3 L0,6 Z" fill={node.color} opacity="0.6" />
 </marker>
 ))}
 </defs>

 <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
 {/* Relation edges */}
 {edges.map((edge, i) => {
 const src = nodePositions[edge.source]
 const tgt = nodePositions[edge.target]
 if (!src || !tgt) return null
 const srcNode = nodes.find(n => n.id === edge.source)
 const midX = (src.x + tgt.x) / 2
 const midY = (src.y + tgt.y) / 2 - 40
 const highlighted = !search || (highlightIds.has(edge.source) && highlightIds.has(edge.target))
 return (
 <g key={i}>
 <path
 d={`M ${src.x} ${src.y} Q ${midX} ${midY} ${tgt.x} ${tgt.y}`}
 fill="none"
 stroke={srcNode?.color || '#10b981'}
 strokeWidth={1.5}
 strokeDasharray={edge.hasMany ? '6,4' : 'none'}
 opacity={highlighted ? 0.5 : 0.08}
 markerEnd={`url(#arrow-${edge.source})`}
 className="transition-opacity duration-300"
 />
 {/* Edge label */}
 {highlighted && (
 <text
 x={midX} y={midY - 6}
 fill={srcNode?.color || '#10b981'}
 fontSize="10"
 textAnchor="middle"
 opacity="0.7"
 style={{ fontFamily: 'monospace', fontWeight: 700 }}
 >
 {edge.fieldName}
 {edge.hasMany ? ' [many]' : ''}
 </text>
 )}
 </g>
 )
 })}
 </g>
 </svg>
 )}

 {/* Nodes rendered as DOM elements for drag */}
 {!loading && (
 <div
 style={{
 transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
 transformOrigin: '0 0',
 position: 'absolute',
 inset: 0,
 width: '100%',
 height: '100%',
 }}
 >
 {nodes.map(node => {
 const pos = nodePositions[node.id] || { x: node.x, y: node.y }
 const isSelected = selectedNode?.id === node.id
 const isDimmed = search && !highlightIds.has(node.id)
 return (
 <div
 key={node.id}
 onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
 style={{
 position: 'absolute',
 left: pos.x,
 top: pos.y,
 transform: 'translate(-50%, -50%)',
 cursor: draggingNode === node.id ? 'grabbing' : 'grab',
 opacity: isDimmed ? 0.15 : 1,
 transition: isDimmed ? 'opacity 0.3s' : 'none',
 userSelect: 'none',
 zIndex: isSelected ? 30 : 10,
 }}
 >
 <div
 className={cn(
 'rounded-none border backdrop-blur-xl shadow-2xl overflow-hidden w-52',
 'transition-all duration-200',
 dark ? 'bg-black/90' : 'bg-white/95',
 isSelected
 ? 'border-opacity-100 shadow-[0_0_30px_rgba(0,0,0,0.4)]'
 : dark ? 'border-white/[0.08]' : 'border-gray-200',
 )}
 style={isSelected ? { borderColor: node.color, boxShadow: `0 0 25px ${node.color}30` } : {}}
 >
 {/* Node Header */}
 <div
 className="px-4 py-3 flex items-center gap-2.5"
 style={{ borderBottom: `1px solid ${node.color}20`, background: `${node.color}10` }}
 >
 <div className="w-2.5 h-2.5 rounded-none flex-shrink-0 shadow-lg" style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }} />
 <div className="min-w-0 flex-1">
 <p className={cn('text-[11px] font-black uppercase tracking-widest truncate', dark ? 'text-white' : 'text-black')}>
 {node.label}
 </p>
 <p className="text-[9px] text-gray-500 font-mono truncate">/{node.id}</p>
 </div>
 <div className="flex flex-col gap-1 flex-shrink-0">
 {node.singleton && (
 <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded" style={{ background: `${node.color}20`, color: node.color }}>
 Singleton
 </span>
 )}
 {node.drafts && (
 <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
 Drafts
 </span>
 )}
 </div>
 </div>

 {/* Fields list */}
 <div className="px-3 py-2 space-y-1 max-h-36 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
 {node.fields.slice(0, 8).map((field, fi) => (
 <div key={fi} className="flex items-center justify-between gap-2">
 <span className={cn('text-[10px] font-medium truncate', dark ? 'text-gray-300' : 'text-gray-700')}>
 {field.required && <span className="text-red-400 mr-1">*</span>}
 {field.name}
 </span>
 <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0', getBadgeClass(field.type))}>
 {field.type}
 </span>
 </div>
 ))}
 {node.fields.length > 8 && (
 <p className="text-[9px] text-gray-500 pt-1">+{node.fields.length - 8} more fields</p>
 )}
 {node.fields.length === 0 && (
 <p className="text-[9px] text-gray-600 ">No fields defined</p>
 )}
 </div>

 {/* Footer */}
 <div className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: `${node.color}15` }}>
 <span className="text-[9px] text-gray-500">{node.fields.length} fields</span>
 <span className="text-[9px] text-gray-500">
 {edges.filter(e => e.source === node.id || e.target === node.id).length} relations
 </span>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* ── Detail Side Panel ─────────────────────────────────────────── */}
 <AnimatePresence>
 {selectedNode && (
 <motion.aside
 initial={{ x: 320, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x: 320, opacity: 0 }}
 transition={{ type: 'spring', damping: 28, stiffness: 300 }}
 className={cn(
 'absolute right-0 top-0 bottom-0 w-80 border-l z-30 flex flex-col',
 dark ? 'bg-black/95 border-white/[0.06] backdrop-blur-2xl' : 'bg-white/95 border-gray-200 backdrop-blur-xl'
 )}
 >
 <div className="p-5 border-b flex items-start justify-between gap-3" style={{ borderColor: `${selectedNode.color}20` }}>
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <div className="w-3 h-3 rounded-none" style={{ background: selectedNode.color, boxShadow: `0 0 8px ${selectedNode.color}` }} />
 <h2 className={cn('text-sm font-black uppercase tracking-wider', dark ? 'text-white' : 'text-black')}>
 {selectedNode.label}
 </h2>
 </div>
 <p className="text-[10px] text-gray-500 font-mono">slug: {selectedNode.id}</p>
 {selectedNode.group && (
 <p className="text-[10px] text-gray-500 mt-0.5">group: {selectedNode.group}</p>
 )}
 </div>
 <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white p-1 flex-shrink-0">
 <X size={16} />
 </button>
 </div>

 {/* Badges */}
 <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-white/[0.04]">
 <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-none bg-white/5 text-gray-400">
 <Database size={10} /> {selectedNode.fields.length} Fields
 </span>
 <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-none bg-white/5 text-gray-400">
 <Link2 size={10} /> {edges.filter(e => e.source === selectedNode.id).length} Out-links
 </span>
 <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-none bg-white/5 text-gray-400">
 <Layers size={10} /> {edges.filter(e => e.target === selectedNode.id).length} In-links
 </span>
 {selectedNode.singleton && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-none bg-purple-900/40 text-purple-300">Singleton</span>}
 {selectedNode.drafts && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-none bg-amber-900/40 text-amber-300">Drafts On</span>}
 </div>

 {/* API Endpoints */}
 <div className="px-5 py-3 border-b border-white/[0.04]">
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
 <Info size={10} /> API Endpoints
 </p>
 <div className="space-y-1">
 {[
 `GET /api/v1/${selectedNode.id}`,
 `POST /api/v1/${selectedNode.id}`,
 `GET /api/v1/${selectedNode.id}/:id`,
 `PUT /api/v1/${selectedNode.id}/:id`,
 ].map(ep => (
 <code key={ep} className={cn('block text-[9px] font-mono px-2 py-1 rounded', dark ? 'bg-white/5 text-emerald-400' : 'bg-gray-50 text-emerald-600')}>{ep}</code>
 ))}
 </div>
 </div>

 {/* Fields */}
 <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: 'thin' }}>
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Field Schema</p>
 <div className="space-y-2">
 {selectedNode.fields.map((field, i) => (
 <div key={i} className={cn('p-3 rounded-none border', dark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100')}>
 <div className="flex items-center justify-between gap-2 mb-1">
 <span className={cn('text-[11px] font-bold font-mono', dark ? 'text-white' : 'text-black')}>
 {field.required && <span className="text-red-400 mr-1">*</span>}
 {field.name}
 </span>
 <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded', getBadgeClass(field.type))}>
 {field.type}
 </span>
 </div>
 {field.label && <p className="text-[10px] text-gray-500">{field.label}</p>}
 {field.relationTo && (
 <p className="text-[9px] text-pink-400 mt-1 font-mono">→ {Array.isArray(field.relationTo) ? field.relationTo.join(', ') : field.relationTo}</p>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Relations panel */}
 {edges.some(e => e.source === selectedNode.id || e.target === selectedNode.id) && (
 <div className="px-5 py-3 border-t border-white/[0.04]">
 <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Relations</p>
 <div className="space-y-1.5">
 {edges.filter(e => e.source === selectedNode.id).map((e, i) => (
 <button
 key={`out-${i}`}
 onClick={() => setSelectedNode(nodes.find(n => n.id === e.target) || null)}
 className="w-full text-left px-2.5 py-1.5 rounded-none bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-[10px]"
 >
 <span className="text-emerald-400 font-black">.{e.fieldName}</span>
 <span className="text-gray-400 mx-1">→</span>
 <span className="text-gray-300 font-mono">{e.target}</span>
 {e.hasMany && <span className="text-[8px] text-gray-500 ml-1">[many]</span>}
 </button>
 ))}
 {edges.filter(e => e.target === selectedNode.id).map((e, i) => (
 <button
 key={`in-${i}`}
 onClick={() => setSelectedNode(nodes.find(n => n.id === e.source) || null)}
 className="w-full text-left px-2.5 py-1.5 rounded-none bg-purple-500/10 hover:bg-purple-500/20 transition-colors text-[10px]"
 >
 <span className="text-gray-300 font-mono">{e.source}</span>
 <span className="text-gray-400 mx-1">→</span>
 <span className="text-purple-400 font-black">.{e.fieldName}</span>
 </button>
 ))}
 </div>
 </div>
 )}
 </motion.aside>
 )}
 </AnimatePresence>

 {/* ── Mini-map ─────────────────────────────────────────────────── */}
 {!loading && nodes.length > 0 && (
 <div className={cn(
 'absolute bottom-4 left-4 z-20 w-36 h-24 border rounded-none overflow-hidden backdrop-blur-xl',
 dark ? 'bg-black/80 border-white/[0.08]' : 'bg-white/80 border-gray-200'
 )}>
 <svg viewBox="0 0 1400 1000" className="w-full h-full">
 {nodes.map(node => {
 const pos = nodePositions[node.id] || { x: node.x, y: node.y }
 return (
 <circle
 key={node.id}
 cx={pos.x}
 cy={pos.y}
 r={18}
 fill={node.color}
 opacity={selectedNode?.id === node.id ? 1 : 0.5}
 />
 )
 })}
 </svg>
 <div className="absolute bottom-1 left-0 right-0 text-center">
 <span className="text-[8px] text-gray-500 font-mono uppercase">Mini-map</span>
 </div>
 </div>
 )}
 </div>
 )
}

export default VisualGraphPage
