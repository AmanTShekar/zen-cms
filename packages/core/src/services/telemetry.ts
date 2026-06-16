import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { logger } from './logger'
import { traceContextStorage } from './tracer'

function getOtelProvider() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGlobalTracerProvider } = require('@opentelemetry/api/build/src/api/global-tracer-provider')
    const existing = getGlobalTracerProvider()
    if (existing) return null
  } catch { /* opentelemetry not available */ }

  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.ENABLE_TRACING === 'true') {
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'zenith-cms-core',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }) as any,
    })

    const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
      : undefined

    if (exporter) {
      ;(provider as any).addSpanProcessor(new SimpleSpanProcessor(exporter))
    }

    provider.register()

    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
      ],
    })

    logger.info('OpenTelemetry distributed tracing initialized')
    return provider
  }

  return null
}

getOtelProvider()
