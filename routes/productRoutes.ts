import type { FastifyPluginAsync } from 'fastify'
import { store, type Product } from '../store.ts'

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

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: { validation?: Array<{ message?: string; instancePath?: string; params?: Record<string, unknown> }> }, request, reply) => {
    if (error.validation) {
      const messages = error.validation.map((e) => {
        const p = e.params as { missingProperty?: string } | undefined
        if (p?.missingProperty) return `Missing required field: ${p.missingProperty}`
        if (e.instancePath?.includes('id') || e.message?.includes('pattern')) return 'Product ID must be a valid UUID'
        if (e.instancePath === '/price') return 'Price must be a positive number'
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

  fastify.get('/products', async () => {
    return store.getAll()
  })

  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const product = await store.getById(request.params.id)
    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    return product
  })

  fastify.post<{ Body: Omit<Product, 'id'> }>(
    '/products',
    { schema: { body: productSchema } },
    async (request, reply) => {
      const product = await store.create(request.body)
      return reply.status(201).send(product)
    }
  )

  fastify.put<{ Params: { id: string }; Body: Omit<Product, 'id'> }>(
    '/products/:id',
    { schema: { params: paramsSchema, body: productSchema } },
    async (request, reply) => {
      const product = await store.update(request.params.id, request.body)
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' })
      }
      return product
    }
  )

  fastify.delete<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const deleted = await store.delete(request.params.id)
    if (!deleted) {
      return reply.status(404).send({ error: 'Product not found' })
    }
    return reply.status(204).send()
  })
}

export default routes
