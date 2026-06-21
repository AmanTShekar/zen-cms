import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, Span } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { env } from '../config/env';


const exporter = new OTLPTraceExporter({
  url: env.OTLP_TRACE_URL || 'http://localhost:4318/v1/traces',
});

const sdk = new NodeSDK({
  // @ts-expect-error - missing properties in Resource constructor
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'zenith-cms-core',
  }),
  // @ts-expect-error - missing exporter properties
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

export const tracer = trace.getTracer('zenith-core-tracer');

/**
 * Wraps an async function with an OpenTelemetry Span.
 */
export async function withTrace<T>(
  spanName: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    try {
      const result = await operation(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
