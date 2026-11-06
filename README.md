# Supply chain frontend

The React client of the `scm-temporal` backend (a Spring Boot API, `/api/1.0`): orders, picking, packing,
shipments, stock and the catalogue. React 19, TypeScript, Vite, TanStack Query and Router, Bootstrap 5.3.

## Running it

```
pnpm install
pnpm dev        # Vite; API_TARGET=http://localhost:8099 proxies /api to another backend
pnpm test       # Vitest, once
pnpm lint       # Oxlint
pnpm build      # tsc -b, then the production bundle in dist/
```

The session is the backend's `HttpOnly` cookie; every call goes through `src/api/client.ts` with
`credentials: 'include'`. Nothing here reads a token.

## What a role sees

The navigation (`src/navigation.ts`) is built from the roles of `GET /me`. A user who holds one role only is
kept to its pages: a **carrier** (DISTRIBUTOR) sees *Shipments* and lands there, a **customer** sees *Create order*
and *Orders* and is sent to *Orders* from any other address (`mayOpen`, checked in the router). With another role
next to it the pages of that role are theirs too. The backend answers 403 wherever the navigation hides a page, so
this is convenience, not protection.

| Page | Roles | Notes |
|------|-------|-------|
| Orders | customer, manager, warehouse, admin | status filter (default `CREATED`); a customer sees their own |
| New orders | manager, warehouse, admin | read-only for the warehouse |
| Picking Orders | warehouse, admin | *To pick* / *Picked*; **Pick**, and **Release** (red, asks first) to take a pick back |
| Order items, Packable items | manager, warehouse, admin | the product as *name (articleNo)*; the navigation lists them for everybody but the backend admits these three |
| Packages | warehouse, admin | filter by the fulfillment status of the order line, starts on `PACKED`; **Create container** and **Add to container** (pick an open container by radio, `POST /packing/shipment/{id}/items`) fold open |
| Containers | warehouse, admin | *Complete container* asks first, the contents are fixed afterwards |
| Shippable Items | logistics, admin | the containers that are `PACKED` and in no shipment yet, `GET /shipments/packages`, with the customer of each; a click on a row opens `/shippable-items/{id}` with what is in it; tick containers and **Create shipment** (`POST /shipments`, the customer is read off the contents), or **Add to Shipment**: pick one of the CREATED shipments in a grid (those of another customer are greyed out) and **Add** (`POST /shipments/{id}/packages`) |
| Shipments | logistics, admin, carriers | planners assign a distributor; a carrier accepts, **declines**, sets the tracking number, ships, delivers |
| Storehouses, Stock | warehouse, admin | *Stock*: the inventory per article (all storehouses added up, `available` 0 in red), the per-storehouse view, **Book** and **Transfer** |
| Products, Components | everyone | managers edit products |

## How it is put together

- `src/api/` – one module per backend resource, with the types, the query options and the calls. A paged list
  answers `{content, total, page, size}`; `pageQuery.ts` adds `page=`.
- `src/pages/` – the screens. Shared pieces: `Pager` (the buttons under every paged table), `SortableHeader`,
  `ConfirmModal` (a Bootstrap modal built from its classes, for anything that moves stock or fixes a record),
  `PageTitle` with the icon of the navigation entry.
- Rules that can be tested live in plain modules beside the page (`navigation.ts`, `paging.ts`, `stockForms.ts`,
  `entityLinks.ts`, `format.ts`, `tableSort.ts`) and have a `*.test.ts` next to them.
- Bootstrap is imported after `index.css`, so an override of a Bootstrap class needs a doubled selector
  (`.btn.btn-orange`).

See `AGENTS.md` for the conventions.
