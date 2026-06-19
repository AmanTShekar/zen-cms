import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  Panel,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import { Database, Activity, Search, X } from 'lucide-react'

// Types
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

// Custom Node for ER Diagram style
const SchemaNode = ({ data, selected }: any) => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  
  return (
    <div 
      className={cn(
        'rounded-none-none border shadow-2xl overflow-hidden w-64 text-[10px] transition-all relative',
        dark ? 'bg-z-popover backdrop-blur-xl border-z-border' : 'bg-white/95 backdrop-blur-xl border-z-border',
        selected ? (dark ? 'border-z-accent/50 shadow-[var(--z-active-glow)]' : 'border-z-accent/50 shadow-lg') : ''
      )}
    >
      <Handle type="target" position={Position.Left} id="target-root" className="!w-0 !h-0 !opacity-0 !border-none" />
      {/* Table Header */}
      <div className={cn(
        'px-3 py-2.5 font-black uppercase flex items-center justify-between tracking-widest',
        dark ? 'bg-z-hover border-b border-z-border text-white' : 'bg-gray-50 border-b border-z-border text-z-primary'
      )}>
        <div className="flex items-center gap-2">
          <Database size={10} className="text-z-active-text" />
          <span>{data.label}</span>
        </div>
        <span className="text-[7px] text-z-secondary font-mono lowercase">{data.slug}</span>
      </div>

      {/* Fields List */}
      <div className="flex flex-col">
        {data.fields.map((field: any, i: number) => {
          const isRelation = field.type === 'relation' || field.type === 'relationship'
          return (
            <div 
              key={i} 
              className={cn(
                'relative flex justify-between items-center px-3 py-2 border-b last:border-b-0 group',
                dark ? 'border-z-border hover:bg-z-panel' : 'border-z-border hover:bg-gray-50'
              )}
            >
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`target-${field.name}`} 
                className="w-1.5 h-1.5 !bg-gray-500/50 !border-none !-left-0.5" 
              />
              <div className="flex items-center gap-1.5">
                <span className={cn('font-mono font-bold', dark ? 'text-gray-300' : 'text-gray-700')}>
                  {field.name}
                </span>
                {field.required && <span className="text-red-500 text-[8px]">*</span>}
              </div>
              <span className={cn(
                'text-[7px] uppercase font-black tracking-wider px-1 py-0.5 rounded-none-none',
                isRelation ? 'bg-z-active-bg text-z-active-text' : dark ? 'bg-z-hover text-z-secondary' : 'bg-gray-100 text-z-secondary'
              )}>
                {field.type}
              </span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`source-${field.name}`} 
                className={cn(
                  'w-1.5 h-1.5 !border-none !-right-0.5',
                  isRelation ? '!bg-z-accent' : '!bg-gray-500/50'
                )} 
              />
            </div>
          )
        })}
        {data.fields.length === 0 && (
          <div className="px-3 py-4 text-center text-z-secondary italic text-[9px]">
            No fields defined
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  schemaNode: SchemaNode,
}

// Dagre Layout Engine Setup
const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR'
  dagreGraph.setGraph({ rankdir: direction, ranker: 'longest-path', marginx: 50, marginy: 50, nodesep: 50, edgesep: 10, ranksep: 200 })

  nodes.forEach((node) => {
    // estimate height based on fields: header ~35px, each field ~30px
    const estimatedHeight = 35 + ((node.data.fields as any[])?.length || 1) * 30
    dagreGraph.setNode(node.id, { width: 256, height: estimatedHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = isHorizontal ? Position.Left : Position.Top
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom

    node.position = {
      x: nodeWithPosition.x - 256 / 2,
      y: nodeWithPosition.y - nodeWithPosition.height / 2,
    }

    return node
  })

  return { nodes, edges }
}

export const VisualGraphPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const res = await api.get('/schemas')
        const d = res.data?.data
        const engineCols: CollectionSchema[] = Array.isArray(d?.collections) ? d.collections : (Array.isArray(d) ? d : [])

        let customCols: CollectionSchema[] = []
        try {
          const cRes = await api.get('/schemas')
          const cRaw = cRes.data?.data
          customCols = Array.isArray(cRaw) ? cRaw : []
        } catch { /* ignore */ }

        const engineSlugs = new Set(engineCols.map(c => c.slug))
        const cols: CollectionSchema[] = [
          ...engineCols,
          ...customCols.filter(c => !engineSlugs.has(c.slug))
        ]

        const initialNodes: Node[] = []
        const initialEdges: Edge[] = []

        cols.forEach((col) => {
          initialNodes.push({
            id: col.slug,
            type: 'schemaNode',
            position: { x: 0, y: 0 },
            data: {
              label: col.name || col.label || col.slug,
              slug: col.slug,
              fields: col.fields || [],
            },
          })

          if (Array.isArray(col.fields)) {
            col.fields.forEach((field) => {
              if ((field.type === 'relation' || field.type === 'relationship') && field.relationTo) {
                const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo]
                targets.forEach(target => {
                  if (cols.some(c => c.slug === target)) {
                    initialEdges.push({
                      id: `${col.slug}-${field.name}-${target}`,
                      source: col.slug,
                      target: target,
                      sourceHandle: `source-${field.name}`,
                      targetHandle: `target-root`,
                      type: 'smoothstep',
                      animated: true,
                      style: { stroke: 'var(--z-accent)', strokeWidth: 2, opacity: 0.8 },
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: 'var(--z-accent)',
                      },
                    })
                  }
                })
              }
            })
          }
        })

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          initialNodes,
          initialEdges,
          'LR'
        )

        setNodes(layoutedNodes)
        setEdges(layoutedEdges)
      } catch (err) {
        console.error('Failed to load schemas for graph', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSchemas()
  }, [])

  const filteredNodes = useMemo(() => {
    if (!search) return nodes
    return nodes.map(n => ({
      ...n,
      style: {
        ...n.style,
        opacity: (n.data.label as string).toLowerCase().includes(search.toLowerCase()) || 
                 (n.data.slug as string).toLowerCase().includes(search.toLowerCase()) ? 1 : 0.1
      }
    }))
  }, [nodes, search])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-73px)]">
        <Activity className="animate-spin text-z-secondary" size={32} />
      </div>
    )
  }

  return (
    <div className={cn('-m-6 md:-m-10 h-[calc(100vh-73px)] relative', dark ? 'bg-black' : 'bg-[#fafafa]')}>
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={dark ? '#333' : '#ccc'} gap={24} size={1} />
        <Controls 
          className={cn('!rounded-none-none !border !shadow-lg', dark ? '!bg-black/80 !border-z-border !text-white' : '!bg-white/80 !border-z-border')}
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={dark ? '#333' : '#eee'} 
          maskColor={dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
          className="!rounded-none-none !border !border-z-border !shadow-2xl"
        />
        
        {/* Top HUD */}
        <Panel position="top-center" className="mt-4 pointer-events-auto">
          <div className={cn(
            'flex items-center gap-6 px-6 py-3 border backdrop-blur-xl rounded-none-none shadow-2xl',
            dark ? 'bg-z-popover border-z-border' : 'bg-white/95 border-z-border'
          )}>
            <div className="flex items-center gap-2.5">
              <Database size={16} className={dark ? 'text-z-muted' : 'text-gray-600'} />
              <div>
                <p className={cn('text-xs font-black uppercase tracking-widest leading-none', dark ? 'text-white' : 'text-black')}>Schema Graph</p>
              </div>
            </div>
            <div className="w-px h-6 bg-gray-500/20" />
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className={cn('text-sm font-black tabular-nums leading-none', dark ? 'text-white' : 'text-black')}>{nodes.length}</p>
                <p className="text-[8px] text-z-secondary uppercase tracking-widest">Collections</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black tabular-nums text-pink-500 leading-none">{edges.length}</p>
                <p className="text-[8px] text-z-secondary uppercase tracking-widest">Relations</p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Search Panel */}
        <Panel position="top-right" className="mt-4 mr-4">
          <div className={cn('relative', dark ? '' : '')}>
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary" />
            <input
              type="text"
              placeholder="Search schemas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'pl-8 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest border rounded-none-none outline-none focus-visible:ring-2 focus-visible:ring-z-active-border w-48 shadow-2xl transition-all',
                dark ? 'bg-z-popover border-z-border text-white placeholder:text-gray-600 backdrop-blur-xl' : 'bg-white/95 border-z-border text-z-primary focus:border-gray-500'
              )}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-z-secondary hover:text-gray-300">
                <X size={12} />
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default VisualGraphPage
