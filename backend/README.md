# Weather API — Flask backend

REST proxy in front of OpenWeatherMap. Sits between the SPA and the upstream
provider so the API key never reaches the browser.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # add OPENWEATHER_API_KEY
flask --app app run --debug
```

Production:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Endpoints

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/health`                 | Liveness probe                       |
| GET    | `/api/weather?city=Mumbai`    | Full dashboard payload               |
| GET    | `/api/weather/current?city=…` | Just the `current` block             |
| GET    | `/api/weather/forecast?city=…`| `forecast` + `hourly` blocks         |

All responses share the envelope:

```json
{ "success": true|false, "data": {...}, "error": {...}, "timestamp": "ISO-8601" }
```

## Layout

```
backend/
├── app.py                       # Flask app factory + routes
├── config.py                    # dotenv-backed Config dataclass
├── services/weather_service.py  # Upstream client, cache, retry
├── models/weather_transformer.py# Pure normalisation functions
├── tests/                       # pytest suite
├── requirements.txt
└── .env.example
```

## Tests

```bash
pytest -q
```

## Tuning

| Env var            | Default | Purpose                            |
|--------------------|---------|------------------------------------|
| `REQUEST_TIMEOUT_S`| 8       | Upstream HTTP timeout              |
| `CACHE_TTL_S`      | 600     | In-process city cache TTL          |
| `CORS_ORIGINS`     | `localhost:4200` | Comma-separated allowlist |
| `LOG_LEVEL`        | INFO    | DEBUG / INFO / WARNING / ERROR     |
