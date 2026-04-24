# lpg-tiles

Rolling UK PMTiles basemap for the [LPG Finder](https://github.com/alvin551/lpg-finder-nuxt) app, plus a small CORS-proxy Worker so browser clients can actually read it.

## Layout

- `.github/workflows/refresh-tiles.yml` — twice-yearly rebuild (1 Jan, 1 Jul) of the UK extract from Protomaps' public planet build, uploaded to the `tiles-latest` rolling release.
- `worker/` — Cloudflare Worker that proxies the GitHub release asset with `Access-Control-Allow-Origin`. The app points its `NUXT_PUBLIC_PMTILES_URL` at this Worker, not at GitHub directly.

## Why the proxy

GitHub's release-asset URLs 302-redirect to `release-assets.githubusercontent.com`, which doesn't send CORS headers. Browser fetches fail. The Worker sits in front, re-issues the request server-side (no CORS applies), and adds the headers MapLibre needs. Cloudflare's edge cache also deduplicates repeat range requests.

## Deploying the Worker

One-time setup on your machine, from `worker/`:

```bash
pnpm install
pnpm dlx wrangler login   # browser OAuth; no card required for Workers free
pnpm run deploy
```

Wrangler prints a URL in the shape:
```
https://lpg-tiles-proxy.<your-subdomain>.workers.dev
```

That's what goes into the app's `NUXT_PUBLIC_PMTILES_URL`.

## Refreshing the tiles

Normally handled by `refresh-tiles.yml` on the cron schedule. For an ad-hoc refresh:

- *Actions* → *Refresh UK tiles* → *Run workflow*

The Worker doesn't need redeploying — it just re-proxies whatever `tiles-latest` currently points at.

## Stable URLs

| Consumer | URL |
|---|---|
| Raw GitHub asset (CORS-blocked in browsers) | `https://github.com/alvin551/lpg-tiles/releases/download/tiles-latest/uk.pmtiles` |
| Worker-proxied (use this from browser clients) | `https://lpg-tiles-proxy.<your-subdomain>.workers.dev` |
