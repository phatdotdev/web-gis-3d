# Frontend GIS Engine

Frontend-only React app for managing Layer and independent Spatial Entity data on ArcGIS SceneView.

## Run

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Add a layer

Edit `public/data/layers/layers.json` or use the localStorage-backed repository from UI. A layer can use:

- `local-geojson` with `geojsonFile`
- `remote-geojson` with `geojsonUrl`
- `arcgis-query-url` with an ArcGIS Server `/query` endpoint

For ArcGIS query endpoints, the app builds a GeoJSON URL with `where=1=1`, `outFields=*`, `f=geojson` and `returnGeometry=true`.

## Add an entity

Use the Spatial Entity panel. Coordinates must be JSON matching Point, LineString or Polygon GeoJSON coordinate shape. Changes are saved in localStorage and can be exported as JSON.

## Current limits

This app does not include backend auth, database writes, advanced geometry editing or production deploy settings. Browser uploads use object URLs/localStorage metadata until a backend upload API exists.
