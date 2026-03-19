import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  inStock: boolean
}

const uuidPattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'

const paramsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: uuidPattern }
  }
}

const productSchema = {
  type: 'object',
  required: ['name', 'description', 'price', 'category', 'inStock'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number', exclusiveMinimum: 0 },
    category: { type: 'string' },
    inStock: { type: 'boolean' }
  }
}

const products: Product[] = []

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: { validation?: Array<{ message?: string; instancePath?: string; params?: Record<string, unknown> }> }, request, reply) => {
    if (error.validation) {
      const messages = error.validation.map((e) => {
        const p = e.params as { missingProperty?: string } | undefined
        if (p?.missingProperty) return `Missing required field: ${p.missingProperty}`
        if (e.instancePath?.includes('id') || e.message?.includes('pattern')) return 'Product ID must be a valid UUID'
        if (e.message?.includes('exclusiveMinimum') || e.message?.includes('minimum')) return 'Price must be a positive number'
        return e.message
      })
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: messages.filter(Boolean).join('. ') || 'Invalid request'
      })
    }
    throw error
  })

  // GET /products — list all
  fastify.get('/products', async () => {
    return products
  })

  // GET /products/:id — get one
  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = products.find((p) => p.id === request.params.id)
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    return product
  })

  // POST /products — create
  fastify.post<{ Body: Omit<Product, 'id'> }>(
    '/products',
    { schema: { body: productSchema } },
    async (request, reply) => {
      const product: Product = {
        id: randomUUID(),
        ...request.body
      }
      products.push(product)
      return reply.status(201).send(product)
    }
  )

  // PUT /products/:id — update
  fastify.put<{ Params: { id: string }; Body: Omit<Product, 'id'> }>(
    '/products/:id',
    { schema: { params: paramsSchema, body: productSchema } },
    async (request, reply) => {
      const index = products.findIndex((p) => p.id === request.params.id)
      if (index === -1) {
        return reply.status(404).send({ error: 'Product not found' })
      }
      products[index] = { id: request.params.id, ...request.body }
      return products[index]
    }
  )

  // DELETE /products/:id
  fastify.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const index = products.findIndex((p) => p.id === request.params.id)
    if (index === -1) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    products.splice(index, 1)
    return reply.status(204).send()
  })
}

export default routes
