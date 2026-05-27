// Test setup for admin package – starts/stops MSW server
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('http://localhost:5173/api/*', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({}))
  ),
  rest.post('http://localhost:5173/api/*', (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({}))
  ),
)

server.listen({ onUnhandledRequest: 'warn' })
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
