# Kairos · Users — INTERNAL / LOCAL tool

> ⚠️ **LOCAL USE ONLY. DO NOT DEPLOY.**
> Shows, with no login, **all users** and their applications/documents (real
> personal and financial data). It should only run on the authorized operator's
> machine (`localhost`).

## Why it is local and not deployed

Reading data protected by RLS requires the **service key** (admin). That key lives
**only in the Vite server** (`vite.config.js`, Node side) and is read from
`.env.local` using variables **without** the `VITE_` prefix, so it **never** enters
the browser bundle. The `/api/*` endpoint **only exists during `npm run dev`**: if
you ran `build`/deploy, there would be no API and the key would not leak — but it
also would not show any data. By design, it is a local tool.

If remote team access is ever needed, it must NOT be exposed like this: it would
need authentication (e.g. a director login) or an access gate (deployment
password), never left public with the service key.

## Usage

```bash
npm install
cp .env.example .env.local     # then fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
npm run dev                    # open http://localhost:5176
```

`.env.local` is in `.gitignore` (as is any `.env*`): the service key **is not
committed**.

## What it shows

- **List of all users** (from Supabase Auth) on the home page.
- Per user: email, name, **role** (client/analyst/director), signup date, last
  login, and whether the email is confirmed.
- Clicking a user opens their **detail page** (`#u/<id>`, with a "Back" button,
  reloadable and deep-linkable): account data + all their **applications** (folio,
  status, data, amount, address, etc.) and their **documents**, with a button to
  open them via a temporary signed URL from the private bucket.
- Search by email, name, role or folio; and a summary (totals).
- **User-type filter** (chips: All / Client / Analyst / Director / No profile,
  with counts).
- **Pagination** (configurable page size: 10/25/50/100).
- **Row selection (checkbox)** + "Select all" (over the filtered set) and
  **Export CSV** of the selected users.

## Security

- The service key is secret: if it was shared, **rotate it** in Supabase.
- This tool concentrates real PII (CURP, RFC, address, income, documents). Treat
  it as confidential; do not leave it open on shared machines and do not deploy it.

## Environment variables

| Variable               | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `SUPABASE_URL`         | Supabase project URL                                   |
| `SUPABASE_SERVICE_KEY` | **service/secret key** (admin) — server side only      |
