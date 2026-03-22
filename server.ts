import 'dotenv/config'
import { buildApp } from './app.ts'

const port = Number(process.env.PORT) || 3000
const app = buildApp()

try {
  const address = await app.listen({ port })
  app.log.info(`Server is running on ${address}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
