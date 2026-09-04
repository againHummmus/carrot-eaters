# carrot-eaters-mcp

Calorie tracker: log your food by talking to Claude (MCP), review your progress in a Next.js PWA.
Monorepo (npm workspaces):

```
apps/mcp-server   — MCP server (resource server), Node + @modelcontextprotocol/sdk
apps/web          — Next.js PWA: sign-in, onboarding, dashboard, history, OAuth consent page
packages/shared   — shared constants and types (macroTargets 30/30/40, DAILY_NORMS, day-range helpers)
```

Authentication lives entirely in Supabase Auth (its OAuth 2.1 Server, already enabled on the project) —
neither the MCP server nor the client stores passwords or tokens, and neither implements `/authorize` or
`/token`. The MCP server is only a resource server: it publishes Protected Resource Metadata (RFC 9728)
and verifies JWTs against the project's JWKS.

## Languages

The web app ships in Russian and English via [next-intl](https://next-intl.dev). There is no `[locale]`
segment in the URLs: the language comes from a `locale` cookie, falling back to the browser's
`Accept-Language` and then to Russian. `apps/web/i18n/request.ts` resolves it, `messages/{ru,en}.json`
hold the catalogues, and the switcher sits in the header menu, in settings, and on the sign-in pages.

`npm run check:messages -w apps/web` (also part of the web build) verifies that the catalogues carry the
same keys and the same ICU arguments — TypeScript only checks keys against `ru.json`, the source of truth.

Two things stay in the user's own language regardless of the interface: **data** (meal titles, ingredient
names and units such as `г`/`шт`, written by the user or by Claude and stored verbatim), and Claude's own
replies. The MCP server itself speaks English — see below.

## Recipes

Claude saves recipes to the user's personal recipe book with `save_recipe`; the web app lists them at
`/recipes`.

The key convention: **both ingredients and nutrients are stored PER SINGLE SERVING** (`recipes` +
`recipe_ingredients`, both under RLS by the owner's `user_id`). The number of servings is interface state,
not a database column: the serving stepper on the recipe page scales amounts and nutrients through
`scaleAmount`/`scaleNutrients` from `packages/shared`. An ingredient with `amount = null` means "to taste"
and is never scaled.

The recipe page also renders the ingredients as a checklist. Ticked items are a cooking aid, not recipe
data, so they live in the viewer's `localStorage` under `recipe-checklist:<id>` and never reach the
database. The recipe list has a search box that matches on title, description and ingredient names.

MCP tools: `save_recipe` (overwrites a recipe with the same title), `list_recipes`, `get_recipe` (with a
`servings` parameter), `delete_recipe`, and `log_recipe_portion` — the last one takes the per-serving
nutrients straight from the recipe, multiplies them by `servings`, and writes an ordinary meal into
`meals`.

## MCP server language

Tool descriptions, argument descriptions and tool output are all in English. Nothing there is shown to the
user directly: Claude reads it and answers in whatever language the conversation is in. Keeping the server
in one language avoids a second translation layer with no source of locale — the MCP server never sees the
web app's cookie, and `profiles` has no language column.

Where a string does end up stored and rendered verbatim in the web app, it stays neutral or follows the
user: `log_recipe_portion` marks multiple servings as `×2` rather than a word, and the tool descriptions
explicitly tell the model to write meal titles, recipe text and units in the user's own language.

## Running locally

```
npm install
cp apps/mcp-server/.env.example apps/mcp-server/.env   # fill in PUBLIC_SERVER_URL
cp apps/web/.env.example apps/web/.env.local
npm run dev:server   # apps/mcp-server, port 8080
npm run dev:web      # apps/web, port 3000
```

In production `PUBLIC_SERVER_URL` is the MCP server's public domain (Railway). For local development any
https placeholder will do — it does not affect the Supabase connection and is only used for the server's
own Protected Resource Metadata.

## Deploying the MCP server — Railway

1. New Project → Deploy from repo, **Root Directory**: `/` (the whole monorepo).
2. Settings → Build → **Dockerfile Path**: `apps/mcp-server/Dockerfile` (the build context stays the repo root).
3. Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_SERVER_URL` (the domain Railway hands out —
   you can fill it in after the first deploy and redeploy), `PORT=8080`.

## Deploying the client — Vercel

1. New Project → **Root Directory**: `apps/web`. Vercel picks up the npm workspace root on its own from the
   `package-lock.json` above it.
2. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. After the first deploy, in Supabase Dashboard → Authentication → URL Configuration: set **Site URL** to
   the domain Vercel handed out. Authentication → OAuth Server → **Authorization Path** should already be
   `/oauth/consent` (the page is implemented in `apps/web/app/oauth/consent`).

## About the two accounts

Registration is closed only in spirit — at the Supabase level it is ordinary email/password sign-up
(`/register` in the client). To actually keep strangers out, turn off "Allow new users to sign up" in
Supabase Auth once both accounts exist.

## Known DCR risk

On some MCP clients a stale `client_id` from an earlier Dynamic Client Registration can get stuck with no
supported way to recover. If reconnecting the connector hangs, recreate the OAuth client by hand via
Supabase Dashboard → Authentication → OAuth Apps (or the Admin API).

## PWA icons

`apps/web/public/icons/*.png` are temporary placeholders (a solid square plus a circle), generated
programmatically so that the manifest and `apple-touch-icon` are not broken. Replace them with a real icon
before showing the install flow to anyone but yourself.
