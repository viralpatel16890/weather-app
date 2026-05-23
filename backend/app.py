"""Flask entrypoint. Exposes the dashboard API consumed by the Angular client."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Tuple

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import config, configure_logging
from services.weather_service import WeatherService, WeatherServiceError

log = configure_logging()


def create_app(service: WeatherService | None = None) -> Flask:
    """App factory — enables clean unit testing with an injected service."""
    app = Flask(__name__)
    CORS(app, origins=[o.strip() for o in config.CORS_ORIGINS.split(",") if o.strip()])
    weather_service = service or WeatherService()

    # ---- helpers --------------------------------------------------------

    def _ok(data: Any, status: int = 200) -> Tuple[Any, int]:
        return (
            jsonify(
                {
                    "success": True,
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ),
            status,
        )

    def _err(message: str, status: int) -> Tuple[Any, int]:
        log.warning('api error status=%d msg="%s"', status, message)
        return (
            jsonify(
                {
                    "success": False,
                    "error": {"message": message, "status": status},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            ),
            status,
        )

    # ---- routes ---------------------------------------------------------

    @app.get("/api/health")
    def health() -> Tuple[Any, int]:
        return _ok({"status": "ok", "service": "weather-api", "version": "1.0.0"})

    @app.get("/api/weather")
    def weather() -> Tuple[Any, int]:
        city    = request.args.get("city", "").strip()
        lat_str = request.args.get("lat", "").strip()
        lon_str = request.args.get("lon", "").strip()

        if lat_str and lon_str:
            try:
                lat, lon = float(lat_str), float(lon_str)
            except ValueError:
                return _err("'lat' and 'lon' must be numeric", 400)
            try:
                payload = weather_service.get_dashboard_by_coords(lat, lon)
                return _ok(payload)
            except WeatherServiceError as e:
                return _err(str(e), e.status_code)
            except Exception as e:  # pragma: no cover — defensive
                log.exception("unhandled error in /api/weather (coords)")
                return _err(f"internal error: {e}", 500)

        if not city:
            return _err("query parameter 'city' or 'lat'+'lon' is required", 400)
        try:
            payload = weather_service.get_dashboard(city)
            return _ok(payload)
        except WeatherServiceError as e:
            return _err(str(e), e.status_code)
        except Exception as e:  # pragma: no cover — defensive
            log.exception("unhandled error in /api/weather")
            return _err(f"internal error: {e}", 500)

    @app.get("/api/weather/current")
    def current() -> Tuple[Any, int]:
        city = request.args.get("city", "").strip()
        if not city:
            return _err("query parameter 'city' is required", 400)
        try:
            payload = weather_service.get_dashboard(city)
            return _ok(
                {
                    "location": payload["location"],
                    "coordinates": payload["coordinates"],
                    "current": payload["current"],
                }
            )
        except WeatherServiceError as e:
            return _err(str(e), e.status_code)

    @app.get("/api/weather/forecast")
    def forecast() -> Tuple[Any, int]:
        city = request.args.get("city", "").strip()
        if not city:
            return _err("query parameter 'city' is required", 400)
        try:
            payload = weather_service.get_dashboard(city)
            return _ok(
                {
                    "location": payload["location"],
                    "forecast": payload["forecast"],
                    "hourly": payload["hourly"],
                }
            )
        except WeatherServiceError as e:
            return _err(str(e), e.status_code)

    # ---- error handlers -------------------------------------------------

    @app.errorhandler(404)
    def _not_found(_e):  # type: ignore[override]
        return _err("not found", 404)

    @app.errorhandler(405)
    def _method(_e):  # type: ignore[override]
        return _err("method not allowed", 405)

    return app


# Module-level WSGI app for `flask run` / gunicorn.
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=True)
