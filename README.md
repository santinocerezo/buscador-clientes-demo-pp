# Búsqueda de Clientes — Demo Pública

Herramienta de prospección comercial pensada para identificar **negocios locales sin sitio web pero con teléfono** (un perfil clásico de cliente potencial para servicios digitales: páginas web, marketing, automatizaciones). Esta es la **versión demo pública**: corre 100% en el navegador, con 500 negocios ficticios y persistencia en `localStorage`.

> **Demo en vivo:** https://buscador-clientes-demo-pp-production.up.railway.app
> **Repositorio:** https://github.com/santinocerezo/buscador-clientes-demo-pp

---

## Tabla de contenidos

- [Qué hace](#qué-hace)
- [Demo vs producción](#demo-vs-producción)
- [Stack](#stack)
- [Estructura del repo](#estructura-del-repo)
- [Cómo correrlo localmente](#cómo-correrlo-localmente)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Roadmap](#roadmap)

---

## Qué hace

1. Carga 500 negocios ficticios distribuidos en zonas reales del sur del Gran Buenos Aires (Avellaneda, Lanús, Wilde, Sarandí).
2. Los muestra simultáneamente en un **mapa interactivo** (Leaflet + OpenStreetMap) y en un **panel lateral** filtrable.
3. Permite filtrar por **zona**, **rubro**, **estado del prospecto** y **texto libre** (nombre / dirección / teléfono).
4. Cada negocio tiene un mini-CRM por prospecto: **estado del contacto + notas**.
   - Estados: *No contactado* → *Contactado* → *Interesado* → *Cliente* / *Descartado*.
5. Todo el estado del usuario (estados + notas) se persiste en `localStorage` — sobrevive recargas y cierres del browser sin necesidad de cuenta ni backend.
6. Muestra **estadísticas en vivo**: total, % contactados, % clientes, breakdown por estado.
7. Cada ficha incluye teléfono clickeable y link directo a Google Maps con las coordenadas.
8. Click en un item del listado → el mapa hace pan + zoom al pin correspondiente (mapa y lista están sincronizados).

---

## Demo vs producción

Este repo contiene únicamente la **demo pública**. Hay una versión de producción en repo privado con datos reales:

| | **Demo (este repo)** | **Producción (privado)** |
|---|---|---|
| Datos | 500 negocios ficticios generados con seed determinística | Datos reales scrapeados con **Google Places API** |
| Mapas | OpenStreetMap (sin API key) | Google Maps |
| Backend | Ninguno (todo estático) | **FastAPI + SQLite** |
| Persistencia | `localStorage` (por browser) | DB SQLite con volumen persistente |
| Auth | Ninguna | HTTP Basic |
| Costo | $0 | ~$10 one-time del scrape + hosting gratuito |

El propósito de esta demo es mostrar **el flujo de trabajo y la UX del producto** sin exponer claves de API ni datos reales.

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 (UMD desde CDN, sin bundler) |
| Transpilación en cliente | Babel Standalone (lee `app.jsx` y lo compila en el browser) |
| Mapa | Leaflet 1.9 + tiles de OpenStreetMap |
| Estilos | CSS plano (`styles.css`) |
| Datos | JSON estático (`data.json`, 500 entries) |
| Generador de datos | Python 3 (`generate_data.py`, sin dependencias externas) |
| Persistencia local | `localStorage` (clave `demo_prospect_state_v1`) |
| Servidor en producción | Nginx alpine sirviendo archivos estáticos |
| Deploy | Docker + Railway |

> **Nota:** este proyecto **no usa bundler** (ni Vite ni Webpack). React, ReactDOM, Leaflet y Babel se cargan por CDN con `integrity` (Subresource Integrity) y `crossorigin="anonymous"` para que el browser verifique los assets. Es una decisión deliberada: para una demo de un solo archivo JSX, agregar un build pipeline sería overkill.

---

## Estructura del repo

```
busqueda-clientes-demo/
├── index.html          # Entry: levanta React + Leaflet + Babel, monta <App/>
├── app.jsx             # Toda la app React en un archivo (compilada en el browser)
├── styles.css          # Estilos
├── data.json           # 500 negocios ficticios — generado por el script Python
├── generate_data.py    # Script para regenerar data.json (seed=42, determinístico)
├── nginx.conf          # Config de Nginx con CSP estricta, gzip y cache de data.json
├── Dockerfile          # FROM nginx:alpine — copia archivos y expone :8080
└── railway.toml        # Deploy en Railway
```

---

## Cómo correrlo localmente

Como es todo estático, necesitás únicamente un servidor HTTP simple (el `fetch` de `data.json` requiere `http://`, no `file://`).

**Opción 1 — servidor estático cualquiera:**

```bash
git clone https://github.com/santinocerezo/buscador-clientes-demo-pp.git
cd buscador-clientes-demo-pp

# Con Python 3
python -m http.server 8080

# o con Node
npx serve .
```

Abrir http://localhost:8080.

**Opción 2 — con Docker (igual a producción):**

```bash
docker build -t buscador-demo .
docker run -p 8080:8080 buscador-demo
```

**Regenerar los datos ficticios:**

```bash
python generate_data.py
# sobrescribe data.json — corriéndolo dos veces produce el mismo output (seed=42)
```

---

## Decisiones de diseño

- **Sin build, sin bundler.** La app cabe en `index.html + app.jsx + styles.css`. Agregar Vite/Webpack solo sumaría complejidad para alguien que quiera leer el proyecto.
- **Datos ficticios determinísticos.** El generador Python usa `random.seed(42)`, así el `data.json` es reproducible y el repo no depende de un proceso externo para regenerarse.
- **CSP estricta en `index.html`.** `default-src 'self'` con allowlist explícita para los CDNs (`unpkg.com`, tiles de OSM). Bloquea cualquier inyección de script de terceros.
- **Subresource Integrity (SRI)** en cada `<script>` y `<link>` de CDN. Si unpkg cambia el contenido del archivo, el browser se niega a cargarlo.
- **Persistencia con `localStorage` + merge no destructivo.** El `data.json` es read-only; el estado del usuario vive aparte y se mergea en runtime con `mergeWithState()`. Esto permite regenerar `data.json` sin romper el estado guardado por el usuario (mientras los `place_id` se mantengan).
- **Headers de seguridad y cache separados en Nginx.** `data.json` se sirve con `Cache-Control: public, max-age=3600` (es estático y pesado); el resto va con `no-cache`. Headers de seguridad estándar (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` deshabilitando geolocalización/cámara/micrófono).
- **Mismo `Dockerfile` para dev y prod.** Cero diferencia entre lo que se prueba localmente y lo que corre en Railway.

---

## Roadmap

- Export a CSV de prospectos contactados / clientes.
- Modo offline real (Service Worker + cache de tiles).
- Vista tipo Kanban además de mapa + lista.

---

## Autor

**Santino Cerezo** — [GitHub](https://github.com/santinocerezo) · santinocerezo11@gmail.com
