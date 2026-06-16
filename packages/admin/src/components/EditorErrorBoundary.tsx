import React from 'react'
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'

interface EditorErrorBoundaryProps {
 children: React.ReactNode
 onReset?: () => void
}

interface ErrorInfo {
 message: string
 stack?: string
 componentStack?: string
}

interface State {
 hasError: boolean
 error: ErrorInfo | null
}

/**
 * Editor-level error boundary that catches React render errors
 * and displays a glassmorphic recovery UI instead of a blank white screen.
 */
export class EditorErrorBoundary extends React.Component<EditorErrorBoundaryProps, State> {
 constructor(props: EditorErrorBoundaryProps) {
 super(props)
 this.state = { hasError: false, error: null }
 }

 static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error: { message: (error instanceof Error ? error.message : String(error)), stack: (error instanceof Error ? error.stack : undefined) } }
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 this.setState({
 error: { message: (error instanceof Error ? error.message : String(error)), stack: (error instanceof Error ? error.stack : undefined), componentStack: info.componentStack },
 })
 }

 handleReset = () => {
 this.setState({ hasError: false, error: null })
 this.props.onReset?.()
 }

 handleCopyError = () => {
 const { error } = this.state
 if (!error) return
 const text = [(error instanceof Error ? error.message : String(error)), (error instanceof Error ? error.stack : undefined), error.componentStack].filter(Boolean).join('\n\n')
 navigator.clipboard.writeText(text).catch(() => {})
 }

 render() {
 if (this.state.hasError && this.state.error) {
 return <ErrorUI error={this.state.error} onReset={this.handleReset} onCopy={this.handleCopyError} />
 }
 return this.props.children
 }
}

// Extracted so it can access theme context
const ErrorUI: React.FC<{ error: ErrorInfo; onReset: () => void; onCopy: () => void }> = ({ error, onReset, onCopy }) => {
 const { theme } = useTheme()

 return (
 <div className="flex flex-col items-center justify-center h-full min-h-64 gap-6 p-8">
 <div
 className={cn(
 'w-14 h-14 rounded-none flex items-center justify-center border-2',
 theme === 'dark' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
 )}
 >
 <AlertTriangle size={24} className={theme === 'dark' ? 'text-rose-400' : 'text-rose-500'} />
 </div>

 <div className="text-center max-w-md">
 <h2
 className={cn(
 'text-sm font-black uppercase tracking-widest mb-2',
 theme === 'dark' ? 'text-white' : 'text-black'
 )}
 >
 Something went wrong
 </h2>
 <p
 className={cn(
 'text-xs leading-relaxed font-mono px-3 py-2 border rounded-none',
 theme === 'dark' ? 'text-rose-400 bg-rose-500/5 border-rose-500/10' : 'text-rose-600 bg-rose-50 border-rose-200'
 )}
 >
 {(error instanceof Error ? error.message : String(error))}
 </p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={onReset}
 className={cn(
 'flex items-center gap-2 px-4 py-2 text-xs font-black uppercase border rounded-none transition-all',
 'bg-gray-600 dark:bg-gray-600 hover:bg-gray-500 text-white border-gray-600'
 )}
 >
 <RefreshCw size={12} />
 Try Again
 </button>
 <button
 onClick={onCopy}
 className={cn(
 'flex items-center gap-2 px-3 py-2 text-xs font-black uppercase border rounded-none transition-all',
 theme === 'dark'
 ? 'border-white/[0.08] text-gray-400 hover:bg-white/5'
 : 'border-gray-200 text-gray-500 hover:bg-gray-50'
 )}
 >
 <Copy size={11} />
 Copy Error
 </button>
 </div>

 {error.componentStack && (
 <details className="w-full max-w-2xl">
 <summary
 className={cn(
 'text-[10px] font-black uppercase tracking-widest cursor-pointer mb-1',
 theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
 )}
 >
 Component Stack
 </summary>
 <pre
 className={cn(
 'w-full text-[9px] font-mono p-3 border rounded-none overflow-x-auto max-h-48',
 theme === 'dark' ? 'bg-white/5 border-white/[0.08] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500'
 )}
 >
 {error.componentStack}
 </pre>
 </details>
 )}
 </div>
 )
}

export default EditorErrorBoundary
