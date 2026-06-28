# Constructora — Gestión de Obra

App web responsiva (optimizada para iPad/iPhone, instalable como PWA) para administrar una constructora: **dashboard**, **cotizador**, **seguimiento de proyectos** y **catálogo de precios de materiales** con actualización desde internet y captura manual.

Construida con **Node.js + Express** (backend, almacenamiento en archivo JSON) y un frontend **vanilla JS** sin dependencias de build.

---

## Funcionalidades

- **Dashboard**: KPIs de proyectos activos, avance promedio, monto cotizado aprobado y estado del catálogo, con gráficas de avance por proyecto, materiales por categoría y cambios de precio recientes.
- **Proyectos**: alta/edición, estados (planeación, en progreso, pausado, terminado), barra de avance, hitos, presupuesto y vínculo con cotizaciones.
- **Cotizador**: partidas con materiales del catálogo, mano de obra / indirectos / utilidad por porcentaje, descuento, IVA, folio automático (`COT-AÑO-NNN`) e impresión lista para PDF.
- **Materiales**: catálogo precargado con ~60 insumos del mercado mexicano en 11 categorías, búsqueda y filtros, historial de precios, **alta manual**, importación masiva y **actualización de precios desde fuentes públicas en línea**.
- **Ajustes**: datos de la empresa, valores por defecto del cotizador, fuentes de precios e instrucciones de instalación en iPad.
- **PWA**: instalable en la pantalla de inicio, funciona a pantalla completa y con caché offline del shell.

---

## Ejecutar en local

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abre `http://localhost:3000`.

Para reinicializar el catálogo y los datos de ejemplo:

```bash
npm run seed
```

> Por defecto los datos se guardan en `./data/db.json`. En producción define `DATA_DIR` (ver abajo) para que persistan.

---

## Variables de entorno

Copia `.env.example` a `.env`. Todas son opcionales:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (Railway lo asigna automáticamente). |
| `DATA_DIR` | Carpeta donde se guarda `db.json`. En Railway apúntala a un Volume (`/data`) para no perder datos entre despliegues. |
| `PRICE_REFRESH_HOURS` | Si se define, refresca precios automáticamente cada N horas. |
| `SEARCH_API_KEY` / `SEARCH_ENGINE_ID` | Opcionales: habilitan búsqueda de precios vía Google Custom Search. Sin ellas se usa el catálogo público integrado. |

---

## Paso 1 — Subir a GitHub

> Necesitas hacerlo tú desde tu cuenta (yo no puedo crear el repositorio por ti). El proyecto ya viene con un commit inicial.

1. Crea un **repositorio vacío** en GitHub (sin README, sin .gitignore), por ejemplo `constructora-app`.
2. En la carpeta del proyecto, conecta y sube:

```bash
git remote add origin https://github.com/TU_USUARIO/constructora-app.git
git branch -M main
git push -u origin main
```

(Si descomprimiste el ZIP que te entregué, primero corre `git init && git add -A && git commit -m "Versión inicial"`.)

---

## Paso 2 — Desplegar en Railway

1. Entra a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → elige `constructora-app`.
2. Railway detecta Node automáticamente (Nixpacks) y arranca con `npm start`. No hay que configurar build.
3. **Persistencia de datos** (importante):
   - En el servicio, ve a **Variables** y agrega `DATA_DIR` = `/data`.
   - Ve a **Volumes** → **New Volume** y móntalo en `/data`.
   - Esto evita que se borren proyectos, cotizaciones y precios en cada despliegue.
4. (Opcional) Agrega `PRICE_REFRESH_HOURS`, `SEARCH_API_KEY` y `SEARCH_ENGINE_ID` si quieres actualización automática y búsqueda ampliada de precios.
5. **Settings → Networking → Generate Domain** para obtener la URL pública.

---

## Paso 3 — Instalar en el iPad

1. Abre la URL pública en **Safari**.
2. Toca **Compartir** (cuadro con flecha hacia arriba).
3. Elige **“Agregar a inicio”** y confirma.

Se abrirá a pantalla completa, como una app nativa.

---

## Sobre los precios de materiales

México no cuenta con una API pública y gratuita de precios de construcción en tiempo real. Por eso la app combina tres mecanismos:

1. **Catálogo curado** con precios de referencia recientes del mercado mexicano (incluidos en `server/data/seed-materials.json`).
2. **Edición manual** de cualquier precio desde la pestaña Materiales (queda registrado en el historial).
3. **Actualización desde internet** (best-effort): lee precios desde un catálogo público de materiales y, si configuras Google Custom Search, amplía la búsqueda.

Los precios obtenidos en línea son **referenciales**; conviene confirmarlos con tu proveedor antes de cerrar una cotización.

---

## Estructura

```
server/            Backend Express
  index.js         App y montaje de rutas (/api/*)
  db.js            Almacenamiento JSON con escritura atómica
  seed.js          Datos iniciales (config + materiales + proyecto ejemplo)
  routes/          materiales, precios, proyectos, cotizaciones, configuración, dashboard
  priceUpdater/    Lectura de precios desde fuentes públicas
  data/            seed-materials.json (catálogo base)
public/            Frontend (PWA)
  index.html       Shell de la app
  css/styles.css   Sistema de diseño
  js/              api.js, ui.js, main.js (router) y views/
  icons/           Iconos PWA
  manifest.webmanifest, service-worker.js
```
