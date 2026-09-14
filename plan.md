# Records / Employee Management App — Implementation Plan

Target: 100% — every base requirement solid, plus enough bonus (tests, perf notes, security hardening) to cover gaps.

## 1. Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Scaffold | Vite + React 18 + TypeScript (strict mode) | Required by spec |
| Data fetching | JSONPlaceholder `/users` (10 records) seeded, then **client-side inflate to 5,000+ synthetic rows** in a `mock/generateEmployees.ts` | Real API call satisfies Section 2; you need a large dataset to actually prove virtualization/perf work in Section 9 |
| Table + virtualization | `@tanstack/react-table` (headless, typed) + `@tanstack/react-virtual` | Both are well-maintained, small, composable — easy to justify at interview vs. a heavy grid lib (AG Grid = overkill, harder to justify "dependency hygiene") |
| Forms + validation | `react-hook-form` + `zod` (via `@hookform/resolvers`) | Uncontrolled-first = fewer re-renders (perf), schema validation = clean sanitize/validate story (security) |
| Styling | Tailwind CSS | Fast to make "clean, professional, responsive" without hand-rolling CSS; judged on implementation not library per spec |
| CSV export | Hand-rolled in `utils/exportUtils.ts` (no papaparse needed for this scale) — **must implement CSV-injection neutralization** | Small, auditable, no extra dependency risk |
| Testing (bonus) | Vitest + React Testing Library | Matches bonus criteria explicitly |
| State | Local component state + one custom hook (`useEmployees`) — **no Redux/Zustand** | Spec explicitly wants derived state, not extra global-state complexity; easier to defend "no unnecessary dependencies" |

## 2. File structure (matches spec's suggested layout)

```
records-app/
├── src/
│   ├── components/
│   │   ├── EmployeeTable.tsx       (virtualized, memoized rows)
│   │   ├── EmployeeRow.tsx         (React.memo'd, extracted from table)
│   │   ├── EmployeeForm.tsx        (react-hook-form + zod, in Modal)
│   │   ├── SearchBar.tsx           (debounced input, controlled)
│   │   ├── FilterPanel.tsx         (multi-select department)
│   │   ├── Pagination.tsx
│   │   ├── Modal.tsx               (generic, portal-based)
│   │   ├── ConfirmDialog.tsx       (delete confirmation)
│   │   ├── Loading.tsx
│   │   ├── ErrorState.tsx
│   │   └── EmptyState.tsx
│   ├── services/
│   │   └── employeeApi.ts          (typed fetch wrapper, no UI imports)
│   ├── hooks/
│   │   ├── useEmployees.ts         (fetch + CRUD + loading/error/empty states)
│   │   ├── useDebouncedValue.ts
│   │   └── usePagination.ts
│   ├── types/
│   │   └── employee.ts
│   ├── utils/
│   │   ├── exportUtils.ts          (CSV/JSON export + injection guard)
│   │   ├── sanitize.ts             (input sanitization helpers)
│   │   └── validation.ts           (zod schemas)
│   ├── mock/
│   │   └── generateEmployees.ts    (deterministic fake-data generator for scale testing)
│   ├── App.tsx                     (thin: composes hook + components, no business logic)
│   └── main.tsx
├── .env.example
├── vitest.config.ts
├── README.md
└── package.json
```

## 3. Build order (dependency-driven, not spec-order)

1. **Scaffold + types** — Vite TS template, `employee.ts` types, tsconfig strict.
2. **`employeeApi.ts` + `useEmployees`** — fetch from JSONPlaceholder, map to `Employee[]`, expose `{ data, loading, error, isEmpty, addEmployee, deleteEmployee }`. Seed with the mock generator so you have 5k rows to work against from day one.
3. **`EmployeeTable` (basic, unvirtualized) + `Loading`/`ErrorState`/`EmptyState`** — get all four data states rendering correctly first.
4. **`SearchBar` + `useDebouncedValue`** — debounce ~300ms, derive filtered list with `useMemo`.
5. **`FilterPanel`** (multi-select department) — combine with search via a single derived `useMemo` (search ∩ filter), not two separate state copies.
6. **`Pagination` + `usePagination`** — slice the derived, filtered array; verify "Showing X–Y of Z" updates correctly against filters.
7. **Virtualize `EmployeeTable`** with `react-virtual` — do this once table/search/filter/pagination all work, so you can visibly show before/after in your perf notes.
8. **`EmployeeForm` + `Modal`** — react-hook-form + zod schema (required fields, email format), add to state, close/reset on success.
9. **`ConfirmDialog` + delete flow** — explicitly test deleting the last item on the last page (must roll back a page, not show blank).
10. **Export (CSV/JSON)** — export the *currently filtered/paginated-visible* dataset per spec; implement and unit-test the CSV-injection guard.
11. **Memoization pass** — `React.memo` on `EmployeeRow`, `useCallback` for handlers passed down, confirm with React DevTools Profiler that filtering/paginating doesn't re-render the whole table.
12. **Code-splitting** — lazy-load `EmployeeForm`/`Modal` with `React.lazy` + `Suspense` (justifies Section 9's "lean critical path" point).
13. **Security pass** (see checklist below) — dedicated review pass, not incidental.
14. **Tests** — a handful of high-value RTL tests (see below), not exhaustive coverage.
15. **README** — install/run instructions, architecture notes, and a short "Performance & Security decisions" section (this doubles as your interview prep).

## 4. Section-by-section "don't lose points" checklist

**Architecture/Hooks (1, 12)**
- No logic in `App.tsx` beyond composing `useEmployees` + layout.
- Every component takes typed props, no `any`.

**API (2)**
- Loading/success/empty/error all visually distinct and tested.
- Errors show a user-friendly message, never the raw error object.

**Search/Filter (4)**
- Debounce via `useDebouncedValue`, not `setTimeout` scattered in the component.
- Filtered list = `useMemo(() => data.filter(...), [data, debouncedSearch, selectedDepts])`.

**Pagination (5)**
- Page resets to 1 when search/filter changes (common bug — call this out explicitly in code comments).

**Create (6)**
- zod schema: required fields + email regex; show inline field errors, not alerts.

**Delete (7)**
- After delete, if current page is now past the last page, clamp `currentPage`.

**Export (8 + 10)**
- CSV cells starting with `=`, `+`, `-`, `@` get a leading `'` (or wrapped) before joining — write this as a named, tested function (`neutralizeCsvCell`), don't inline it.

**Performance (9 — weighted)**
- Virtualization is non-negotiable — render row count visibly capped regardless of dataset size.
- `React.memo(EmployeeRow, customCompare?)`, stable `key={employee.id}`.
- No inline `() => ...` or `{...}` object literals passed into memoized children.
- Lazy-load the modal/form bundle.
- README section: how you'd profile (React DevTools Profiler flamegraph, Core Web Vitals via Lighthouse, p95 render time) and where you'd expect bottlenecks (table re-render on keystroke without debounce/memo).

**Security (10 — weighted)**
- Zero `dangerouslySetInnerHTML` anywhere; render all API/user text as text nodes.
- All form input passed through zod parse before it touches state.
- `.env.example` committed, real `.env` gitignored, no literal keys anywhere in source.
- If you add any mock auth/token, keep it in memory (React state/context), never `localStorage`/logs.
- CSV-injection guard as above.
- `npm audit` clean or documented; every dependency justified in README (this is also a bonus point).

**UI/UX (11)**
- Every async action (delete, submit) has a loading affordance; every destructive action has a confirm dialog.

## 5. Minimal high-value test suite (bonus)
- `neutralizeCsvCell` — formula-injection cases.
- `useDebouncedValue` — timer-based test.
- `EmployeeForm` — required-field and invalid-email validation errors render.
- `EmployeeTable` — deleting the last row on a page moves pagination back correctly.
- `useEmployees` — error state renders when fetch rejects (mock fetch failure).

## 6. Suggested Claude Code workflow
1. Bring this file into the repo root as `PLAN.md` (or `CLAUDE.md`) so Claude Code has the architecture and checklist as standing context.
2. Scaffold the Vite project and get steps 1–3 done and running before adding anything else — confirms the loop works end-to-end early.
3. Work in the build-order above, committing after each numbered step.
4. Before submitting, do one dedicated pass reading only Section 9 and Section 10 of the original brief against the code — those are explicitly the weighted ones and the easiest to under-deliver on by focusing on features first.