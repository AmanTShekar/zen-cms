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
import { PageHeader } from '../components/ui/PageHeader'

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
        'rounded-md border shadow-sm overflow-hidden w-72 text-sm transition-all relative',
        dark ? 'bg-[#1c1c1c] border-gray-800' : 'bg-white border-gray-300',
        selected ? (dark ? 'ring-2 ring-z-accent border-z-accent' : 'ring-2 ring-z-accent border-z-accent') : ''
      )}
    >
      <Handle type="target" position={Position.Left} id="target-root" className="!w-0 !h-0 !opacity-0 !border-none" />
      {/* Table Header */}
      <div className={cn(
        'px-4 py-3 font-bold flex items-center justify-between',
        dark ? 'bg-[#2c2c2c] border-b border-gray-800 text-white' : 'bg-gray-50 border-b border-gray-300 text-gray-900'
      )}>
        <div className="flex items-center gap-2">
          <Database size={14} className="text-gray-500" />
          <span>{data.label}</span>
        </div>
        <span className="text-xs text-gray-500 font-mono lowercase">{data.slug}</span>
      </div>

      {/* Fields List */}
      <div className="flex flex-col">
        {data.fields.map((field: any, i: number) => {
          const isRelation = field.type === 'relation' || field.type === 'relationship'
          return (
            <div 
              key={i} 
              className={cn(
                'relative flex justify-between items-center px-4 py-2 border-b last:border-b-0 group',
                dark ? 'border-gray-800/50 hover:bg-[#2c2c2c]' : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`target-${field.name}`} 
                className="w-1.5 h-1.5 !bg-gray-500/50 !border-none !-left-0.5" 
              />
              <div className="flex items-center gap-1.5">
                <span className={cn('font-mono font-medium text-xs', dark ? 'text-gray-200' : 'text-gray-800')}>
                  {field.name}
                </span>
                {field.required && <span className="text-red-500 text-xs">*</span>}
              </div>
              <span className={cn(
                'text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm',
                isRelation ? 'text-emerald-500' : 'text-gray-500'
              )}>
                {field.type}
              </span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`source-${field.name}`} 
                className={cn(
                  'w-1.5 h-1.5 !border-none !-right-0.5',
                  isRelation ? '!bg-emerald-500' : '!bg-gray-500/50'
                )} 
              />
            </div>
          )
        })}
        {data.fields.length === 0 && (
          <div className="px-4 py-4 text-center text-gray-500 italic text-xs">
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
    // estimate height based on fields: header ~45px, each field ~36px
    const estimatedHeight = 45 + ((node.data.fields as any[])?.length || 1) * 36
    dagreGraph.setNode(node.id, { width: 288, height: estimatedHeight })
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
                      style: { stroke: '#10B981', strokeWidth: 2, opacity: 0.8 },
                      markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: '#10B981',
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
    <div className="space-y-6">
      <PageHeader 
        title="Schema Graph" 
        description="Visualize your database collections and relationships"
      />
      <div className={cn('h-[calc(100vh-200px)] relative rounded-lg border shadow-sm overflow-hidden', dark ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200')}>
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
          className={cn('!rounded-md !border !shadow-sm overflow-hidden', dark ? '!bg-[#1c1c1c] !border-gray-800 !text-white' : '!bg-white !border-gray-300 !text-gray-900')}
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={dark ? '#333' : '#eee'} 
          maskColor={dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}
          className={cn('!rounded-md !border !shadow-sm', dark ? '!bg-[#1c1c1c] !border-gray-800' : '!bg-white !border-gray-300')}
        />
        
        {/* Top HUD */}
        <Panel position="top-center" className="mt-4 pointer-events-auto">
          <div className={cn(
            'flex items-center gap-6 px-6 py-3 border rounded-md shadow-sm',
            dark ? 'bg-[#1c1c1c] border-gray-800' : 'bg-white border-gray-300'
          )}>
            <div className="flex items-center gap-2.5">
              <Database size={16} className={dark ? 'text-gray-400' : 'text-gray-600'} />
              <div>
                <p className={cn('text-sm font-bold leading-none', dark ? 'text-white' : 'text-gray-900')}>Schema Graph</p>
              </div>
            </div>
            <div className={cn("w-px h-6", dark ? "bg-gray-800" : "bg-gray-200")} />
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <p className={cn('text-lg font-bold tabular-nums leading-none', dark ? 'text-white' : 'text-gray-900')}>{nodes.length}</p>
                <p className="text-xs font-semibold text-gray-500 mt-1">Collections</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-lg font-bold tabular-nums text-emerald-500 leading-none">{edges.length}</p>
                <p className="text-xs font-semibold text-gray-500 mt-1">Relations</p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Search Panel */}
        <Panel position="top-right" className="mt-4 mr-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search schemas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'pl-9 pr-8 py-2.5 text-sm font-medium border rounded-md outline-none focus-visible:ring-2 focus-visible:ring-z-accent w-64 shadow-sm transition-all',
                dark ? 'bg-[#1c1c1c] border-gray-800 text-white placeholder:text-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
              )}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
    </div>
  )
}

export default VisualGraphPage
