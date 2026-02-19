# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server that wraps the Fakturownia.pl REST API, exposing 36 tools for invoicing, clients, products, payments, warehouse documents, categories, warehouses, departments, and account info. Communicates via stdio transport.

## Build & Run

```bash
npm install
npm run build      # tsc → outputs to dist/
npm run dev        # tsc --watch
npm start          # node dist/index.js (requires env vars)
```

Requires env vars: `FAKTUROWNIA_API_TOKEN` and `FAKTUROWNIA_DOMAIN` (subdomain, e.g. `mojafirma` for `mojafirma.fakturownia.pl`). See `.env.example` for reference.

No test framework is configured — there are no tests.

## Architecture

Two source files with clear separation:

- **`src/fakturownia-client.ts`** — Stateless HTTP client wrapping Fakturownia REST API. Single `request()` method handles auth token injection (query param for GET/DELETE, JSON body for POST/PUT/PATCH), retry with exponential backoff (429/5xx), and request timeouts via AbortController. Each entity (invoices, clients, products, payments, warehouse docs, categories, warehouses, departments, account) has full CRUD methods. Configurable via `FakturowniaConfig` (timeoutMs, maxRetries).

- **`src/index.ts`** — MCP server using `@modelcontextprotocol/sdk`. Registers 36 tools via `server.tool()` with Zod schemas. Key helpers:
  - `handleTool()` — wraps every tool handler with try/catch, returning `result()` or `errorResult()`
  - `buildQueryParams()` — strips undefined values from optional params for list endpoints
  - `parseJsonObject()` — safe JSON parsing with type validation for create/update endpoints

Flow: `Claude Client → stdio → MCP Server (index.ts) → FakturowniaClient → HTTPS → fakturownia.pl`

## Key Patterns

- ES modules throughout (`"type": "module"`, `.js` extensions in imports)
- Zod for tool parameter validation (imported from MCP SDK, not a direct dependency)
- List endpoints use `Record<string, string>` query params; create/update endpoints accept JSON strings validated via `parseJsonObject()`
- All tool handlers use `handleTool()` wrapper — never write raw try/catch in tool definitions
- `page`/`per_page` params are typed as `z.string()` (not `z.number()`) because they pass directly as HTTP query params
- API docs live in `docs/fakturownia-api-documentation.md` — comprehensive reference including KSeF (Polish e-invoicing system) integration details
