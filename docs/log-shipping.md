# Log Shipping Configuration

Zenith CMS outputs structured, machine-readable JSON logs using [Pino](https://getpino.io) in production environments (`NODE_ENV=production`).

Because Zenith CMS scales horizontally across multiple nodes, we recommend offloading log aggregation to a high-performance sidecar rather than writing logs to the local filesystem.

## Recommended Architecture: Vector Sidecar

[Vector.dev](https://vector.dev/) is an extremely fast, lightweight observability pipeline built in Rust. It perfectly complements Zenith CMS for shipping logs to external providers like DataDog, AWS CloudWatch, or Elasticsearch.

### Setup

1. Configure Docker to use the `fluentd` logging driver to pipe Zenith's JSON stdout directly to the Vector container.
2. Configure Vector to transform and ship those logs.

#### Example `vector.toml` Configuration

```toml
# Ingest logs from Docker (Fluentd protocol)
[sources.docker_logs]
type = "fluent"
address = "0.0.0.0:24224"

# Parse Zenith's Pino JSON structure
[transforms.parse_json]
type = "remap"
inputs = ["docker_logs"]
source = '''
  # Parse the raw string into a JSON object
  parsed, err = parse_json(.record)
  if err == null {
    # Merge the parsed fields into the root
    . = merge(., parsed)
    # Remove the raw string to save space
    del(.record)
  }
'''

# Ship to DataDog
[sinks.datadog]
type = "datadog_logs"
inputs = ["parse_json"]
default_api_key = "${DATADOG_API_KEY}"
compression = "gzip"
region = "us"
```

## Running the Example

See the `examples/vector-log-shipping` directory for a complete `docker-compose.yml` blueprint.
