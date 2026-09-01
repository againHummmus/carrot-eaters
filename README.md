# carrot-eaters-mcp

Трекер калорий: логирование через диалог с Клодом (MCP) + Next.js PWA для просмотра прогресса.
Монорепо (npm workspaces):

```
apps/mcp-server   — MCP-сервер (resource server), Node + @modelcontextprotocol/sdk
apps/web          — Next.js PWA: вход, онбординг, дашборд, история, consent-страница OAuth
packages/shared   — общие константы/типы (macroTargets 30/30/40, DAILY_NORMS, суточные диапазоны времени)
```

Авторизация целиком на стороне Supabase Auth (OAuth 2.1 Server, уже включён в проекте) — ни MCP-сервер,
ни клиент не хранят пароли/токены сами и не реализуют `/authorize`/`/token`. MCP-сервер — только resource
server: публикует Protected Resource Metadata (RFC 9728) и проверяет JWT по JWKS проекта.

## Локальный запуск

```
npm install
cp apps/mcp-server/.env.example apps/mcp-server/.env   # заполнить PUBLIC_SERVER_URL
cp apps/web/.env.example apps/web/.env.local
npm run dev:server   # apps/mcp-server, порт 8080
npm run dev:web      # apps/web, порт 3000
```

`PUBLIC_SERVER_URL` в проде — публичный домен MCP-сервера (Railway). Для локальной разработки можно
поставить любой https-плейсхолдер — на подключение к Supabase это не влияет, используется только для
собственных Protected Resource Metadata сервера.

## Деплой MCP-сервера — Railway

1. New Project → Deploy from repo, **Root Directory**: `/` (весь монорепозиторий).
2. Settings → Build → **Dockerfile Path**: `apps/mcp-server/Dockerfile` (build context остаётся корнем репо).
3. Variables: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_SERVER_URL` (= выданный Railway-домен,
   можно проставить после первого деплоя и передеплоить), `PORT=8080`.

## Деплой клиента — Vercel

1. New Project → **Root Directory**: `apps/web`. Vercel сам подхватит корень npm-воркспейса по лежащему
   выше `package-lock.json`.
2. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. После первого деплоя, в Supabase Dashboard → Authentication → URL Configuration: выставить **Site URL**
   на выданный домен Vercel. Authentication → OAuth Server → **Authorization Path** уже должен быть
   `/oauth/consent` (страница уже реализована в `apps/web/app/oauth/consent`).

## Про два аккаунта

Регистрация закрытая только по духу ТЗ — на уровне Supabase это обычный email/password sign up
(`/register` в клиенте). Если хочется технически запретить посторонним регистрироваться — выключить
"Allow new users to sign up" в Supabase Auth после того, как оба аккаунта созданы.

## Известный риск DCR

У некоторых MCP-клиентов протухший `client_id` от старой Dynamic Client Registration может залипнуть без
штатного пути восстановления. Если переподключение коннектора зависает — пересоздать OAuth-клиента вручную
через Supabase Dashboard → Authentication → OAuth Apps (или Admin API).

## Иконки PWA

`apps/web/public/icons/*.png` — временные плейсхолдеры (сплошной квадрат + круг), сгенерированные
программно, чтобы манифест и `apple-touch-icon` не были битыми. Стоит заменить на настоящую иконку перед
тем как показывать установку на телефон кому-то, кроме себя.
