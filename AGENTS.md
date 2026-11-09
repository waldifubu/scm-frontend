# Repository Guidelines

## Project Structure & Module Organization

This is a Vite, React, and TypeScript single-page frontend for supply-chain workflows. Keep application code in `src/`:

- `src/features/<feature>/` holds one part of the business, everything of it in one folder: its backend calls and data shapes, its pages and components, its pure helper modules and their tests. The features are `auth`, `home`, `orders`, `picking`, `packing`, `shipments`, `components` (the component catalogue and the supplier requests), `products` and `stock`. A feature imports from `shared/` and `layout/`, and from another feature only where it must (a product page shows the stock card, the packable list reuses the order-lines table).
- `src/shared/` is what no feature owns: `shared/api` (`client.ts` for the shared HTTP behavior, `pageQuery.ts`, `types.ts`), `shared/lib` (`format.ts`, `paging.ts`, `tableSort.ts`, `entityLinks.ts`) and `shared/ui` (`Pager`, `ConfirmModal`, `SortableHeader`, `Chevron`, `EntityLinkAnchor`). Shared code never imports from a feature.
- `src/layout/` is the frame around every page: the sidebar, the authenticated layout, `PageTitle`, `NavIcon` and `navigation.ts`, which decides which pages a role sees.
- `src/router.tsx`, `src/queryClient.ts`, and `src/main.tsx` configure routing, data fetching, and application startup.
- `src/assets/` and `public/` hold static assets. Put files needing bundling in `src/assets/`; use `public/` for directly served files.

Shared building blocks to reuse before writing a new one: `shared/ui/Pager.tsx` (paging buttons, driven by `shared/lib/paging.ts`), `shared/ui/ConfirmModal.tsx` (a Bootstrap modal for a question with two answers - use it instead of `window.confirm`), `shared/ui/SortableHeader.tsx` with `shared/lib/tableSort.ts`, `layout/PageTitle.tsx` (icon of the navigation entry), `shared/lib/format.ts` (`cell`, `productLabel`, `formatMoment`) and `shared/api/pageQuery.ts` (`withPage`). Which pages a role sees is decided in `layout/navigation.ts`, and a customer-only user is kept to theirs by `mayOpen` in the router. A new page goes into the feature it belongs to; a new feature gets a folder of its own under `src/features/`. Two modules in one folder must not differ only in case (`DeliveryDetails.tsx` and `deliveryDetails.ts` did, which the Windows file system treats as one name).

Place a focused test beside its subject as `*.test.ts`, as in `src/features/auth/redirect.test.ts` and `src/shared/api/client.test.ts`.

## Build, Test, and Development Commands

Use pnpm (the lockfile is `pnpm-lock.yaml`).

- `pnpm dev` starts the Vite development server. Set `API_TARGET=http://localhost:8099` to proxy `/api` to another backend.
- `pnpm build` type-checks with TypeScript and creates the production bundle in `dist/`.
- `pnpm test` runs the Vitest suite once; `pnpm test:watch` keeps it running while developing.
- `pnpm lint` runs Oxlint over the project.
- `pnpm preview` serves the production build locally.

## Coding Style & Naming Conventions

Write TypeScript and React function components. Follow the existing style: two-space indentation, single quotes, no semicolons, and trailing commas where the formatter-like conventions already use them. Name React components and page files in PascalCase (for example, `OrderDetailsPage.tsx`); use camelCase for functions, variables, and non-component modules (for example, `safeRedirect`). Keep API endpoints relative to `API_BASE` and preserve the shared cookie-based request behavior in `src/api/client.ts`.

## Testing Guidelines

Use Vitest with `describe`, `it`, and `expect`. Name tests for observable behavior, such as `keeps only an internal path`, and include invalid as well as normal inputs. Add or update tests whenever changing redirects, API helpers, or business behavior. Run `pnpm test` and `pnpm lint` before opening a review; run `pnpm build` when changing types, Vite configuration, or production-facing UI.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use short imperative commit subjects, preferably scoped: `feat(orders): add customer filter` or `fix(api): surface validation detail`. Keep commits focused. Pull requests should state the user-facing change, note relevant API or configuration changes, link the issue when one exists, and include screenshots for visual changes. Mention the commands run and any intentionally untested paths.

## Security & Configuration

Do not commit credentials or hard-code backend origins. Configure local backend routing through `API_TARGET`; production API access stays same-origin through the Vite `/api` proxy during development. Do not weaken `credentials: 'include'` or replace the existing relative API paths without considering session-cookie and CORS behavior.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
