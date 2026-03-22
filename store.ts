import cluster from 'node:cluster'
import { randomUUID } from 'node:crypto'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  inStock: boolean
}

export const products: Product[] = []

function localGetAll(): Product[] {
  return [...products]
}

function localGetById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

function localCreate(data: Omit<Product, 'id'>): Product {
  const product: Product = { id: randomUUID(), ...data }
  products.push(product)
  return product
}

function localUpdate(id: string, data: Omit<Product, 'id'>): Product | null {
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return null
  products[idx] = { id, ...data }
  return products[idx]
}

function localDelete(id: string): boolean {
  const idx = products.findIndex((p) => p.id === id)
  if (idx === -1) return false
  products.splice(idx, 1)
  return true
}

interface StoreIpcMessage {
  type: 'store'
  action: string
  payload: Record<string, unknown>
  requestId: string
}

interface StoreIpcResponse {
  requestId: string
  result: unknown
}

function ipcRequest<T>(action: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    const requestId = randomUUID()
    const handler = (msg: StoreIpcResponse) => {
      if (msg.requestId === requestId) {
        process.removeListener('message', handler)
        resolve(msg.result as T)
      }
    }
    process.on('message', handler)
    process.send!({ type: 'store', action, payload, requestId })
  })
}

const useIpc = cluster.isWorker

export const store = {
  getAll: useIpc
    ? () => ipcRequest<Product[]>('getAll', {})
    : async () => localGetAll(),

  getById: useIpc
    ? (id: string) => ipcRequest<Product | undefined>('getById', { id })
    : async (id: string) => localGetById(id),

  create: useIpc
    ? (data: Omit<Product, 'id'>) => ipcRequest<Product>('create', data)
    : async (data: Omit<Product, 'id'>) => localCreate(data),

  update: useIpc
    ? (id: string, data: Omit<Product, 'id'>) =>
        ipcRequest<Product | null>('update', { id, data })
    : async (id: string, data: Omit<Product, 'id'>) => localUpdate(id, data),

  delete: useIpc
    ? (id: string) => ipcRequest<boolean>('delete', { id })
    : async (id: string) => localDelete(id),
}

export function handleStoreMessage(
  msg: StoreIpcMessage,
  worker: { send: (msg: StoreIpcResponse) => void }
): void {
  if (msg.type !== 'store') return

  let result: unknown
  switch (msg.action) {
    case 'getAll':
      result = localGetAll()
      break
    case 'getById':
      result = localGetById(msg.payload.id as string)
      break
    case 'create':
      result = localCreate(msg.payload as Omit<Product, 'id'>)
      break
    case 'update': {
      const { id, data } = msg.payload as { id: string; data: Omit<Product, 'id'> }
      result = localUpdate(id, data)
      break
    }
    case 'delete':
      result = localDelete(msg.payload.id as string)
      break
  }

  worker.send({ requestId: msg.requestId, result })
}
