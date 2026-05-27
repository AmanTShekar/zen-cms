import { AsyncLocalStorage } from 'async_hooks'
import crypto from 'crypto'
import { BasicTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

export interface TraceContext {
  traceId: string
  spanId: string
}

export const traceContextStorage = new AsyncLocalStorage<TraceContext>()

// ── OpenTelemetry Initialization ──────────────────────────────────────────────
const provider = new BasicTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'zenith-cms',
  }),
})

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT, 
    // e.g. 'http://localhost:4318/v1/traces'
  })
  provider.addSpanProcessor(new BatchSpanProcessor(exporter))
  console.log(`[Zenith] OTLP Tracing enabled: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`)
} else {
  // Optional fallback for debugging if needed, but omitted to prevent console spam
}

provider.register()
const tracer = provider.getTracer('zenith-core')

/**
 * Runs a callback within the specified trace context and emits a span.
 */
export async function runWithContext<T>(context: TraceContext, name: string, fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    traceContextStorage.run(context, () => {
      // In a full implementation, you'd extract parentContext from w3c headers and link it.
      // Here we create a simple root span or child span based on our custom context.
      const span = tracer.startSpan(name)
      span.setAttribute('traceId', context.traceId)
      span.setAttribute('spanId', context.spanId)

      fn().then((res) => {
        span.end()
        resolve(res)
      }).catch((err) => {
        span.recordException(err)
        span.end()
        reject(err)
      })
    })
  })
}

/**
 * Retrieves the current active trace context from AsyncLocalStorage.
 */
export function getActiveContext(): TraceContext | undefined {
  return traceContextStorage.getStore()
}

/**
 * Formats trace context into a standard W3C traceparent header value.
 */
export function getTraceparentHeader(): string | undefined {
  const ctx = getActiveContext()
  if (!ctx) return undefined
  // W3C traceparent format: version-traceId-spanId-flags
  return `00-${ctx.traceId}-${ctx.spanId}-01`
}

/**
 * Extracts W3C traceparent or falls back to creating a new trace context.
 */
export function extractTraceContext(headers: Record<string, any>): TraceContext {
  const traceparent = headers['traceparent'] || headers['x-traceparent']
  if (typeof traceparent === 'string') {
    const parts = traceparent.split('-')
    if (parts.length >= 3 && parts[1].length === 32 && parts[2].length === 16) {
      return {
        traceId: parts[1],
        spanId: crypto.randomBytes(8).toString('hex'),
      }
    }
  }

  return {
    traceId: crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
  }
}
