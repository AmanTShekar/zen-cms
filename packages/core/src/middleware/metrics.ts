import { Request, Response, NextFunction } from 'express'
import os from 'os'

let totalRequests = 0
const statusCodes: Record<string, number> = {}
let totalResponseTimeMs = 0

/**
 * Capture request count, duration, and status codes.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime()
  totalRequests++

  res.on('finish', () => {
    const diff = process.hrtime(start)
    const timeMs = diff[0] * 1e3 + diff[1] * 1e-6
    totalResponseTimeMs += timeMs

    const status = res.statusCode.toString()
    statusCodes[status] = (statusCodes[status] || 0) + 1
  })

  next()
}

/**
 * Format system and HTTP counters into standard Prometheus line format.
 */
export function getPrometheusMetrics(): string {
  const memory = process.memoryUsage()
  const uptime = process.uptime()
  const load = os.loadavg()
  const freeMem = os.freemem()
  const totalMem = os.totalmem()

  const lines: string[] = []

  lines.push('# HELP http_requests_total Total number of HTTP requests processed.')
  lines.push('# TYPE http_requests_total counter')
  lines.push(`http_requests_total ${totalRequests}`)

  lines.push('# HELP http_requests_by_status_total HTTP request counts by status code.')
  lines.push('# TYPE http_requests_by_status_total counter')
  for (const [status, count] of Object.entries(statusCodes)) {
    lines.push(`http_requests_by_status_total{status="${status}"} ${count}`)
  }

  const avgLatency = totalRequests > 0 ? (totalResponseTimeMs / totalRequests) / 1000 : 0
  lines.push('# HELP http_request_duration_seconds_avg Average request processing time in seconds.')
  lines.push('# TYPE http_request_duration_seconds_avg gauge')
  lines.push(`http_request_duration_seconds_avg ${avgLatency.toFixed(6)}`)

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

  return lines.join('\n') + '\n'
}
