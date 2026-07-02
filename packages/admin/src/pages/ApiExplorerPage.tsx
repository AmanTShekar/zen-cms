import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Braces, Code, Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { useTenantStore } from '../lib/tenantStore'

export default function ApiExplorerPage() {
  const [activeTab, setActiveTab] = useState<'graphql' | 'rest'>('graphql')
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const token = useTenantStore((s) => s.token)

  const graphqlUrl = `${import.meta.env.VITE_API_URL || '/api/v1'}`.replace('/api/v1', '/graphql')
  const restDocsUrl = `${import.meta.env.VITE_API_URL || '/api/v1'}`.replace('/api/v1', '/api/docs')

  const handleCopy = (url: string, type: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(type)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  // Securely pass token to the iframe via postMessage after it loads
  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow && token) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'ZENITH_AUTH_TOKEN', token },
        '*' // iframe is same-origin (srcdoc), no origin restriction needed
      )
    }
  }

  // Version-pinned CDN resources for security and stability
  // React 18 + GraphiQL 3.7.1 — update intentionally, check changelogs before bumping
  const GRAPHIQL_VERSION = '3.7.1'
  const REACT_VERSION = '18.3.1'

  const graphiqlHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>GraphiQL</title>
      <style>
        body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
        #graphiql { height: 100vh; }
      </style>
      <link rel="stylesheet" href="https://unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.min.css" />
    </head>
    <body class="${dark ? 'graphiql-dark' : 'graphiql-light'}">
      <div id="graphiql">Loading...</div>
      <script src="https://unpkg.com/react@${REACT_VERSION}/umd/react.production.min.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@${REACT_VERSION}/umd/react-dom.production.min.js" crossorigin></script>
      <script src="https://unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.min.js" crossorigin></script>
      <script>
        let authToken = '';

        // Receive the auth token securely from the parent via postMessage
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'ZENITH_AUTH_TOKEN') {
            authToken = event.data.token || '';
            renderGraphiQL();
          }
        });

        function renderGraphiQL() {
          const fetcher = GraphiQL.createFetcher({
            url: '${graphqlUrl}',
            headers: {
              'Authorization': 'Bearer ' + authToken
            }
          });

          // React 18: use createRoot instead of deprecated ReactDOM.render
          const root = ReactDOM.createRoot(document.getElementById('graphiql'));
          root.render(React.createElement(GraphiQL, { fetcher: fetcher }));
        }

        // Attempt render without token first (public introspection may work)
        renderGraphiQL();
      </script>
    </body>
    </html>
  `


  return (
    <div className="flex-1 overflow-y-auto bg-z-body text-z-text">
      <PageHeader
        title="API Explorer"
        description="Test and discover GraphQL and REST API endpoints instantly."
        icon={<Terminal size={24} />}
        breadcrumbs={[{ label: 'Development', path: '/api-explorer' }, { label: 'API Explorer' }]}
        actions={
          <div className="flex bg-z-input border border-z-border p-1 rounded-none-none">
            <button
              onClick={() => setActiveTab('graphql')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-sm font-semibold transition-all',
                activeTab === 'graphql' ? 'bg-z-panel text-z-primary shadow-sm border border-z-border' : 'text-z-secondary hover:text-z-primary border border-transparent'
              )}
            >
              <Braces size={14} /> GraphQL
            </button>
            <button
              onClick={() => setActiveTab('rest')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-sm font-semibold transition-all',
                activeTab === 'rest' ? 'bg-z-panel text-z-primary shadow-sm border border-z-border' : 'text-z-secondary hover:text-z-primary border border-transparent'
              )}
            >
              <Code size={14} /> REST API
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', activeTab === 'graphql' ? 'bg-pink-500' : 'bg-green-500')} />
                {activeTab === 'graphql' ? 'GraphQL Endpoint' : 'Swagger REST Docs Endpoint'}
              </h3>
              <p className="text-xs text-z-secondary mt-1">
                {activeTab === 'graphql' 
                  ? 'Queries, Mutations, and automatic Schema Introspection via the Neural Schema Orchestrator.'
                  : 'Auto-generated OpenAPI v3 documentation for all core collections and global singletons.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className={cn('px-3 py-1.5 border text-xs font-mono font-medium', dark ? 'bg-app border-z-border text-z-primary' : 'bg-z-body border-z-border text-z-primary')}>
                {activeTab === 'graphql' ? graphqlUrl : restDocsUrl}
              </code>
              <button
                onClick={() => handleCopy(activeTab === 'graphql' ? graphqlUrl : restDocsUrl, activeTab)}
                className="p-1.5 border border-z-border hover:bg-z-hover text-z-secondary hover:text-z-primary transition-colors"
                title="Copy URL"
              >
                {copiedUrl === activeTab ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <a
                href={activeTab === 'graphql' ? graphqlUrl : restDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 border border-z-border hover:bg-z-hover text-z-secondary hover:text-z-primary transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[700px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 w-full h-full"
            >
              {activeTab === 'graphql' ? (
                <iframe
                  ref={iframeRef}
                  title="GraphQL Playground"
                  srcDoc={graphiqlHTML}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-same-origin"
                  onLoad={handleIframeLoad}
                />
              ) : (
                <iframe
                  title="Swagger UI"
                  src={restDocsUrl}
                  className="w-full h-full border-none bg-white"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  )
}
