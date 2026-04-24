# lpg-tiles

Scheduled rebuild + upload of the UK PMTiles basemap for the [LPG Finder](https://github.com/alvin551/lpg-finder-nuxt) app. The archive lives on Cloudflare R2 (public bucket, unlimited free egress). This repo is only the automation — the tile file itself doesn't live here.

## What runs

`.github/workflows/refresh-tiles.yml` fires twice a year (1 Jan, 1 Jul at 03:00 UTC) and can be triggered on demand from the Actions tab. Each run:

1. Installs the latest `pmtiles` CLI.
2. Clips a UK + Ireland bbox from Protomaps' public daily planet build at maxzoom 14 (~1.5 GB output).
3. Uploads it to R2 via the AWS CLI (S3-compatible API, handles multipart).

R2's object URL is stable (`https://pub-<hash>.r2.dev/uk.pmtiles`), so the app never needs a redeploy when tiles refresh — cached viewers pick up new data on their next cache miss.

## One-time setup

### 1. Create an R2 API token

Cloudflare dashboard → *R2* → *Manage R2 API Tokens* → *Create API Token* → *Object Read & Write*, scoped to the `lpg-tiles` bucket. Copy the **Access Key ID**, **Secret Access Key**, and your **account ID**.

### 2. Add three secrets and one variable to this repo

*Settings* → *Secrets and variables* → *Actions*.

Secrets (encrypted):
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Variable (plain):
- `R2_BUCKET` — e.g. `lpg-tiles`

### 3. Trigger the first run

*Actions* → *Refresh UK tiles* → *Run workflow*. Takes ~5 min (extract) + ~1–3 min (upload) from a runner. Verify with:

```bash
curl -I https://pub-<your-r2-hash>.r2.dev/uk.pmtiles
```

After that, the app's `NUXT_PUBLIC_PMTILES_URL` points at the R2 URL and everything's automatic.
