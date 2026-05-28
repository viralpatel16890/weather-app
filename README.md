# Weather Dashboard

A production-ready, full-stack weather dashboard built with **Angular 21** (standalone components, Signals) and a **Python 3 Flask** REST API that proxies the OpenWeatherMap API.

**Live demo:** https://weather-app-seven-tau-29.vercel.app

---

## How It Works

```
User Browser
    │
    ▼
Vercel CDN  ──────  Angular 21 SPA (static files)
    │
    │  /api-proxy/* (Vercel rewrite proxy)
    │
    ▼
Render  ──────  Flask REST API (gunicorn)
    │
    │  HTTPS
    ▼
OpenWeatherMap API
(Geocoding + One Call 3.0 + Air Pollution)
```

1. The browser loads the Angular SPA from Vercel's CDN.
2. Angular detects the user's location via the Geolocation API (or accepts a city search).
3. All API calls go to `/api-proxy/*` on the same Vercel origin — Vercel silently rewrites them to the Flask backend on Render. The OpenWeather API key is never exposed to the browser.
4. Flask geocodes the city, calls OpenWeatherMap, transforms the response into a stable `ApiResponse<WeatherDashboardData>` schema, and returns it.
5. Angular's `httpResource` + Signals update the UI reactively.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Angular 21, TypeScript 5.9 (`strict`), RxJS 7, SCSS, Signals |
| State | Angular Signals + `computed()` + localStorage for preferences |
| Backend | Python 3, Flask 3, Flask-CORS, requests, python-dotenv, gunicorn |
| External API | OpenWeatherMap (Geocoding + One Call 3.0 + Air Pollution) |
| Frontend hosting | Vercel (CDN, rewrite proxy, auto-deploy from GitHub) |
| Backend hosting | Render (free tier, auto-deploy from GitHub) |
| Testing | Jest (frontend), pytest (backend) |

---

## Folder Structure

```
weather-app/
├── frontend/                          # Angular 21 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts       # Root component
│   │   │   ├── app.config.ts          # Angular bootstrap config
│   │   │   ├── app.routes.ts          # Route definitions
│   │   │   ├── core/
│   │   │   │   ├── constants/
│   │   │   │   │   └── weather-icons.constants.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── api-response.interface.ts   # ApiResponse<T> shape
│   │   │   │   │   ├── forecast.interface.ts       # HourlyForecast, DailyForecast
│   │   │   │   │   └── weather.interface.ts        # WeatherDashboardData
│   │   │   │   └── services/
│   │   │   │       ├── icon.service.ts             # Maps OWM icon codes → emoji
│   │   │   │       ├── settings.service.ts         # °C/°F toggle, theme, localStorage
│   │   │   │       └── weather.service.ts          # httpResource, city/coords signals
│   │   │   ├── features/
│   │   │   │   └── weather-dashboard/
│   │   │   │       ├── hourly-chart.component.ts   # Pure SVG 24h line chart
│   │   │   │       ├── weather-dashboard.component.ts
│   │   │   │       └── weather-dashboard.component.html
│   │   │   └── shared/
│   │   │       ├── components/
│   │   │       │   ├── error-message/              # Error state UI
│   │   │       │   ├── loading-skeleton/           # Skeleton loading cards
│   │   │       │   ├── search-box/                 # City search input
│   │   │       │   ├── stat-card/                  # Humidity/UV/pressure tiles
│   │   │       │   └── weather-card/               # 7-day forecast card
│   │   │       └── pipes/
│   │   │           └── temperature.pipe.ts         # °C ↔ °F conversion pipe
│   │   ├── environments/
│   │   │   ├── environment.ts                      # Dev: apiBaseUrl = /api
│   │   │   └── environment.prod.ts                 # Prod: apiBaseUrl = /api-proxy
│   │   ├── index.html
│   │   └── main.ts
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                           # Flask REST API
│   ├── app.py                         # Flask app factory, routes (/api/weather, /api/health)
│   ├── config.py                      # Config dataclass, reads from env vars
│   ├── models/
│   │   └── weather_transformer.py     # Maps OWM raw JSON → WeatherDashboardData
│   ├── services/
│   │   └── weather_service.py         # Geocoding, OWM calls, in-memory TTL cache
│   ├── tests/
│   │   └── test_weather_service.py
│   └── requirements.txt
│
├── vercel.json                        # Vercel build config + /api-proxy rewrite
├── netlify.toml                       # Netlify build config (alternative)
└── README.md
```

---

## Local Development

```bash
# 1 — Backend
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Create .env with your key:
echo OPENWEATHER_API_KEY=your_key_here > .env

python app.py          # http://localhost:5001

# 2 — Frontend (new terminal)
cd frontend
npm install
npm start              # http://localhost:4200 (auto-opens browser)
```

---

## API Endpoints

| Method | Endpoint | Params | Description |
|---|---|---|---|
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/weather` | `city=Mumbai` or `lat=19.07&lon=72.87` | Full dashboard data |
| `GET` | `/api/weather/current` | `city=Mumbai` | Current conditions only |
| `GET` | `/api/weather/forecast` | `city=Mumbai` | 7-day + hourly forecast only |

### Sample response — `GET /api/weather?city=Mumbai`

```json
{
  "success": true,
  "data": {
    "location": "Mumbai, IN",
    "coordinates": { "lat": 19.0760, "lon": 72.8777 },
    "current": {
      "temperature": 31.2, "feelsLike": 36.4,
      "condition": "Clouds", "description": "scattered clouds",
      "icon": "03d", "humidity": 74, "windSpeed": 4.2,
      "pressure": 1009, "visibility": 6000, "uvIndex": 7,
      "sunrise": "2026-05-28T06:02:00Z", "sunset": "2026-05-28T19:07:00Z"
    },
    "forecast": [
      { "date": "2026-05-28", "day": "Thu", "high": 33, "low": 27,
        "condition": "Clouds", "icon": "03d", "precipitationChance": 20 }
    ],
    "hourly": [
      { "time": "2026-05-28T13:00:00Z", "temperature": 31.4,
        "condition": "Clouds", "icon": "03d", "precipitationChance": 10 }
    ],
    "airQuality": { "aqi": 3, "label": "Moderate", "pm2_5": 38.1, "pm10": 71.9 }
  },
  "timestamp": "2026-05-28T18:30:00Z"
}
```

---

## Features

- Current weather hero card with °C ⇄ °F toggle
- 7-day forecast with reusable `<app-weather-card>`
- Hourly forecast chart (pure SVG, zero dependencies)
- Air quality index, sunrise/sunset, UV index, visibility, pressure
- Light / dark theme with persisted preference
- Loading skeletons, error and empty states
- Geolocation auto-detect on page load
- City search with keyboard support
- Auto-refresh every 30 minutes
- Fully responsive (mobile-first CSS grid)
- WCAG 2.1 AA — keyboard navigation, ARIA labels, contrast ratios

---

## Deployment

### Frontend — Vercel

The `vercel.json` at the repo root configures everything:

```json
{
  "buildCommand": "cd frontend && npm ci && npm run build",
  "outputDirectory": "frontend/dist/weather-dashboard/browser",
  "rewrites": [
    { "source": "/api-proxy/:path*", "destination": "https://weather-app-qqhw.onrender.com/:path*" },
    { "source": "/((?!api-proxy).*)", "destination": "/index.html" }
  ]
}
```

Push to `main` → Vercel auto-deploys.

### Backend — Render

| Setting | Value |
|---|---|
| Runtime | Python 3 |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn app:app` |
| Env var | `OPENWEATHER_API_KEY=<your key>` |

Push to `main` → Render auto-deploys.

> **Note:** The Render free tier spins down after inactivity. First request after idle may take ~30-50 seconds.

---

## Future Enhancements

- Server-side caching with Redis (per-coordinate TTL)
- WebSocket push for severe-weather alerts
- IndexedDB offline mode (last-known-good payload)
- Multi-city compare view
- i18n with `@angular/localize`
- E2E coverage with Playwright
