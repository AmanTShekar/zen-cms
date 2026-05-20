import { Request, Response, NextFunction } from 'express'

/**
 * Koa-to-Express Context & Middleware Translator
 * ───────────────────────────────────────────────
 * Bridges Koa's async context-based middleware architecture (ctx, next)
 * with Express's callback model (req, res, next).
 * Allows Strapi plugins built for Koa to execute cleanly inside Express.
 */

export interface KoaContext {
  request: {
    body: any
    headers: Record<string, string | string[] | undefined>
    query: any
    ip: string
    method: string
    path: string
    url: string
    files?: any
  }
  response: {
    status: number
    body: any
    headers: Record<string, string>
    redirect(url: string): void
  }
  params: Record<string, string>
  query: Record<string, any>
  body: any
  status: number
  headers: Record<string, string | string[] | undefined>
  req: Request
  res: Response
  send(data: any): void
  throw(status: number, message: string): void
  get(header: string): string | undefined
  set(header: string, value: string): void
}

/**
 * Creates a mocked Koa context object wrapping Express's req and res.
 */
export function createKoaContext(req: Request, res: Response): KoaContext {
  const ctx: KoaContext = {
    req,
    res,
    request: {
      body: req.body,
      headers: req.headers,
      query: req.query,
      ip: req.ip || '',
      method: req.method,
      path: req.path,
      url: req.url,
      files: (req as any).files || (req as any).file,
    },
    response: {
      status: 200,
      body: undefined,
      headers: {},
      redirect(url: string) {
        res.redirect(url)
      },
    },
    params: req.params,
    query: req.query,
    body: undefined,
    status: 200,
    headers: req.headers,
    send(data: any) {
      this.body = data
    },
    throw(status: number, message: string) {
      const err = new Error(message) as any
      err.status = status
      throw err
    },
    get(header: string) {
      return req.get(header)
    },
    set(header: string, value: string) {
      this.response.headers[header] = value
      res.set(header, value)
    },
  }

  // Bind getters and setters to match Koa's property delegation
  Object.defineProperty(ctx, 'body', {
    get() {
      return this.response.body
    },
    set(val) {
      this.response.body = val
    },
  })

  Object.defineProperty(ctx, 'status', {
    get() {
      return this.response.status
    },
    set(val) {
      this.response.status = val
      res.status(val)
    },
  })

  return ctx
}

/**
 * Translates a Koa-style middleware/controller to an Express middleware/handler.
 */
export function koaToExpress(koaMiddleware: (ctx: KoaContext, next: () => Promise<void>) => Promise<any>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = createKoaContext(req, res)
    let nextCalled = false

    const koaNext = async () => {
      nextCalled = true
      // Express next returns void, Koa expects a promise resolving after downstream executes
      return new Promise<void>((resolve, reject) => {
        next((err: any) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }

    try {
      await koaMiddleware(ctx, koaNext)

      if (!nextCalled && !res.headersSent) {
        if (ctx.body !== undefined) {
          // If status wasn't explicitly set, default to 200
          if (!res.statusCode) {
            res.status(ctx.status || 200)
          }
          res.json(ctx.body)
        } else {
          // If body is empty but status was set, end the response
          res.status(ctx.status || 204).end()
        }
      }
    } catch (err: any) {
      next(err)
    }
  }
}
