import React from 'react'
import {
 Database,
 Activity,
 Users,
 Cpu,
 HardDrive,
 Network,
 Plus,
 Box,
 Sparkles,
 History,
 Fingerprint,
 Zap,
 Globe,
 Layout,
 BarChart2,
 Calendar,
 Radio,
 Code2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Widget Contract ───────────────────────────────────────────────────────────
export interface WidgetProps {
 id: string
 config: any
 isEditing: boolean
 onConfigChange: (cfg: any) => void
 onRemove: () => void
 theme: 'dark' | 'light'
 title?: string
}

export interface WidgetDefinition {
 type: string
 label: string
 description: string
 icon: LucideIcon
 category: 'data' | 'content' | 'system' | 'team' | 'custom'
 defaultSize: { w: number; h: number }
 minSize: { w: number; h: number }
 singleton?: boolean // only one instance allowed
 adminOnly?: boolean
 component: React.FC<WidgetProps>
}

// ── Lazy-loaded widget components ─────────────────────────────────────────────
const StatCardWidget = React.lazy(() => import('./StatCardWidget'))
const AuditLogWidget = React.lazy(() => import('./AuditLogWidget'))
const QuickActionsWidget = React.lazy(() => import('./QuickActionsWidget'))
const SystemHealthWidget = React.lazy(() => import('./SystemHealthWidget'))
const ApiStatusWidget = React.lazy(() => import('./ApiStatusWidget'))
const RecentContentWidget = React.lazy(() => import('./RecentContentWidget'))
const MediaGridWidget = React.lazy(() => import('./MediaGridWidget'))
const CustomHtmlWidget = React.lazy(() => import('./CustomHtmlWidget'))
const TeamPresenceWidget = React.lazy(() => import('./TeamPresenceWidget'))

// ── Registry ──────────────────────────────────────────────────────────────────
export const WIDGET_REGISTRY: WidgetDefinition[] = [
 {
 type: 'stat-card',
 label: 'Stat Card',
 description: 'Displays a single key metric.',
 icon: Database,
 category: 'data',
 defaultSize: { w: 3, h: 2 },
 minSize: { w: 2, h: 2 },
 component: StatCardWidget,
 },
 {
 type: 'audit-log',
 label: 'Audit Log',
 description: 'Live feed of recent activity.',
 icon: History,
 category: 'data',
 defaultSize: { w: 8, h: 4 },
 minSize: { w: 4, h: 3 },
 component: AuditLogWidget,
 },
 {
 type: 'quick-actions',
 label: 'Quick Actions',
 description: 'Shortcuts to common tasks.',
 icon: Zap,
 category: 'content',
 defaultSize: { w: 12, h: 2 },
 minSize: { w: 6, h: 2 },
 singleton: true,
 component: QuickActionsWidget,
 },
 {
 type: 'system-health',
 label: 'System Health',
 description: 'CPU, memory, and DB vitals.',
 icon: Cpu,
 category: 'system',
 defaultSize: { w: 4, h: 3 },
 minSize: { w: 3, h: 2 },
 adminOnly: true,
 component: SystemHealthWidget,
 },
 {
 type: 'api-status',
 label: 'API Status',
 description: 'API health and endpoint latency.',
 icon: Activity,
 category: 'system',
 defaultSize: { w: 4, h: 3 },
 minSize: { w: 3, h: 2 },
 component: ApiStatusWidget,
 },
 {
 type: 'recent-content',
 label: 'Recent Content',
 description: 'Latest edited documents.',
 icon: Layout,
 category: 'content',
 defaultSize: { w: 6, h: 3 },
 minSize: { w: 4, h: 3 },
 component: RecentContentWidget,
 },
 {
 type: 'media-grid',
 label: 'Media Grid',
 description: 'Recent media library uploads.',
 icon: Box,
 category: 'content',
 defaultSize: { w: 6, h: 4 },
 minSize: { w: 4, h: 3 },
 component: MediaGridWidget,
 },
 {
 type: 'custom-html',
 label: 'Custom HTML',
 description: 'Embed sanitized HTML content.',
 icon: Code2,
 category: 'custom',
 defaultSize: { w: 6, h: 3 },
 minSize: { w: 3, h: 2 },
 adminOnly: true,
 component: CustomHtmlWidget,
 },
 {
 type: 'team-presence',
 label: 'Team Presence',
 description: 'See who is online right now.',
 icon: Users,
 category: 'team',
 defaultSize: { w: 4, h: 2 },
 minSize: { w: 3, h: 2 },
 component: TeamPresenceWidget,
 },
]

export function getWidgetDef(type: string): WidgetDefinition | undefined {
 return WIDGET_REGISTRY.find((w) => w.type === type)
}

// Icons re-exported for use in picker UI
export {
 Database,
 Activity,
 Users,
 Cpu,
 HardDrive,
 Network,
 Plus,
 Box,
 Sparkles,
 History,
 Fingerprint,
 Zap,
 Globe,
 Layout,
 BarChart2,
 Calendar,
 Radio,
 Code2,
}
