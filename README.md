# Búsqueda de Clientes — DEMO

Versión **demo pública** de la herramienta de prospección comercial. Muestra 500 negocios **ficticios** distribuidos en Avellaneda, Lanús y Wilde sobre un mapa interactivo, y permite gestionarlos como pipeline (no contactado, contactado, interesado, cliente, descartado) con notas persistentes por prospecto.

> Esta es la versión **sin Google Cloud** — pensada para portfolio y demos. La versión de producción usa Google Places API para scraping real y está en un repo privado.

---

## Stack

- **Frontend only**: React 18 (desde CDN) + Babel standalone.
- **Mapa**: [Leaflet](https://leafletjs.com/) + OpenStreetMap (gratis, sin API key).
- **Datos**: `data.json` precargado con 500 prospectos ficticios generados con Python.
- **Persistencia**: `localStorage` (cada visitante ve sus propios cambios).
- **Hosting**: cualquier static host (GitHub Pages, Netlify, Vercel). Sin backend.

---

## Features

- Mapa interactivo con 500 pins coloreados por estado.
- Panel lateral con filtros (zona, rubro, estado, búsqueda por texto).
- Tabla sincronizada con mapa: click en un item pan+zoom al pin.
- Panel de detalle con teléfono clickeable, link a Google Maps, selector de estado y notas.
- Estadísticas en vivo (% contactados, % clientes, breakdown por estado).
- Botón "Reiniciar demo" para limpiar el estado guardado.
- **100% estático** — se puede abrir con doble click sobre `index.html` o servirlo desde cualquier CDN.

---

## Correr localmente

Como es todo estático, necesitás solo un servidor HTTP simple (fetch de `data.json` requiere `http://`, no `file://`):

```bash
# Con Python 3
python -m http.server 8000

# Con Node
npx serve .
```

Abrir http://localhost:8000.

---

## Regenerar los datos ficticios

```bash
python generate_data.py
```

Genera un nuevo `data.json` con 500 prospectos. La seed está fijada en `42` así que siempre produce los mismos datos (cambiala si querés variar).

---

## Diferencias con la versión de producción

| | Demo (este repo) | Producción (privado) |
|---|---|---|
| Datos | 500 negocios ficticios | Scrape real con Google Places API |
| Mapa | OpenStreetMap (gratis) | Google Maps (mejor calidad visual) |
| Backend | Ninguno (100% estático) | FastAPI + SQLite en Railway |
| Auth | Ninguna (es una demo pública) | HTTP Basic |
| Persistencia | localStorage del browser | SQLite con volumen persistente |
| Costo mensual | $0 | ~$10 one-time (scrape) + $0 hosting |

---

## Licencia

MIT.
