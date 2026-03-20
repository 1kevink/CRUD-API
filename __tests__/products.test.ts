import Fastify, { FastifyInstance } from 'fastify'
import productRoutes, { products } from '../routes/productRoutes.ts'

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify()
  await app.register(productRoutes)
  return app
}

const newProduct = {
  name: 'Laptop',
  description: 'A gaming laptop',
  price: 999.99,
  category: 'electronics',
  inStock: true,
}

const updatedProduct = {
  name: 'Gaming Laptop Pro',
  description: 'An updated gaming laptop',
  price: 1299.99,
  category: 'electronics',
  inStock: false,
}

// Scenario 1: Full CRUD lifecycle
describe('Scenario 1: Full CRUD lifecycle', () => {
  let app: FastifyInstance
  let createdId: string

  beforeAll(async () => {
    app = await buildApp()
    products.splice(0)
  })
  afterAll(async () => { await app.close() })

  it('GET /products returns empty array', async () => {
    const res = await app.inject({ method: 'GET', url: '/products' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toEqual([])
  })

  it('POST /products creates a new product and returns it with a generated id', async () => {
    const res = await app.inject({ method: 'POST', url: '/products', payload: newProduct })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject(newProduct)
    expect(body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    createdId = body.id
  })

  it('GET /products/:id returns the created product', async () => {
    const res = await app.inject({ method: 'GET', url: `/products/${createdId}` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ id: createdId, ...newProduct })
  })

  it('PUT /products/:id updates the product and returns it with the same id', async () => {
    const res = await app.inject({ method: 'PUT', url: `/products/${createdId}`, payload: updatedProduct })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toMatchObject({ id: createdId, ...updatedProduct })
  })

  it('DELETE /products/:id deletes the product and returns 204', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/products/${createdId}` })
    expect(res.statusCode).toBe(204)
  })

  it('GET /products/:id returns 404 after deletion', async () => {
    const res = await app.inject({ method: 'GET', url: `/products/${createdId}` })
    expect(res.statusCode).toBe(404)
  })
})

// Scenario 2: Validation on POST
describe('Scenario 2: POST /products — request body validation', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { products.splice(0) })

  it('returns 400 if required field "name" is missing', async () => {
    const { name, ...rest } = newProduct
    const res = await app.inject({ method: 'POST', url: '/products', payload: rest })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).message).toContain('name')
  })

  it('returns 400 if required field "description" is missing', async () => {
    const { description, ...rest } = newProduct
    const res = await app.inject({ method: 'POST', url: '/products', payload: rest })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).message).toContain('description')
  })

  it('returns 400 if price is 0', async () => {
    const res = await app.inject({ method: 'POST', url: '/products', payload: { ...newProduct, price: 0 } })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).message).toContain('positive')
  })

  it('returns 400 if price is negative', async () => {
    const res = await app.inject({ method: 'POST', url: '/products', payload: { ...newProduct, price: -5 } })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).message).toContain('positive')
  })
})

// Scenario 3: Invalid or missing resources
describe('Scenario 3: Requests with invalid or missing resources', () => {
  let app: FastifyInstance

  beforeAll(async () => { app = await buildApp() })
  afterAll(async () => { await app.close() })
  beforeEach(() => { products.splice(0) })

  it('GET /products/:id returns 404 for non-existent product', async () => {
    const res = await app.inject({ method: 'GET', url: '/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    expect(res.statusCode).toBe(404)
  })

  it('PUT /products/:id returns 400 for invalid UUID', async () => {
    const res = await app.inject({ method: 'PUT', url: '/products/not-a-uuid', payload: updatedProduct })
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.body).message).toContain('UUID')
  })

  it('PUT /products/:id returns 404 for non-existent product', async () => {
    const res = await app.inject({ method: 'PUT', url: '/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', payload: updatedProduct })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /products/:id returns 404 for non-existent product', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    expect(res.statusCode).toBe(404)
  })

  it('GET /non-existing-route returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/some-non/existing/resource' })
    expect(res.statusCode).toBe(404)
  })
})
