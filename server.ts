import Fastify from 'fastify'
import productRoutes from './routes/productRoutes.ts'
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

try {
  await fastify.register(productRoutes)
  const address = await fastify.listen({ port: 3000 })
  fastify.log.info(`Server is running on ${address}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}