import 'dotenv/config'
import Fastify from 'fastify'
import productRoutes from './routes/productRoutes.ts'

const port = Number(process.env.PORT) || 3000;

const fastify = Fastify({
  logger: true
})

fastify.get('/', (req, res) => {
  res.send('Hello World')
})

fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`
  })
})

fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error)
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.'
  })
})

try {
  await fastify.register(productRoutes)
  const address = await fastify.listen({ port })
  fastify.log.info(`Server is running on ${address}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}