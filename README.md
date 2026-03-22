# CRUD API

A RESTful CRUD API for managing products, built with Fastify and TypeScript. Supports development and production modes, as well as horizontal scaling via the Node.js Cluster API.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- npm

## Installation

```bash
git clone <repository-url>
cd CRUD-API
npm install
```

## Configuration

Copy the example environment file and adjust values as needed:

```bash
cp .env.example .env
```

| Variable | Description            | Default |
|----------|------------------------|---------|
| `PORT`   | Port the server runs on | `3000`  |

## Running the Application

### Development Mode

Runs the app with `nodemon` + `tsx` for automatic restarts on file changes:

```bash
npm run start:dev
```

### Production Mode

Builds the TypeScript source into a bundled JavaScript file and runs it with Node.js:

```bash
npm run start:prod
```

### Multi-Instance Mode (Horizontal Scaling)

Starts multiple application instances using the Node.js Cluster API with a round-robin load balancer:

```bash
npm run start:multi
```

- The **load balancer** listens on `PORT` (default `3000`)
- **Worker instances** listen on `PORT+1`, `PORT+2`, ..., `PORT+N` (where N = available CPU parallelism − 1)
- Requests to the load balancer are distributed across workers in round-robin order
- State is consistent across all workers via IPC with the primary process

## API Endpoints

Base URL: `http://localhost:3000/api`

### Get All Products

```
GET /api/products
```

**Response:** `200 OK` — JSON array of all products.

### Get Product by ID

```
GET /api/products/:id
```

**Response:** `200 OK` — the product object, or `404 Not Found` if the product doesn't exist.

### Create Product

```
POST /api/products
Content-Type: application/json
```

**Request body:**

```json
{
  "name": "Laptop",
  "description": "A gaming laptop",
  "price": 999.99,
  "category": "electronics",
  "inStock": true
}
```

All fields are required. `price` must be a positive number.

**Response:** `201 Created` — the created product with a generated UUID `id`.

### Update Product

```
PUT /api/products/:id
Content-Type: application/json
```

**Request body:** same shape as Create (all fields required).

**Response:** `200 OK` — the updated product, or `404 Not Found`.

### Delete Product

```
DELETE /api/products/:id
```

**Response:** `204 No Content` on success, or `404 Not Found`.

### Error Responses

| Status | Meaning |
|--------|---------|
| `400`  | Invalid request body or invalid UUID format |
| `404`  | Product or route not found |
| `500`  | Internal server error |

## Product Schema

Each product is stored as an object with the following fields:

| Field         | Type      | Description                  |
|---------------|-----------|------------------------------|
| `id`          | `string`  | Auto-generated UUID v4       |
| `name`        | `string`  | Product name                 |
| `description` | `string`  | Product description          |
| `price`       | `number`  | Price (must be > 0)          |
| `category`    | `string`  | Product category             |
| `inStock`     | `boolean` | Whether the product is in stock |

## Testing

Run the test suite:

```bash
npm test
```

Tests cover three scenarios:

1. **Full CRUD lifecycle** — create, read, update, delete a product
2. **Request body validation** — missing fields, invalid price
3. **Invalid / missing resources** — non-existent IDs, invalid UUIDs, unknown routes
