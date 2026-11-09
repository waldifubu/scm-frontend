# Supply chain management frontend

A React single-page application for supply-chain workflows. It connects to the `scm-temporal` Spring Boot backend and provides screens for orders, picking, packing, shipments, inventory, products, and component requests.

## Requirements

- Node.js and [pnpm](https://pnpm.io/)
- The `scm-temporal` backend, including its `/api/1.0` endpoints

## Getting started

Install dependencies and start the development server:

```sh
pnpm install
pnpm dev
```

By default, Vite proxies `/api` requests to `http://localhost:8080`. To use a backend on another address, set `API_TARGET` before starting the server:

```sh
# macOS/Linux
API_TARGET=http://localhost:8099 pnpm dev

# PowerShell
$env:API_TARGET = 'http://localhost:8099'
pnpm dev
```

Open the local URL printed by Vite. Sign-in is handled by the backend; the frontend expects the backend to set the session cookie. API requests use the same-origin `/api/1.0` path and include credentials.

## Available commands

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `pnpm dev`        | Start the Vite development server                      |
| `pnpm test`       | Run the Vitest suite once                              |
| `pnpm test:watch` | Run Vitest in watch mode                               |
| `pnpm lint`       | Run Oxlint                                             |
| `pnpm build`      | Type-check and create the production bundle in `dist/` |
| `pnpm preview`    | Preview the production bundle locally                  |

## Features

- Create and track orders, and manage order items.
- Pick orders, pack items into containers, and prepare shipments.
- Plan shipments and support carrier shipment and delivery workflows.
- View storehouses and stock, and book or transfer inventory.
- Browse products and components, and manage component requests.

Navigation adapts to the signed-in user's roles. The backend remains responsible for authorization; hiding a page in the frontend does not grant or replace access control.

## Project structure

- `src/features/` has one folder per part of the business (`auth`, `home`, `orders`, `picking`, `packing`, `shipments`, `components`, `products`, `stock`), each with its backend calls, pages, helpers and tests.
- `src/shared/` holds what no feature owns: `api/` (`client.ts` centralizes HTTP behavior), `lib/` (formatting, paging, sorting) and `ui/` (pager, confirm modal, sortable header).
- `src/layout/` is the frame around every page: sidebar, authenticated layout, page title and `navigation.ts`, which defines the role-aware navigation.
- `src/router.tsx` configures routes and authentication guards; `src/queryClient.ts` and `src/main.tsx` start the application.
- Focused Vitest tests live beside their subject as `*.test.ts`.
- `src/assets/` contains bundled assets; `public/` contains static files served as-is.

See [AGENTS.md](AGENTS.md) for development conventions and repository guidance.
