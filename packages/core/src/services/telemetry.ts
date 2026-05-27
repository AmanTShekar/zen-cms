import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { logger } from './logger'

/**
 * Initializes OpenTelemetry distributed tracing if configured.
 * Traces are exported via OTLP over HTTP.
 */
export function initTelemetry() {
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.ENABLE_TRACING === 'true') {
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'zenith-cms-core',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
    })

    // Use OTLP Exporter if endpoint is set, else default to console (for debugging)
    const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
      : new ConsoleSpanExporter()

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))
    provider.register()

    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
      ],
    })

    logger.info('OpenTelemetry distributed tracing initialized')
  }
}
