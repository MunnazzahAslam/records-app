# Employee Records

A React + TypeScript + Vite app for browsing, searching, filtering,
paginating, creating, deleting, and exporting employee records backed by a
real REST API (MockAPI.io).

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
fields fall back to safe defaults rather than throwing).

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
```

## 2. Architecture overview

### Folder structure

```
src/
├── components/   UI components: table/row, form, modal, confirm dialog,
│                 search/filter/pagination controls, loading/error/empty states
├── hooks/        Reusable stateful logic, kept out of components:
│                 useEmployees (fetch + CRUD-ish state), useDebouncedValue,
│                 usePagination
├── services/     employeeApi.ts — the only file that knows the MockAPI
│                 response shape; maps it into the app's Employee type so
│                 raw API shape never leaks into components
├── types/        Shared TypeScript types (Employee, EmployeeCreateInput, ...)
├── utils/        Pure functions: form validation/sanitization
│                 (validation.ts), CSV/JSON export + CSV-injection guard
│                 (exportUtils.ts)
└── App.tsx       Composes the hooks + components; owns UI state
                  (search input, selected departments, pagination, modal/
                  toast state) and derives filtered/paginated data with
                  useMemo — no business logic lives inside individual
                  components
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
  which owns `loading`/`error`/`data` and exposes `addEmployee`/
  `deleteEmployee`. There's only one consumer of this state (`App.tsx`), so
  there's nothing for a global store to coordinate.
- All UI state (search input, selected departments, current page, which
  modal is open, which employee is pending delete, the toast message) is
  local `useState` in `App.tsx`, since nothing outside that component tree
  ever needs to read or write it.
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
| `App.tsx` | `filteredEmployees` (`useMemo`, deps `[data, debouncedSearch, selectedDepartments]`) | Search/filter over the dataset only re-runs when the data or the debounced query/filter actually change — not on every keystroke before the debounce fires, and not on unrelated state changes (toast timer, pagination). |
| `App.tsx` | `departments` (`useMemo`, deps `[data]`) | The unique/sorted department list is rebuilt only when the underlying data changes, not on every render. |
| `App.tsx` | `pendingDeleteEmployee` (`useMemo`, deps `[data, pendingDeleteId]`) | Previously a plain `.find()` over `data` ran on *every* App render, including every keystroke in the search box. Memoized so it only recomputes when the data or the pending-delete id changes. |
| `App.tsx` | All event handlers passed to children (`handleEditEmployee`, `handleRequestDelete`, `handleCancelDelete`, `handleConfirmDelete`, `handleOpenAddModal`, `handleCloseAddModal`, `handleExportCsv`, `handleExportJson`, `handleCreateEmployee`) | Wrapped in `useCallback` with tight dependency arrays so they keep the same reference across unrelated App re-renders. This is what makes `React.memo` on `EmployeeRow` (below) actually skip re-renders instead of being cosmetic. |
| `hooks/usePagination.ts` | `pageItems` (`useMemo`), `goToPage`/`nextPage`/`prevPage` (`useCallback`) | The page slice isn't rebuilt unless the source array, page, or page size change; the page-change callbacks keep a stable identity for `Pagination`'s buttons. |
| `hooks/useEmployees.ts` | `addEmployee`/`deleteEmployee` (`useCallback`) | Stable identities passed down through `EmployeeTable` → `EmployeeRow`. |
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
| Input validation/sanitization | Add-Employee form fields go through `sanitizeEmployeeFormValues` (trims, strips `<`/`>`) and then `validateEmployee` (required fields, email regex) before the sanitized values ever reach `onSubmit`/state — see `utils/validation.ts`. The search box was deliberately left unsanitized: it only ever feeds a plain `.toLowerCase().includes()` substring match (never a `new RegExp(userInput)`, so no ReDoS/regex-injection surface) and is rendered back only as its own controlled `<input value>` — there's no injection-relevant sink for it to sanitize against. |
| Error messages | `useEmployees.ts`'s single `.catch()` discards the actual thrown error entirely (doesn't even bind it) and always sets one fixed, friendly string (`'Unable to load employee records.'`). `ErrorState` renders only that string as a plain text node. There is exactly one call site for `ErrorState` in the app, so there's no path for a raw `Error`, stack trace, HTTP status, or response body to reach the UI. |
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

No UI/CSS component library, no icon library, no state-management library,
and no CSV/date/form-validation library — those are all hand-rolled in
`src/utils`, `src/hooks`, and inline SVG, on the judgment that each was
small enough to own directly rather than take on a dependency for.

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
