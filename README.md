# Employee Records

A React + TypeScript + Vite app for browsing, searching, filtering,
paginating, creating, editing, deleting, and exporting employee records
backed by a real REST API (MockAPI.io). Create/edit/delete all round-trip
through the API (POST/PUT/DELETE) before local state changes, and every
outcome — success or failure — surfaces as a bottom-center snackbar.

<img width="1470" height="956" alt="Screenshot 2026-09-14 at 2 26 00 PM" src="https://github.com/user-attachments/assets/a77e47ef-51e4-4bdc-a5b3-76d0e429329c" />

## 1. Getting started

### Prerequisites

- Node.js 18+ and npm

### Install

```bash
npm install
```

### Configure the API

Data comes from a MockAPI.io endpoint, read via `VITE_API_BASE_URL`. Copy
the example env file and point it at your own MockAPI resource:

```bash
cp .env.example .env
```

Then edit `.env`:

```bash
VITE_API_BASE_URL=https://<your-mockapi-project-id>.mockapi.io/api/v1/employees
```

The MockAPI resource is expected to expose `id`, `name`, `email`,
`department`, `role`, and `status` fields per record (see
`src/services/employeeApi.ts` for the exact mapping — unknown/missing
fields fall back to safe defaults rather than throwing). The app reads via
GET and writes via POST/PUT/DELETE against the same resource, which is
MockAPI's default REST behavior — no extra endpoint configuration needed.

### Run

```bash
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

### Other scripts

```bash
npm run build     # type-check (tsc -b) + production build
npm run preview   # serve the production build locally
npm run lint      # oxlint
npm run test      # vitest run — see "Testing" below
```

## 2. Architecture overview

### Folder structure

```
src/
├── components/   UI components: table/row, form, modal, confirm dialog,
│                 search/filter/pagination controls, snackbar, loading
│                 skeleton, and error/empty states
├── hooks/        Reusable stateful logic, kept out of components:
│                 useEmployees (fetch + async create/edit/delete against
│                 the API), useEmployeeFilters (search + department
│                 filtering derivation), useDebouncedValue, usePagination,
│                 useSnackbar (toast queue + auto-dismiss timer)
├── services/     employeeApi.ts — the only file that knows the MockAPI
│                 request/response shape (GET/POST/PUT/DELETE); maps
│                 responses into the app's Employee type so raw API shape
│                 never leaks into components
├── types/        Shared TypeScript types (Employee, EmployeeCreateInput, ...)
├── utils/        Pure functions: form validation/sanitization
│                 (validation.ts), CSV/JSON export + CSV-injection guard
│                 (exportUtils.ts)
└── App.tsx       Composes the hooks + components; owns UI state (search
                  input, selected departments, pagination, which modal is
                  open/for which employee) and derives filtered/paginated
                  data via hooks — no business logic lives inside
                  individual components
```

### Why TanStack Table + TanStack Virtual

- **`@tanstack/react-table`** is headless — it owns column definitions and
  row/header models, but renders no markup or CSS of its own, so nothing
  needs to be fought or overridden to match this app's design.
- **`@tanstack/react-virtual`** only mounts the table rows that intersect
  the scroll viewport (plus a small overscan). The DOM row count stays
  small and roughly constant regardless of how large the filtered dataset
  is — this is what makes the table's performance requirements achievable
  at all (see [Performance decisions](#3-performance-decisions) below).
- Together they're small, composable, and fully custom-styled, instead of
  pulling in a full grid framework (e.g. AG Grid) whose bundled UI and
  interaction model would need to be worked around.

### Why no global state library (Redux/Zustand/etc.)

- All server data flows through exactly one custom hook, `useEmployees`,
  which owns `loading`/`error`/`data` and exposes async `addEmployee`/
  `editEmployee`/`deleteEmployee` (each hits the API first and only
  updates local state on success). There's only one consumer of this state
  (`App.tsx`), so there's nothing for a global store to coordinate.
- All UI state (search input, selected departments, current page, which
  modal is open, which employee is pending delete) is local `useState` in
  `App.tsx`, since nothing outside that component tree ever needs to read
  or write it. The one piece of state with more than one logical
  "consumer" — toast notifications — still doesn't need a global store:
  `useSnackbar` owns it, and the single `<Snackbar>` instance is mounted
  once at the `App` root.
- Derived state — the filtered list, the paginated slice, the unique
  department list — is computed with `useMemo` directly from the state
  above, not duplicated into its own stored state. There's no
  synchronization problem here that Redux/Zustand would exist to solve;
  adding one would mean more API surface and boilerplate managing state
  that already has exactly one owner.

## 3. Performance decisions

### Virtualization

`EmployeeTable` renders through `@tanstack/react-virtual`. Regardless of how
many rows are in the filtered/paginated set passed to it, only the rows
intersecting the scroll viewport (plus an overscan of 8) are ever mounted in
the DOM — verified by watching the DOM row count stay in the ~17–19 range
while scrolling through datasets of 100+ rows (before pagination caps it
further to the current page size).

### Memoization — what's memoized and why

| Where | What | Why |
|---|---|---|
| `hooks/useEmployeeFilters.ts` | `departments` and `filteredEmployees` (both `useMemo`) | Search/filter over the dataset only re-runs when the data or the debounced query/filter actually change — not on every keystroke before the debounce fires, and not on unrelated state changes (pagination, modal open/close). The unique/sorted department list is rebuilt only when the underlying data changes. Extracted out of `App.tsx` so the derivation logic has one owner, same as the fetch/CRUD logic in `useEmployees`. |
| `App.tsx` | `pendingDeleteEmployee` (`useMemo`, deps `[data, pendingDeleteId]`) | A plain `.find()` over `data` would otherwise run on *every* App render, including every keystroke in the search box. Memoized so it only recomputes when the data or the pending-delete id changes. |
| `App.tsx` | All event handlers passed to children (`handleEditEmployee`, `handleRequestDelete`, `handleCancelDelete`, `handleConfirmDelete`, `handleOpenAddModal`, `handleCloseFormModal`, `handleExportCsv`, `handleExportJson`, `handleCreateEmployee`, `handleUpdateEmployee`) | Wrapped in `useCallback` with tight dependency arrays so they keep the same reference across unrelated App re-renders. This is what makes `React.memo` on `EmployeeRow` (below) actually skip re-renders instead of being cosmetic. |
| `hooks/usePagination.ts` | `pageItems` (`useMemo`), `goToPage`/`nextPage`/`prevPage` (`useCallback`) | The page slice isn't rebuilt unless the source array, page, or page size change; the page-change callbacks keep a stable identity for `Pagination`'s buttons. |
| `hooks/useEmployees.ts` | `addEmployee`/`editEmployee`/`deleteEmployee` (`useCallback`) | Stable identities for the callbacks `App.tsx` wraps and passes down through `EmployeeTable` → `EmployeeRow`. |
| `components/EmployeeRow.tsx` | `React.memo(EmployeeRowComponent)` | The actual perf-critical component — it's the one rendered per virtualized row. It only re-renders when its own `employee`/`onEdit`/`onDelete` props change, which the audit above confirms they don't for unrelated App state changes. |
| `components/EmployeeTable.tsx` | `employee={row.original}`, `onEdit={onEditEmployee}`, `onDelete={onDeleteEmployee}` passed straight through to `EmployeeRow` | No inline arrow functions or object/array literals are created per row — a `() => onDelete(employee.id)` written at this call site would hand every row a brand-new function on every render and defeat `React.memo` entirely. Each row's own button instead calls `onDelete(employee.id)` internally, so the *prop* handed to each `EmployeeRow` stays the same function reference across renders. |
| `components/Modal.tsx`, `EmployeeForm.tsx`, `ConfirmDialog.tsx` | Deliberately **not** wrapped in `React.memo` | Each renders once (not in a list), and the render cost of a handful of form/dialog DOM nodes is trivial — a memo's shallow prop comparison would cost more than the render it's avoiding. |
| `components/SearchBar.tsx`, `FilterPanel.tsx`, `Pagination.tsx` | Inline handlers left as-is (not `useCallback`) | They're only ever passed to native DOM elements (`<input>`, `<button>`), not to memoized custom components — `React.memo`'s bail-out doesn't apply to host elements, so there's nothing for a stable reference to protect here. |

### Code-splitting

`Modal`, `EmployeeForm`, and `ConfirmDialog` (which itself renders `Modal`)
are loaded via `React.lazy` + `Suspense` (fallback: `Loading`), and are only
rendered — so only fetched — once the user opens the Add-Employee form or
requests a delete. Confirmed in the production build: they come out as
separate chunks (`Modal-*.js`, `EmployeeForm-*.js`, `ConfirmDialog-*.js`)
rather than being folded into the main bundle, and in a live run the network
panel shows zero requests for those modules until the corresponding button
is actually clicked.

### Where the bottleneck would be without these

The table re-rendering on every keystroke — if search weren't debounced and
`filteredEmployees` weren't memoized, every character typed would re-filter
the full dataset and, without `React.memo`/stable callbacks on `EmployeeRow`,
re-render every mounted row on every keystroke instead of just the rows
whose data changed.

## 4. Security decisions

| Area | What was checked / done |
|---|---|
| XSS | Zero `dangerouslySetInnerHTML` usages anywhere in `src/`. All employee/API/form data renders exclusively as JSX text-node interpolation, which React escapes by default. Also confirmed no `.innerHTML`, `eval`, or `new Function` usage anywhere. |
| Secrets | The MockAPI base URL is read only via `import.meta.env.VITE_API_BASE_URL`; `.env` (holding the real URL) is listed in `.gitignore`, and `.env.example` ships a placeholder, never the real endpoint. Grepped `src/` for API-key/secret/token-shaped strings and the real MockAPI URL/project id: none found. No `localStorage`/`sessionStorage` usage (nothing sensitive is persisted client-side to begin with). |
| Input validation/sanitization | `EmployeeForm` (shared by both create and edit) runs every field through `sanitizeEmployeeFormValues` (trims, strips `<`/`>`) and then `validateEmployee` (required fields, email regex) before the sanitized values ever reach `onSubmit`/the API call — see `utils/validation.ts`. Neither the POST nor the PUT request fires until validation passes. The search box was deliberately left unsanitized: it only ever feeds a plain `.toLowerCase().includes()` substring match (never a `new RegExp(userInput)`, so no ReDoS/regex-injection surface) and is rendered back only as its own controlled `<input value>` — there's no injection-relevant sink for it to sanitize against. |
| Error messages | Same pattern on both the read and write paths. `useEmployees.ts`'s fetch `.catch()` discards the actual thrown error entirely (doesn't even bind it) and always sets one fixed, friendly string (`'Unable to load employee records.'`) — `ErrorState` renders only that string as a plain text node, the one call site for it in the app. `addEmployee`/`editEmployee`/`deleteEmployee` each wrap their API call in a `try`/`catch` that also discards the real error and resolves `false`; `App.tsx` maps that to one of six fixed strings (e.g. `'Failed to update employee'`) passed to `showError`. No raw `Error`, stack trace, HTTP status, or response body ever reaches the UI on either path. |
| CSV injection | `neutralizeCsvCell` (in `utils/exportUtils.ts`) prefixes any cell whose *trimmed* value starts with `=`, `+`, `-`, or `@` with a leading `'` before it's joined into the CSV — including the leading-whitespace-then-formula trick (e.g. `"  =evil"`). Fields containing commas/quotes/newlines are additionally quoted and escaped. |
| Dependency audit | `npm audit` — **0 vulnerabilities**. Dependency list is minimal (see [§6](#6-dependencies)); no unused or leftover packages. |

## 5. How I'd profile this in production

Three complementary passes: a **React DevTools Profiler** flamegraph
recorded while typing in the search box and while scrolling the table —
`EmployeeRow` should be absent from the "why did this render" list except
for rows whose data actually changed, and the committed tree should show a
small, roughly constant number of table row nodes regardless of dataset
size; **Lighthouse / Core Web Vitals** (LCP and TBT in particular) on first
load, since the Modal/EmployeeForm/ConfirmDialog bundle is deferred out of
the critical path via code-splitting; and **p95 render time**, instrumenting
`EmployeeTable`'s render with `performance.mark`/`measure` around a
keystroke → re-render cycle and looking at the tail rather than the
average — debounce means most keystrokes don't trigger a filter pass at
all, but the ones that do (after the 300ms settle) are the ones that
matter for perceived responsiveness.

## 6. Dependencies

| Package | Why it's here |
|---|---|
| `react` / `react-dom` | The UI framework and its DOM renderer — required by the stack choice. |
| `@tanstack/react-table` | Headless, typed table/column-model library; drives `EmployeeTable`'s column definitions without bundling any UI or CSS to override. |
| `@tanstack/react-virtual` | Row virtualization — keeps the table's DOM node count constant regardless of dataset size, which the performance requirements depend on. |
| `typescript` *(dev)* | Static typing across the codebase, run in strict mode. |
| `vite` *(dev)* | Dev server (fast HMR, native ESM) and production bundler. |
| `@vitejs/plugin-react` *(dev)* | Enables React JSX transform + Fast Refresh in Vite. |
| `oxlint` *(dev)* | Fast Rust-based linter (`npm run lint`) — React hooks rules, etc. |
| `@types/node`, `@types/react`, `@types/react-dom` *(dev)* | TypeScript type definitions for Node.js (used by Vite's own config) and React/ReactDOM. |
| `vitest` *(dev)* | Test runner — shares Vite's config/transform pipeline, so no separate Babel/Jest config to keep in sync. |
| `jsdom` *(dev)* | Provides a browser-like DOM in Node for Vitest's `test.environment`, since components render real DOM nodes. |
| `@testing-library/react` *(dev)* | Renders components and queries them the way a user/assistive tech would (role, label, text) instead of implementation details. |
| `@testing-library/user-event` *(dev)* | Simulates real user interaction sequences (typing, selecting, clicking) more faithfully than firing raw DOM events. |
| `@testing-library/jest-dom` *(dev)* | DOM-specific matchers (`toBeInTheDocument`, etc.) for more readable assertions. |

No UI/CSS component library, no icon library, no state-management library,
and no CSV/date/form-validation library — those are all hand-rolled in
`src/utils`, `src/hooks`, and inline SVG, on the judgment that each was
small enough to own directly rather than take on a dependency for.

## Testing

```bash
npm run test
```

Runs the Vitest suite (jsdom environment) once and exits. The suite is
deliberately focused rather than exhaustive — high-value coverage for the
riskiest logic, not coverage for its own sake:

- `utils/exportUtils.test.ts` — `neutralizeCsvCell` against every risky
  leading character (`=`, `+`, `-`, `@`, including a leading-whitespace
  variant) and against normal cells.
- `utils/validation.test.ts` — `validateEmployee` against fully valid
  input, every field missing at once, and an invalid email format.
- `hooks/useDebouncedValue.test.ts` — the value only updates after the
  delay elapses (`vi.useFakeTimers()`), and a value change resets the
  timer rather than stacking.
- `hooks/usePagination.test.ts` — deleting the only item on the last page
  falls back to the previous (now-last) page instead of rendering blank.
- `hooks/useEmployees.test.ts` — `addEmployee`/`editEmployee`/`deleteEmployee`
  each call the corresponding API function and only touch local state on
  success (using the server-returned record, not a client-guessed one);
  each leaves state untouched and resolves `false` when the API call fails.
- `components/EmployeeForm.test.tsx` — submitting empty shows every inline
  validation error and does not call `onSubmit`; filling the form validly
  and submitting calls `onSubmit` once with the expected `EmployeeCreateInput`
  shape; passing an `employee` prop prefills every field (including
  splitting the stored full name back into first/last) and submits the
  edited values with a "Save Changes" button instead of "Add Employee".

## Tooling notes

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performance. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
