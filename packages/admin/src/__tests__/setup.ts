// Test setup for admin package – starts/stops MSW server
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.get('http://localhost:5173/api/*', () => {
    return HttpResponse.json({})
  }),
  http.post('http://localhost:5173/api/*', () => {
    return HttpResponse.json({})
  })
)

server.listen({ onUnhandledRequest: 'warn' })
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
