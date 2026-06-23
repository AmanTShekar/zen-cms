import { logger } from './logger'

interface CircuitBreakerOptions {
  name: string
  failureThreshold?: number
  resetTimeoutMs?: number
  halfCycleMaxFailures?: number
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export class CircuitBreakerService {
  private name: string
  private failureThreshold: number
  private resetTimeoutMs: number
  private halfCycleMaxFailures: number
  private failures = 0
  private state: CircuitState = 'CLOSED'
  private lastFailureAt = 0
  private lastStateChangeAt = 0
  private consecutiveSuccesses = 0

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name
    this.failureThreshold = options.failureThreshold ?? 5
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000
    this.halfCycleMaxFailures = options.halfCycleMaxFailures ?? 3
  }

  async execute<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureAt > this.resetTimeoutMs) {
        logger.info({ circuit: this.name }, 'CircuitBreaker: transitioning OPEN → HALF_OPEN')
        this.state = 'HALF_OPEN'
        this.lastStateChangeAt = Date.now()
        this.consecutiveSuccesses = 0
      } else {
        logger.warn({ circuit: this.name, state: this.state }, 'CircuitBreaker: OPEN — calling fallback')
        return fallback()
      }
    }

    try {
      const result = await operation()
      
      this.consecutiveSuccesses++
      if (this.state === 'HALF_OPEN' && this.consecutiveSuccesses >= this.halfCycleMaxFailures) {
        logger.info({ circuit: this.name }, 'CircuitBreaker: HALF_OPEN → CLOSED')
        this.state = 'CLOSED'
        this.failures = 0
        this.lastStateChangeAt = Date.now()
      }
      
      return result
    } catch (err: unknown) {
      this.failures++
      this.lastFailureAt = Date.now()

      if (this.state === 'HALF_OPEN') {
        logger.warn({ circuit: this.name, failures: this.failures }, 'CircuitBreaker: HALF_OPEN failure — reopening')
        this.state = 'OPEN'
        this.lastStateChangeAt = Date.now()
        return fallback()
      }

      if (this.failures >= this.failureThreshold) {
        logger.error({ circuit: this.name, failures: this.failures }, `CircuitBreaker: CLOSED → OPEN after ${this.failures} failures`)
        this.state = 'OPEN'
        this.lastStateChangeAt = Date.now()
      }
      
      return fallback()
    }
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureAt > this.resetTimeoutMs) {
      logger.info({ circuit: this.name }, 'CircuitBreaker: transitioning OPEN → HALF_OPEN')
      this.state = 'HALF_OPEN'
      this.lastStateChangeAt = Date.now()
      this.consecutiveSuccesses = 0
    }
    return this.state
  }

  getFailureCount(): number {
    return this.failures
  }

  reset(): void {
    this.state = 'CLOSED'
    this.failures = 0
    this.consecutiveSuccesses = 0
    this.lastFailureAt = 0
    this.lastStateChangeAt = Date.now()
  }
}

export const dbCircuitBreaker = new CircuitBreakerService({
  name: 'database',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
})

export const webhookCircuitBreaker = new CircuitBreakerService({
  name: 'webhook-delivery',
  failureThreshold: 10,
  resetTimeoutMs: 60_000,
})

export const aiCircuitBreaker = new CircuitBreakerService({
  name: 'ai-service',
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
})

export const redisCircuitBreaker = new CircuitBreakerService({
  name: 'redis',
  failureThreshold: 5,
  resetTimeoutMs: 15_000,
})
