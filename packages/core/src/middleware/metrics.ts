import { Request, Response, NextFunction } from 'express'
import os from 'os'

let totalRequests = 0
let statusCodes: Record<string, number> = {}
let totalResponseTimeMs = 0

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
const latencyBucketCounts: number[] = new Array(DEFAULT_BUCKETS.length).fill(0)
let sumLatencyMs = 0

function getBucketIndex(latencyMs: number): number {
  const latencySec = latencyMs / 1000
  for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
    if (latencySec <= DEFAULT_BUCKETS[i]) return i
  }
  return DEFAULT_BUCKETS.length - 1
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime()
  totalRequests++

  res.on('finish', () => {
    const diff = process.hrtime(start)
    const timeMs = diff[0] * 1e3 + diff[1] * 1e-6
    totalResponseTimeMs += timeMs
    sumLatencyMs += timeMs

    const bucketIdx = getBucketIndex(timeMs)
    latencyBucketCounts[bucketIdx]++

    const status = res.statusCode.toString()
    statusCodes[status] = (statusCodes[status] || 0) + 1

    // Prevent memory leaks from unbounded status code attacks
    if (Object.keys(statusCodes).length > 200) {
      statusCodes = {}
    }
  })

  next()
}

export function getPrometheusMetrics(): string {
  const memory = process.memoryUsage()
  const uptime = process.uptime()
  const load = os.loadavg()
  const freeMem = os.freemem()
  const totalMem = os.totalmem()
  const eventLoopLag = getEventLoopLag()

  const lines: string[] = []

  lines.push('# HELP http_requests_total Total number of HTTP requests processed.')
  lines.push('# TYPE http_requests_total counter')
  lines.push(`http_requests_total ${totalRequests}`)

  lines.push('# HELP http_requests_by_status_total HTTP request counts by status code.')
  lines.push('# TYPE http_requests_by_status_total counter')
  for (const [status, count] of Object.entries(statusCodes)) {
    lines.push(`http_requests_by_status_total{status="${status}"} ${count}`)
  }

  lines.push(`# HELP http_request_duration_seconds_max Maximum request processing time in seconds.`)
  lines.push(`# TYPE http_request_duration_seconds_max gauge`)
  lines.push(`http_request_duration_seconds_max ${(totalResponseTimeMs / Math.max(1, totalRequests) / 1000).toFixed(6)}`)

  lines.push(`# HELP http_request_duration_seconds_avg Average request processing time in seconds.`)
  lines.push(`# TYPE http_request_duration_seconds_avg gauge`)
  lines.push(`http_request_duration_seconds_avg ${(sumLatencyMs / Math.max(1, totalRequests) / 1000).toFixed(6)}`)

  lines.push('# HELP http_request_duration_seconds HTTP request duration with histogram buckets.')
  lines.push('# TYPE http_request_duration_seconds histogram')
  let cumulative = 0
  for (let i = 0; i < DEFAULT_BUCKETS.length; i++) {
    cumulative += latencyBucketCounts[i]
    lines.push(`http_request_duration_seconds_bucket{le="${DEFAULT_BUCKETS[i]}"} ${cumulative}`)
  }
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${totalRequests}`)
  lines.push(`http_request_duration_seconds_sum ${(sumLatencyMs / 1000).toFixed(3)}`)
  lines.push(`http_request_duration_seconds_count ${totalRequests}`)

  lines.push('# HELP nodejs_event_loop_lag_seconds Node.js event loop lag (time since last tick).')
  lines.push('# TYPE nodejs_event_loop_lag_seconds gauge')
  lines.push(`nodejs_event_loop_lag_seconds ${eventLoopLag.toFixed(4)}`)

  lines.push('# HELP node_memory_rss_bytes Resident Node process memory in bytes.')
  lines.push('# TYPE node_memory_rss_bytes gauge')
  lines.push(`node_memory_rss_bytes ${memory.rss}`)

  lines.push('# HELP node_memory_heap_used_bytes Used heap memory size in bytes.')
  lines.push('# TYPE node_memory_heap_used_bytes gauge')
  lines.push(`node_memory_heap_used_bytes ${memory.heapUsed}`)

  lines.push('# HELP node_memory_heap_total_bytes Total allocated heap memory size in bytes.')
  lines.push('# TYPE node_memory_heap_total_bytes gauge')
  lines.push(`node_memory_heap_total_bytes ${memory.heapTotal}`)

  lines.push('# HELP os_uptime_seconds System uptime in seconds.')
  lines.push('# TYPE os_uptime_seconds gauge')
  lines.push(`os_uptime_seconds ${Math.floor(uptime)}`)

  lines.push('# HELP os_load_average_1m 1 minute system load average.')
  lines.push('# TYPE os_load_average_1m gauge')
  lines.push(`os_load_average_1m ${load[0].toFixed(2)}`)

  lines.push('# HELP os_free_memory_bytes Free system physical memory in bytes.')
  lines.push('# TYPE os_free_memory_bytes gauge')
  lines.push(`os_free_memory_bytes ${freeMem}`)

  lines.push('# HELP os_total_memory_bytes Total system physical memory in bytes.')
  lines.push('# TYPE os_total_memory_bytes gauge')
  lines.push(`os_total_memory_bytes ${totalMem}`)

  lines.push(`# HELP db_query_duration_seconds Database query duration in seconds.`)
  lines.push(`# TYPE db_query_duration_seconds gauge`)
  for (const [collection, durationMs] of Object.entries(dbQueryDurations)) {
    lines.push(`db_query_duration_seconds{collection="${collection}"} ${(durationMs / 1000).toFixed(6)}`)
  }

  if (lastBlockGenerationDuration > 0) {
    lines.push(`# HELP block_generation_duration_seconds Block generation duration in seconds.`)
    lines.push(`# TYPE block_generation_duration_seconds gauge`)
    lines.push(`block_generation_duration_seconds ${(lastBlockGenerationDuration / 1000).toFixed(3)}`)
  }

  lines.push(`# HELP active_websocket_connections Number of active WebSocket connections.`)
  lines.push(`# TYPE active_websocket_connections gauge`)
  lines.push(`active_websocket_connections ${activeWsConnections}`)

  return lines.join('\n') + '\n'
}

let dbQueryDurations: Record<string, number> = {}
let lastBlockGenerationDuration = 0
let activeWsConnections = 0

export function recordDbQueryDuration(collection: string, durationMs: number): void {
  dbQueryDurations[collection] = durationMs
  if (Object.keys(dbQueryDurations).length > 500) {
    dbQueryDurations = {}
  }
}

export function recordBlockGenerationDuration(durationMs: number): void {
  lastBlockGenerationDuration = durationMs
}

export function setActiveWebsocketConnections(count: number): void {
  activeWsConnections = count
}

function getEventLoopLag(): number {
  const start = process.hrtime()
  setImmediate(() => {
    const diff = process.hrtime(start)
    return diff[1] / 1e6
  })
  return 0
}