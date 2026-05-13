import { EventEmitter } from 'events';

export type ZenithEventListener = (...args: unknown[]) => Promise<void> | void;

/**
 * Zenith Event Hub
 * ─────────────────
 * Inspired by Strapi's EventHub — a typed async pub/sub system
 * that decouples services from each other.
 *
 * Built-in events emitted by the engine:
 *   - 'content.created'  → { collection, document }
 *   - 'content.updated'  → { collection, document, delta }
 *   - 'content.deleted'  → { collection, documentId }
 *   - 'content.published'→ { collection, document }
 *   - 'auth.login'       → { userId, email }
 *   - 'auth.logout'      → { userId }
 *   - 'media.uploaded'   → { url, mimetype }
 */
class ZenithEventHub {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /** Emit an event asynchronously — all listeners are awaited in order */
  async emit(event: string, ...args: unknown[]): Promise<void> {
    const listeners = this.emitter.rawListeners(event) as ZenithEventListener[];
    for (const listener of listeners) {
      await listener(...args);
    }
  }

  /** Register an async or sync listener for an event */
  on(event: string, listener: ZenithEventListener): () => void {
    this.emitter.on(event, listener);
    return () => this.off(event, listener);
  }

  /** Register a listener that fires only once */
  once(event: string, listener: ZenithEventListener): void {
    this.emitter.once(event, listener);
  }

  /** Remove a specific listener */
  off(event: string, listener: ZenithEventListener): void {
    this.emitter.off(event, listener);
  }

  /** Remove all listeners — call this on shutdown */
  destroy(): void {
    this.emitter.removeAllListeners();
  }
}

// Singleton export — one hub per process
export const eventHub = new ZenithEventHub();
