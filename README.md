# Weather Dashboard

A production-ready, full-stack weather dashboard built with **Angular 20+** (standalone components, Signals) and a **Python 3.12 Flask** REST API that proxies the OpenWeatherMap API.

---

## Architecture

```
┌──────────────────────┐      HTTPS/JSON      ┌──────────────────────┐      HTTPS/JSON      ┌─────────────────────┐
│  Angular 20 (SPA)    │ ────────────────────▶│  Flask REST API      │ ────────────────────▶│  OpenWeatherMap     │
│  Signals + RxJS      │◀──────────────────── │  python-dotenv, CORS │◀──────────────────── │  (one-call, AQI)    │
└──────────────────────┘                      └──────────────────────┘                      └─────────────────────┘
```

- **Frontend** never sees the upstream API key. All calls go through `/api/weather`.
- **Backend** performs validation, retry, normalisation and returns a stable schema (`ApiResponse<T>`).
- **Cache layer** lives on both sides: in-memory TTL cache (Flask) + per-city Signal cache (Angular).

## Tech Stack

| Layer        | Tech                                                            |
|--------------|-----------------------------------------------------------------|
| Frontend     | Angular 20, TypeScript 5.5 (`strict`), RxJS 7, SCSS, Signals    |
| State        | Angular Signals + `computed()` + localStorage for preferences   |
| Backend      | Python 3.12, Flask 3, Flask-CORS, requests, python-dotenv       |
| External API | OpenWeatherMap (Geocoding + One Call 3.0 + Air Pollution)       |
| Testing      | Jest (frontend), pytest (backend)                               |

## Quick start

```bash
# 1) Backend
cd backend
cp .env.example .env             # add your OPENWEATHER_API_KEY
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug      # http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
npm install
npm start                        # http://localhost:4200
```

Open http://localhost:4200 and search for a city.

## Feature highlights

- Current weather hero card with °C ⇄ °F toggle
- 7-day forecast with reusable `<app-weather-card>`
- Hourly forecast chart (pure SVG, zero deps)
- Air quality, sunrise/sunset, UV index, visibility, pressure
- Light / dark theme, persisted preference
- Loading skeletons, error & empty states
- Geolocation auto-detect
- Auto-refresh every 30 minutes
- Fully responsive (mobile-first CSS grid)
- WCAG 2.1 AA — keyboard nav, ARIA, contrast

## Sample API response

`GET /api/weather?city=Mumbai`

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
      "sunrise": "2026-05-13T06:02:00Z", "sunset": "2026-05-13T19:07:00Z",
      "observedAt": "2026-05-13T12:30:00Z"
    },
    "forecast": [ { "date": "2026-05-13", "day": "Wed", "high": 33, "low": 27,
                    "condition": "Clouds", "icon": "03d", "precipitationChance": 20 } ],
    "hourly":   [ { "time": "2026-05-13T13:00:00Z", "temperature": 31.4,
                    "condition": "Clouds", "icon": "03d", "precipitationChance": 10 } ],
    "airQuality": { "aqi": 3, "label": "Moderate", "pm2_5": 38.1, "pm10": 71.9 }
  },
  "timestamp": "2026-05-13T18:30:00Z"
}
```

## Folder structure

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Future enhancements

- Server-side caching with Redis (per-coordinate TTL = 10 min)
- WebSocket push of severe-weather alerts
- IndexedDB offline mode (last-known-good payload)
- PDF export of 7-day forecast via `pdfmake`
- Multi-city compare view
- i18n with `@angular/localize`
- E2E coverage with Playwright
