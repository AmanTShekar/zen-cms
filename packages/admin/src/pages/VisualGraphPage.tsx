import React, { useEffect, useState, useRef } from 'react'
import { Network, ZoomIn, ZoomOut, Maximize, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

interface CollectionSchema {
  slug: string
  name: string
  fields: any[]
}

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
}

interface GraphEdge {
  source: string
  target: string
}

export const VisualGraphPage = () => {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [schemas, setSchemas] = useState<CollectionSchema[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [loading, setLoading] = useState(true)

  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        const res = await api.get('/system/collections')
        const cols: CollectionSchema[] = res.data?.data || []
        setSchemas(cols)
        
        // Build graph
        const newNodes: GraphNode[] = []
        const newEdges: GraphEdge[] = []
        
        // Circle layout calculation
        const radius = Math.max(250, cols.length * 40)
        const centerX = 600
        const centerY = 400

        cols.forEach((col, idx) => {
          const angle = (idx / cols.length) * 2 * Math.PI
          newNodes.push({
            id: col.slug,
            label: col.name,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          })

          // Find relationships
          if (Array.isArray(col.fields)) {
            col.fields.forEach(field => {
              if (field.type === 'relation' && field.relationTo) {
                const targets = Array.isArray(field.relationTo) ? field.relationTo : [field.relationTo]
                targets.forEach(target => {
                  if (cols.some(c => c.slug === target)) {
                    newEdges.push({ source: col.slug, target })
                  }
                })
              }
            })
          }
        })
        
        setNodes(newNodes)
        setEdges(newEdges)
      } catch (err) {
        console.error('Failed to load schemas for graph', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSchemas()
  }, [])

  return (
    <div className={cn("w-full h-[calc(100vh-4rem)] flex flex-col relative", dark ? "bg-[#050505]" : "bg-gray-50")}>
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3 pointer-events-none">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border",
          dark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
        )}>
          <Network size={24} />
        </div>
        <div>
          <h1 className={cn("text-xl font-black uppercase tracking-widest italic", dark ? "text-white" : "text-black")}>
            Schema Graph
          </h1>
          <p className={cn("text-xs font-bold uppercase tracking-[0.2em]", dark ? "text-gray-500" : "text-gray-400")}>
            {nodes.length} Collections · {edges.length} Relations
          </p>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className={cn("p-2 border backdrop-blur-md transition-all hover:scale-110", dark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black")}>
          <ZoomIn size={16} />
        </button>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className={cn("p-2 border backdrop-blur-md transition-all hover:scale-110", dark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black")}>
          <ZoomOut size={16} />
        </button>
        <button onClick={() => setZoom(1)} className={cn("p-2 border backdrop-blur-md transition-all hover:scale-110", dark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-black")}>
          <Maximize size={16} />
        </button>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative custom-editor-scrollbar cursor-move"
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <motion.div 
            className="w-[1200px] h-[800px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
            animate={{ scale: zoom }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {edges.map((edge, i) => {
                const sourceNode = nodes.find(n => n.id === edge.source)
                const targetNode = nodes.find(n => n.id === edge.target)
                if (!sourceNode || !targetNode) return null
                return (
                  <path
                    key={i}
                    d={`M ${sourceNode.x} ${sourceNode.y} Q ${(sourceNode.x + targetNode.x) / 2} ${(sourceNode.y + targetNode.y) / 2 - 50} ${targetNode.x} ${targetNode.y}`}
                    fill="none"
                    stroke={dark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.4)"}
                    strokeWidth={2}
                    className="transition-all duration-500"
                    strokeDasharray="5,5"
                  />
                )
              })}
            </svg>

            {nodes.map(node => (
              <motion.div
                key={node.id}
                drag
                dragMomentum={false}
                whileDrag={{ scale: 1.1, zIndex: 50 }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 p-4 rounded-xl border backdrop-blur-md cursor-grab active:cursor-grabbing shadow-xl flex flex-col items-center justify-center min-w-[120px]",
                  dark ? "bg-[#111827]/80 border-white/10 text-white" : "bg-white/90 border-gray-200 text-black"
                )}
                style={{ left: node.x, top: node.y }}
              >
                <div className={cn("w-2 h-2 rounded-full mb-2", dark ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-emerald-500")} />
                <span className="text-xs font-black uppercase tracking-widest italic">{node.label}</span>
                <span className={cn("text-[10px] font-medium mt-1", dark ? "text-gray-500" : "text-gray-400")}>
                  {node.id}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default VisualGraphPage
