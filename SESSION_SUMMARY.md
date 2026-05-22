# Weather App — Full Session Summary

## Project Overview

**Stack:** Angular 21 (frontend) + Flask/Python (backend)  
**Location:** `~/Music/weather-app/`  
**Constraint:** No git — all changes are local only.

---

## 1. Initial Fixes — Dev Environment

### Problem
`ng serve` failed due to missing node packages and a TypeScript version mismatch (installed: 5.5.4, required: ≥5.8.0).

### Fix
```bash
npm install
npm install typescript@5.8.3 --save-dev
```

---

## 2. Backend — Replaced Mock Data with Real APIs

### Problem
The backend was returning hardcoded mock weather data. The original implementation used OWM One Call 3.0, which requires a paid plan.

### Solution
Rewrote `backend/services/weather_service.py` to use only **free-tier endpoints**:

| Data | Source | Endpoint |
|---|---|---|
| Geocoding | OpenWeatherMap | `/geo/1.0/direct` |
| Current weather | OpenWeatherMap | `/data/2.5/weather` |
| Air quality (AQI) | OpenWeatherMap | `/data/2.5/air_pollution` |
| UV index | OpenWeatherMap | `/data/2.5/uvi` |
| 7-day forecast + 48h hourly | **Open-Meteo** (free, no key) | `/v1/forecast` |

### Key backend changes (`backend/services/weather_service.py`)
- All 4 post-geocode calls parallelised via `ThreadPoolExecutor(max_workers=4)` — total latency ≈ slowest single call (~1s cold, ~47ms warm)
- Separate geo-coordinate cache with **7-day TTL** (coordinates are stable)
- Weather data cache with **10-minute TTL**
- AQI capped at a **3-second timeout** (optional data — won't block the page)
- Retry with exponential backoff (3 attempts, 0.5s × 2^n)

### Key backend changes (`backend/models/weather_transformer.py`)
- Full rewrite to handle Open-Meteo daily + hourly data structures
- WMO weather code → condition/icon/description mapping tables (`_WMO`, `_WMO_DESC`)
- `transform_current()` — handles OWM `/data/2.5/weather`
- `transform_forecast()` — handles Open-Meteo daily block, returns 7 cards
- `transform_hourly()` — handles Open-Meteo hourly block, returns next 24 slots
- `assemble()` signature: `(location, coords, current_raw, om_forecast, air_quality, uv)`

### Environment
- `backend/.env` — `OPENWEATHER_API_KEY`, `PORT=5001`, `CORS_ORIGINS=http://localhost:4200`

---

## 3. UI/UX Improvements

### Popular Cities Strip
Added 10 quick-select city buttons below the header title so users don't need to type:

```typescript
protected readonly popularCities = [
  { name: 'New York',    emoji: '🗽' },
  { name: 'London',      emoji: '🎡' },
  { name: 'Tokyo',       emoji: '⛩️' },
  { name: 'Paris',       emoji: '🗼' },
  { name: 'Dubai',       emoji: '🏙️' },
  { name: 'Sydney',      emoji: '🦘' },
  { name: 'Mumbai',      emoji: '🌊' },
  { name: 'Singapore',   emoji: '🦁' },
  { name: 'Toronto',     emoji: '🍁' },
  { name: 'Los Angeles', emoji: '🌴' },
];
```

Active city highlighted with `.city-pill--active` class.

### Compact Layout
- Reduced font sizes, gaps, and padding ~30–40% across the dashboard
- Temperature: `clamp(2rem, 6vw, 3rem)`, H1: `clamp(1.05rem, 2.8vw, 1.5rem)`
- Stats grid: 2-col mobile → 3-col tablet (640px) → 4-col desktop (900px+)
- Forecast strip: horizontal scroll on mobile → CSS grid on tablet+

### 7-Day Forecast Label Fix
OWM's `/data/2.5/forecast` only covers 5 days. Switching to Open-Meteo provided a true 7-day daily forecast.

---

## 4. LCP Performance Fix (4.55s → ~1s)

### Problem
LCP regressed from 0.59s to 4.55s after the real-API integration. Root cause: sequential backend API calls (geocode → current → forecast → AQI → UV) summing to ~2.9s.

### Fix
Parallelised with `ThreadPoolExecutor` — all 4 post-geocode calls run simultaneously:

```python
with ThreadPoolExecutor(max_workers=4) as pool:
    fut_current  = pool.submit(self._current_weather,    lat, lon)
    fut_forecast = pool.submit(self._openmeteo_forecast, lat, lon)
    fut_aqi      = pool.submit(self._air_pollution,      lat, lon)
    fut_uvi      = pool.submit(self._uvi,                lat, lon)
```

Added 7-day geo-coordinate cache and 3s AQI timeout.  
**Result:** Cold latency ~1s, warm (cached) ~47ms.

---

## 5. Angular Stack Upgrade (20 → 21)

### Versions after upgrade

| Package | Version |
|---|---|
| Angular CLI | 21.2.12 |
| Angular | 21.2.14 |
| TypeScript | 5.9.3 |
| zone.js | 0.16.2 (installed, not loaded) |
| Jest | 30.4.2 |
| jest-preset-angular | 16.1.5 |
| @types/jest | 30.x |

### Migration
```bash
ng update @angular/core@21 @angular/cli@21 --allow-dirty --force
```
Angular's schematics automatically migrated all templates from `*ngIf`/`*ngFor` to the new `@if`/`@for` block control flow syntax.

### Post-migration fix
After removing `CommonModule`, `DatePipe` and `DecimalPipe` must be imported individually:

```typescript
// weather-dashboard.component.ts
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  imports: [..., DatePipe, DecimalPipe],
})
```

---

## 6. Four Angular 21 Modernisation Improvements

### 6.1 — Zoneless Change Detection

Removed zone.js entirely. ~93 kB removed from the polyfills bundle.

**`app.config.ts`:**
```typescript
// Before
provideZoneChangeDetection({ eventCoalescing: true })

// After
provideZonelessChangeDetection()
```

**`angular.json`:**
```json
"polyfills": []
```

### 6.2 — `@defer` on Below-Fold Sections

The 7-day forecast and hourly chart now load lazily when they enter the viewport:

```html
@defer (on viewport) {
  <section class="forecast-section"> ... </section>
} @placeholder {
  <div class="defer-placeholder"></div>
}

@defer (on viewport) {
  <section class="hourly-section"> ... </section>
} @placeholder {
  <div class="defer-placeholder"></div>
}
```

This split both sections into separate lazy JS chunks, so the hero + stats LCP is not blocked by forecast/chart code.

### 6.3 — Signal-based `input()` / `output()`

Ran Angular migration schematics:
```bash
ng generate @angular/core:signal-input-migration
ng generate @angular/core:output-migration
```

19/23 inputs auto-migrated. The 4 remaining setter inputs were migrated manually:

| Component | Input | Migration approach |
|---|---|---|
| `HourlyChartComponent` | `@Input() set data(...)` | `data = input<ReadonlyArray<HourlyForecast>>([])` |
| `WeatherCardComponent` | `@Input() set iconOverride(...)` | `iconOverride = input<string \| null>(null)` |
| `SearchBoxComponent` | `@Input() set initial(...)` | `initial = input('')` + `effect()` in constructor |
| `StatCardComponent` | `@Input() sublabel?` | `sublabel = input<string \| undefined>(undefined)` |

Also fixed `WeatherCardComponent`: removed `CommonModule`, added `DatePipe` directly.

**Result:** Zero `@Input()`/`@Output()` decorators remaining across all shared components.

### 6.4 — `httpResource` in WeatherService

Replaced manual RxJS subscription + signal wiring with Angular 21's reactive `httpResource`:

```typescript
private readonly _res = httpResource<WeatherDashboardData>(
  () => {
    const city = this._city();
    if (!city) return undefined;
    return { url: `${this.baseUrl}/api/weather`, params: { city } };
  },
  {
    parse: (raw: unknown) => {
      const res = raw as ApiResponse<WeatherDashboardData>;
      if (!res.success || !res.data) throw { message: ..., status: ... };
      return res.data;
    },
  },
);

readonly data    = computed(() => this._res.value() ?? null);
readonly loading = this._res.isLoading;
readonly error   = computed<WeatherApiError | null>(() => { ... });
```

- City signal change → auto-triggers fetch
- `force: true` → calls `_res.reload()`
- `lastUpdated` updated via `effect()` when value changes
- Removed ~80 lines of manual cache + retry + observable code

---

## 7. Full Responsiveness Audit & Fixes

### Popular Cities Strip
- **Mobile (<640px):** horizontal scroll (single row, hidden scrollbar)
- **Tablet+ (≥640px):** `flex-wrap: wrap` — all pills visible, wrap to multiple rows; "Popular:" label becomes full-width row label

### Header Controls
- **Before:** brand + controls only went side-by-side at 1024px; tablets stacked vertically
- **After:** row layout kicks in at **768px**
- Controls section gets `flex: 1; min-width: 0` in row mode so search box fills remaining space beside the brand
- Search box host: `flex: 1 1 auto; min-width: 0` so it can shrink in tight rows

### Hourly Chart Labels
- SVG height: **90px on mobile** (<480px), **110px on tablet+**
- Label font: **0.72rem on mobile**, 0.8rem on tablet+
- Label density: mobile shows **4 labels** (every 6th hour: 0h, 6h, 12h, 18h) via `nth-child(6n+4) { visibility: hidden }` — tablet shows 8 labels (every 3rd hour)

### Other Responsive Elements (already correct)
- Hero card: single column on mobile, two-column grid at 768px+
- Stats grid: 2-col mobile → 3-col (640px) → 4-col (900px)
- Forecast strip: horizontal scroll on mobile → `auto-fill minmax(110px,1fr)` grid on tablet → `repeat(7, 1fr)` on desktop
- Footer: column on mobile → row with space-between at 640px+

---

## 8. Production Build

### Final build output
```
Initial chunk files                          Raw size   Transfer size
chunk-PEBOJGF7.js  (Angular + deps)         147.76 kB    43.92 kB
main-X43JHAER.js   (app bootstrap)           81.61 kB    20.77 kB
chunk-F6D767BW.js  (rxjs/http)               25.24 kB     7.37 kB
chunk-EGGRE3UL.js  (common)                  18.68 kB     5.86 kB
styles-2WWRQF6M.css                           1.86 kB       657 B
─────────────────────────────────────────────────────────────────
Initial total                               275.14 kB    78.58 kB

Lazy chunk files
weather-dashboard-component                  55.11 kB    13.05 kB
weather-card-component  (@defer)              4.63 kB     1.45 kB
hourly-chart-component  (@defer)              3.99 kB     1.57 kB
```

**Initial payload: ~79 kB gzipped** — the heavy dashboard + deferred sections load lazily.

### Budget fix
Default `anyComponentStyle` budget of 4 kB was exceeded by the dashboard SCSS (7.71 kB). Updated in `angular.json`:
```json
{ "type": "anyComponentStyle", "maximumWarning": "8kb", "maximumError": "12kb" }
```

Build is clean — zero errors, zero warnings.

---

## Key Files Reference

### Frontend
| File | Purpose |
|---|---|
| `src/app/app.config.ts` | Zoneless provider, router, HttpClient |
| `src/app/features/weather-dashboard/weather-dashboard.component.ts` | Main dashboard, popular cities, auto-refresh |
| `src/app/features/weather-dashboard/weather-dashboard.component.html` | Template with `@if`/`@for`/`@defer` blocks |
| `src/app/features/weather-dashboard/weather-dashboard.component.scss` | Full responsive styles |
| `src/app/features/weather-dashboard/hourly-chart.component.ts` | SVG line chart, signal input, responsive labels |
| `src/app/core/services/weather.service.ts` | `httpResource`-based data service |
| `src/app/core/services/settings.service.ts` | Unit, theme, lastCity — persisted to localStorage |
| `src/app/shared/components/weather-card/` | Forecast day card |
| `src/app/shared/components/stat-card/` | Stat tile (humidity, wind, etc.) |
| `src/app/shared/components/search-box/` | City search form |
| `src/app/shared/components/error-message/` | Error alert with retry |
| `src/app/shared/components/loading-skeleton/` | Shimmer placeholder |
| `angular.json` | Build config — zoneless polyfills, budgets |

### Backend
| File | Purpose |
|---|---|
| `services/weather_service.py` | Parallel API orchestration, TTL caches |
| `models/weather_transformer.py` | WMO code maps, data shape assembly |
| `.env` | `OPENWEATHER_API_KEY`, `PORT`, `CORS_ORIGINS` |
