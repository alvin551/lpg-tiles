# lpg-tiles

Rolling UK PMTiles basemap for the [LPG Finder](https://github.com/alvin551/lpg-finder-nuxt) app. The `tiles-latest` release asset is the live tile archive; the app reads it via `NUXT_PUBLIC_PMTILES_URL`.

## How it's built

`.github/workflows/refresh-tiles.yml` rebuilds the archive twice a year (1 Jan, 1 Jul) by running `pmtiles extract` against Protomaps' public daily planet build, bounded to the UK at `maxzoom=14`. Trigger an ad-hoc rebuild from the *Actions* tab → *Refresh UK tiles* → *Run workflow*.

## Stable URL

```
https://github.com/alvin551/lpg-tiles/releases/download/tiles-latest/uk.pmtiles
```

Refreshes replace the asset in place — URL never changes.
