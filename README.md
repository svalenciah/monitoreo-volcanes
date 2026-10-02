# Geoportal de volcanes de lodo

Sitio estático para consultar ubicaciones, monitoreo InSAR y estaciones
sísmicas de volcanes de lodo en Antioquia. El portal usa Leaflet, GeoJSON,
GeoTIFF y Chart.js; no requiere un proceso de compilación para publicarse.

## Estructura

```text
.
├── index.html              # Página principal del geoportal
├── assets/logos/           # Identidad institucional
├── css/                    # Estilos
├── js/                     # Mapa, datos e interfaz
├── data/
│   ├── catalog.json        # Volcanes con observaciones InSAR
│   ├── volcanes.geojson    # Ubicación de todos los volcanes registrados
│   ├── municipios_antioquia.geojson
│   ├── estaciones_sismicas.geojson
│   ├── areas/ flujos/ metadata/ series/ estadisticas/
│   └── rasters/            # GeoTIFF publicados por fecha y volcán
├── scripts/                # Preparación y actualización de datos
└── tests/                  # Pruebas del procesamiento
```

Los datos de `data/` son parte del sitio publicado y deben subirse junto con
el código. El repositorio no incluye los HDF5 originales de MintPy ni las capas
fuente privadas/locales usadas para producirlos.

## Vista local

Desde la raíz del repositorio:

```bash
python -m http.server 8000
```

Abre <http://localhost:8000>. Se requiere un servidor local porque el navegador
bloquea la carga de GeoJSON y otros archivos cuando se abre `index.html`
directamente.

## Actualización de datos

Para incorporar puntos añadidos al KMZ, configura las rutas locales en
`scripts/volcanes_config.json` y ejecuta:

```bash
python scripts/sincronizar_puntos_kmz.py
```

Para generar productos InSAR y actualizar el catálogo, sigue
[scripts/README.md](scripts/README.md). La configuración local está excluida de
Git porque contiene rutas específicas del equipo. Usa
`scripts/volcanes_config.example.json` como plantilla y guarda tu configuración
local en `scripts/volcanes_config.json`.

Pruebas del procesamiento:

```bash
python -m unittest discover -s tests -v
```

Las pruebas requieren `geopandas`, `h5py`, `numpy`, `rasterio` y `shapely`.

## Publicación en GitHub Pages

El punto de entrada `index.html` está en la raíz. En GitHub, selecciona
**Settings → Pages → Deploy from a branch**, la rama `main` y la carpeta
`/(root)`. Luego sube el repositorio:

```bash
git add -A
git commit -m "Preparar geoportal para publicación"
git push origin main
```

Antes de subir, revisa `git status` y confirma que no aparezcan `.venv/`,
`.vscode/`, `scripts/volcanes_config.json` ni datos fuente privados. Los
GeoTIFF actuales son datos publicados del portal y se conservan en el
repositorio.
