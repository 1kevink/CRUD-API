import 'dotenv/config'
import cluster from 'node:cluster'
import { availableParallelism } from 'node:os'
import { createServer, request as httpRequest } from 'node:http'
import { handleStoreMessage } from './store.ts'
import { buildApp } from './app.ts'

const PORT = Number(process.env.PORT) || 3000
const numWorkers = Math.max(availableParallelism() - 1, 1)

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid}: starting ${numWorkers} workers (ports ${PORT + 1}–${PORT + numWorkers})`)

  const workerPorts = new Map<number, number>()

  function forkWorker(port: number) {
    const worker = cluster.fork({ WORKER_PORT: String(port) })
    workerPorts.set(worker.id, port)
    worker.on('message', (msg) => handleStoreMessage(msg, worker))
    return worker
  }

  for (let i = 1; i <= numWorkers; i++) {
    forkWorker(PORT + i)
  }

  cluster.on('exit', (worker, code, signal) => {
    const port = workerPorts.get(worker.id)!
    workerPorts.delete(worker.id)
    console.log(`Primary: worker ${worker.process.pid} exited (${signal || code}), restarting on port ${port}`)
    forkWorker(port)
  })

  let currentIndex = 0

  createServer((clientReq, clientRes) => {
    const workerPort = PORT + (currentIndex % numWorkers) + 1
    currentIndex++

    const proxyReq = httpRequest(
      {
        hostname: 'localhost',
        port: workerPort,
        path: clientReq.url,
        method: clientReq.method,
        headers: clientReq.headers,
      },
      (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode!, proxyRes.headers)
        proxyRes.pipe(clientRes)
      }
    )

    proxyReq.on('error', (err) => {
      console.error(`Primary: proxy error forwarding to port ${workerPort}:`, err.message)
      if (!clientRes.headersSent) {
        clientRes.writeHead(502, { 'Content-Type': 'application/json' })
      }
      clientRes.end(JSON.stringify({ statusCode: 502, error: 'Bad Gateway' }))
    })

    clientReq.pipe(proxyReq)
  }).listen(PORT, () => {
    console.log(`Primary ${process.pid}: load balancer listening on http://localhost:${PORT}`)
  })
} else {
  const port = Number(process.env.WORKER_PORT)
  const app = buildApp()

  try {
    await app.listen({ port })
    console.log(`Worker ${process.pid}: listening on http://localhost:${port}`)
  } catch (err) {
    console.error(`Worker ${process.pid}: failed to start`, err)
    process.exit(1)
  }
}
