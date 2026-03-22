import Fastify from 'fastify'
import productRoutes from './routes/productRoutes.ts'

export function buildApp() {
  const fastify = Fastify({ logger: true })

  fastify.get('/', (_req, res) => {
    res.send('Hello World')
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    })
  })

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error)
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again later.',
    })
  })

  fastify.register(productRoutes, { prefix: '/api' })

  return fastify
}
