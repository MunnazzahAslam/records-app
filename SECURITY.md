# Security hardening notes

This is a client-only Vite/React SPA — there's no server in this repo to
send HTTP response headers from, so the CSP below is a **recommendation**
for whatever serves the built app (a static host, reverse proxy, or CDN
config), not something enforced by this codebase today. The other three
notes describe mitigations that *are* implemented in `src/`.

## 1. Recommended Content-Security-Policy

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://<your-mockapi-project-id>.mockapi.io;
  script-src 'self';
  style-src 'self';
  img-src 'self';
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

| Directive | Why it matters here |
|---|---|
| `default-src 'self'` | Safe fallback for every resource type not otherwise listed — nothing loads cross-origin by accident. |
| `connect-src 'self' https://<project-id>.mockapi.io` | The app makes exactly one kind of network call: `fetch(import.meta.env.VITE_API_BASE_URL)` in `services/employeeApi.ts`. Scoping `connect-src` to that one MockAPI origin means that even if a dependency (or a future bug) tried to exfiltrate data or call an unexpected endpoint, the browser would block it outright. |
| `script-src 'self'` (no `unsafe-inline`/`unsafe-eval`) | The production build (`vite build`) emits only external, same-origin `<script type="module">` files — no inline `<script>` tags, no `eval`/`new Function` anywhere in `src/` (verified in the earlier security audit). Nothing in this app needs either unsafe keyword, so there's no reason to weaken the policy for it. |
| `style-src 'self'` (no `unsafe-inline`) | All styling is plain `.css` files imported per component; Vite extracts these to external stylesheets in the production build rather than injecting `<style>` tags at runtime, so `unsafe-inline` isn't needed in production. (Vite's *dev server* does inject styles via JS for HMR — this policy is meant for the deployed build, not `vite dev`.) |
| `img-src 'self'` | The app renders no `<img>` tags and no data-URI images — the "avatar" in the employee table is a CSS-styled circle with an initial, not an image. Kept `'self'`-only rather than opened up for something unused. |
| `font-src 'self'` | Typography uses system fonts only (`system-ui`, `Segoe UI`, `Roboto` — see `index.css`); no Google Fonts or other remote font loading to allow for. |
| `object-src 'none'` | No `<object>`/`<embed>`/plugins anywhere in the app; closing this off removes a legacy vector entirely. |
| `base-uri 'self'` | Prevents an injected `<base>` tag from silently rewriting where the app's relative URLs resolve to. |
| `form-action 'self'` | The one real form (`EmployeeForm`) is handled entirely in JS (`onSubmit` + `preventDefault()`); it never actually posts to a URL, so restricting where a form *could* submit to costs nothing and blocks a class of injected-form phishing. |
| `frame-ancestors 'none'` | This app isn't designed to be embedded in an iframe on another site; blocking that closes off clickjacking. |

If `VITE_API_BASE_URL` changes per environment (it does — see `.env` /
`.env.example`), the `connect-src` origin in the deployed CSP needs to be
generated or updated alongside it rather than hardcoded once.

## 2. Why API `status`/`department` values are normalized, not trusted as-is

`services/employeeApi.ts`'s `mapToEmployee` is the single boundary between
"whatever MockAPI actually returns" and the `Employee` shape the rest of
the app assumes. Two concrete reasons this boundary does real work rather
than passing fields straight through:

- **`status` is coerced to a strict union.** The MockAPI schema field is a
  free-text `String` type, not a real enum — in practice it's been observed
  to return placeholder values like `"status 1"`/`"status 2"` rather than
  `"active"`/`"inactive"`. `normalizeStatus()` maps *any* input to exactly
  `'active' | 'inactive'` (case-insensitive match on `'inactive'`, default
  `'active'` otherwise). Downstream code (the status dot/label in
  `EmployeeRow`, CSS class names built from the status) assumes exactly
  two known values; without this normalization, an unexpected upstream
  string would flow into a CSS class name (`employee-status-${status}`)
  and silently render as neither state instead of failing predictably.
- **`department` gets a fallback (`'Unassigned'`) rather than being left
  `undefined`/empty.** Department is intentionally *not* constrained to a
  fixed set — it's real, open-ended data — but several consumers
  (`FilterPanel`'s derived unique-department list, the table cell, CSV/JSON
  export) assume every employee has a non-empty department string. A
  missing or `null` field from the API would otherwise produce a blank
  filter chip or an empty table cell with no indication anything is wrong.

More generally: nothing from `fetch()` is assumed to match its TypeScript
type just because it's cast that way. `mapToEmployee` is the one place
that's allowed to be defensive/verbose about the raw shape, so every other
component can trust `Employee` completely.

## 3. CSV-injection mitigation already in place

`utils/exportUtils.ts`'s `neutralizeCsvCell` runs on every cell before it's
joined into an exported CSV file. If a cell's *trimmed* value starts with
`=`, `+`, `-`, or `@`, it gets a leading `'` prepended (this also catches
the "leading whitespace before the formula character" trick). Without this,
an employee record whose name/role/department happened to start with `=`
(e.g. `=cmd|' /C calc'!A1`) could be interpreted as a live formula by
Excel/Google Sheets/LibreOffice the moment someone opens the exported file
— a classic CSV/formula-injection attack surface for any app that lets
user- or API-sourced data flow into a spreadsheet export. Fields containing
commas, quotes, or newlines are additionally quoted and have embedded
quotes escaped (`"` → `""`), which is a correctness fix for valid CSV
rather than a security one, but lives in the same function.

## 4. Server-side re-validation (defense in depth)

The Add-Employee form's validation (`utils/validation.ts`) runs entirely in
the browser — in a real deployment with a backend that actually persists
creates, that backend **must** re-run the same required-field/email-format
checks (and any authorization checks) on the request server-side, since
client-side validation is trivially bypassed by anyone calling the API
directly and should be treated as a UX convenience, never a security
control.
