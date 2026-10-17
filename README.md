# Pulse: Operations Dashboard

An internal ops dashboard for monitoring shipments, working an exception queue and drilling into a shipment.
Built with **Next.js (App Router) + TypeScript (strict)** against a deliberately flaky mock backend.

> **Walkthrough video:** _ https://www.loom.com/share/01d2c25ba4d944b7aba1c4cc76ddda72

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm test             # 30 unit tests for sorting / filtering / cursor pagination
npm run typecheck && npm run lint
```

The in-memory dataset (1,200 shipments) is generated on server start, so ETAs are always in the near future and
state resets on restart.

### Turning the chaos up or down

| Env var                         | Default    | Effect                                                     |
| ------------------------------- | ---------- | ---------------------------------------------------------- |
| `CHAOS_MIN_MS` / `CHAOS_MAX_MS` | 150 / 1500 | Random latency on every API call                           |
| `CHAOS_READ_RATE`               | 0.03       | Probability a read returns 500                             |
| `CHAOS_WRITE_RATE`              | 0.08       | Probability a write returns 500                            |
| `CARRIER_FAIL_RATE`             | 0.15       | Failure rate of the slow carrier-history partner API       |
| `CARRIER_EXTRA_DELAY_MS`        | 1800       | Extra delay on carrier history                             |
| `SIM_INTERVAL_MS`               | 20000      | How often a simulated carrier feed / teammate changes data |
| `CHAOS_DISABLED=1`              | off        | No latency, no failures, no simulation (used for tests)    |

Handy for the walkthrough: `CHAOS_WRITE_RATE=1 npm run dev` makes every action fail so rollback is easy to show;
`CHAOS_READ_RATE=1` shows every full-failure state.

## Architecture

```
src/
  app/api/…            Route Handlers (the "backend"): latency + failures + cursor pagination + role checks
  app/…                Pages: Server Components by default
  components/          Client islands only where interaction needs them
  hooks/use-polling.ts Polling with exponential backoff
  lib/query.ts         Pure filter / sort / keyset-pagination logic (unit tested)
  lib/store.ts         In-memory store, optimistic-concurrency writes, background simulation
  lib/route.ts         apiRoute(): role check -> simulated network -> handler -> typed errors
  lib/api.ts           Server-side fetch to our own API (cookie forwarding, timeout, one retry, never throws)
  lib/client-api.ts    Same contract for the browser
```

### Rendering strategy (why each route is what it is)

| Route             | Strategy                                                                                                | Reasoning                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` Overview      | Server Component, dynamic                                                                               | Read-only data that should be fresh on every visit; ships almost no JS.                                                                                                                           |
| `/shipments`      | Server Component renders the first page from `searchParams`; one client island (`ShipmentExplorer`)     | First paint contains real rows (no spinner). The island is only the controls; every interaction writes to the URL and the server re-renders, so refresh, back and shared links all work for free. |
| `/shipments/[id]` | Server Component + `loading.tsx` + a `<Suspense>` around the slow carrier panel                         | The primary content paints as soon as the shipment is fetched (~0.3s measured locally); the 2s+ carrier call streams in afterwards and can fail on its own without taking the page down.          |
| `/exceptions`     | Server render of the initial queue + a client component                                                 | Needs optimistic updates, polling and per-card state, which are client concerns. The server render means the list is in the first HTML.                                                           |
| `/audit`          | Server Component                                                                                        | Manager-only; the API enforces the role, the page just renders the 403 state.                                                                                                                     |
| Layout            | Async Server Component; sidebar is a client component with the queue badge streamed in via `<Suspense>` | The shell never waits on a data call.                                                                                                                                                             |

**Server Components call our own Route Handlers over HTTP** (`lib/api.ts`) instead of importing the data layer.
This costs an extra hop, but it means the page exercises the same latency, failure and role rules as any other
client. In a real system I would call the service layer directly from Server Components and keep Route Handlers
for browser clients.

### Pagination

Real keyset (cursor) pagination: the cursor encodes the sort value and id of the boundary row plus a direction, so pages
stay stable when other rows change, cost does not grow with depth, and **Previous** works (not just Next). A cursor for
a different sort type, or garbage, returns 400; a cursor that points past the end restarts from the top. Sort fields are
whitelisted. See `src/lib/query.test.ts`.

### Resilience

- Every fetch goes through helpers that **never throw** and always have a timeout (8s), so there is no unhandled
  rejection and no infinite spinner. Server reads retry once on 5xx.
- **Loading:** `loading.tsx` per route, Suspense fallbacks, a dimmed table while navigating.
- **Empty:** no filter matches, empty queue, empty audit log.
- **Partial failure:** the carrier panel fails independently with its own Retry.
- **Full failure:** each page renders an error state with a retry; the shipments table keeps your filters visible.
- `error.tsx` / `global-error.tsx` catch anything unexpected.
- **Optimistic actions:** Resolve hides the card instantly, Escalate marks it instantly. On failure the card
  returns **to its original position** with an inline error and a retry button. Several actions can be in flight at once.

### Accessibility

Skip link, `aria-sort` on sortable headers, table captions, `scope="col"`, polite live regions for status/notices,
`role="alert"` for failures, visible focus ring on every control (including the inputs, which used to suppress it),
a focusable scroll container for the table, `/` focuses search, reduced-motion support. At 375px the sidebar collapses to
an icon rail with `aria-label`s and the table drops secondary columns.

## Escalation ladder

| #   | Item                   | Status                                                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Concurrency conflict   | **Done.** Writes carry the version the user saw; a stale write returns 409 + the current record. The UI rolls back, shows the teammate's change and offers **Resolve anyway** or **Keep their change**. A "Demo: simulate teammate" button (manager only) reproduces it on demand by pausing polling for 20s.                                   |
| 2   | Real-time-ish updates  | **Done.** Polling with exponential backoff + jitter (5s -> 60s), paused while the tab is hidden, manual refresh, a live status line. Rows update in place with stable order; if you are scrolled down, new exceptions wait behind a "N new" pill so nothing jumps. A version guard stops a slow poll from resurrecting a row you just resolved. |
| 3   | Command palette        | Skipped                                                                                                                                                                                                                                                                                                                                         |
| 4   | 10,000-row performance | Skipped (pages are 25 rows, so no virtualization was needed; nothing measured)                                                                                                                                                                                                                                                                  |
| 5   | Caching layer          | Skipped. All reads are `no-store` on purpose; see below.                                                                                                                                                                                                                                                                                        |
| 6   | Role-based view        | **Done.** `pulse_role` is an httpOnly cookie (default: Viewer). Viewers get a read-only queue; Managers can resolve/escalate and see the Audit log. Enforced in the route handlers (403), not just hidden in the UI; a tampered or missing cookie is a Viewer.                                                                                  |

Polling over SSE: it works on serverless hosts, needs no long-lived connection, and degrades predictably.

## Trade-offs and known limitations

- **Caching is intentionally absent.** Ops data goes stale in seconds, so correctness beat speed. With more time:
  `unstable_cache` with tags per shipment, `revalidateTag` on writes, and a short stale-while-revalidate window for
  list <-> detail navigation.
- The store is a per-process in-memory singleton: not safe for serverless/multi-instance, and it resets on restart.
- Mock auth is open by design (anyone can switch role); the point is that **authorization happens on the server**.
- An unknown shipment id renders the not-found page but returns HTTP 200, because the response has already started
  streaming behind `loading.tsx`.
- The simulated "second user" is a server-side timer plus a demo button, not a real second session.
- Nothing is virtualized and no Lighthouse numbers were collected.
- Date handling is UTC everywhere so server and client render the same text.

## What I would do with more time

Command palette over a client-side cache, tag-based caching, and a committed end-to-end suite
(Playwright + axe) running in CI. Today only the pagination/sorting logic has automated tests.
