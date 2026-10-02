import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { app } from './index.js'

describe('Havenly REST API', () => {
  it('returns a health response with a request id', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('ok')
    expect(response.headers['x-request-id']).toBeTruthy()
  })

  it('returns seeded, paginated rooms', async () => {
    const response = await request(app).get('/api/rooms?limit=2&page=1')
    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta.total).toBeGreaterThan(0)
  })

  it('rejects malformed resident input with a structured error', async () => {
    const response = await request(app).post('/api/residents').send({ phone: 'not enough data' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.requestId).toBeTruthy()
  })

  it('supports the demo login contract', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'demo@campus.local', password: 'demo123' })
    expect(response.status).toBe(200)
    expect(response.body.data.token).toBeTruthy()
    expect(response.body.data.user.email).toBe('demo@campus.local')
  })
})
