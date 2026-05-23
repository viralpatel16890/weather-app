"""Weather API service.

Data sources:
  OWM /geo/1.0/direct        — geocoding (coords cached 7 days)
  OWM /data/2.5/weather      — current conditions
  OWM /data/2.5/air_pollution — AQI
  OWM /data/2.5/uvi          — UV index (legacy free endpoint)
  Open-Meteo /v1/forecast    — 7-day daily + 48h hourly (no key required)

The four data calls after geocoding run in parallel via ThreadPoolExecutor
to keep total latency near the slowest single call rather than their sum.
"""
from __future__ import annotations

import logging
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Optional, Tuple

import requests

from config import config
from models.weather_transformer import assemble

log = logging.getLogger("weather-api.service")

OPEN_METEO_BASE = "https://api.open-meteo.com"
_GEO_TTL_S      = 7 * 24 * 3600   # coordinates are stable; cache for 7 days
_AQI_TIMEOUT_S  = 3.0              # AQI is optional; don't let it stall the page


class WeatherServiceError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class _TTLCache:
    def __init__(self, ttl_s: int) -> None:
        self._ttl   = ttl_s
        self._lock  = threading.Lock()
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            hit = self._store.get(key)
            if not hit:
                return None
            ts, value = hit
            if time.time() - ts > self._ttl:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.time(), value)


def _safe_result(fut, timeout: float) -> Any:
    try:
        return fut.result(timeout=timeout)
    except Exception:
        return None


class WeatherService:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or config.OPENWEATHER_API_KEY
        if not self.api_key:
            log.warning("OPENWEATHER_API_KEY not set — OWM calls will fail.")
        self._cache     = _TTLCache(config.CACHE_TTL_S)
        self._geo_cache = _TTLCache(_GEO_TTL_S)
        self._pool      = ThreadPoolExecutor(max_workers=4)

    # ── public ──────────────────────────────────────────────────────────────

    def get_dashboard(self, city: str) -> Dict[str, Any]:
        city = (city or "").strip()
        if not city:
            raise WeatherServiceError("city is required", 400)

        cache_key = f"dashboard::{city.lower()}"
        cached = self._cache.get(cache_key)
        if cached:
            log.info("cache hit for %s", city)
            return cached

        name, country, lat, lon = self._geocode(city)

        # Run all four data calls in parallel using the shared pool
        fut_current  = self._pool.submit(self._current_weather,    lat, lon)
        fut_forecast = self._pool.submit(self._openmeteo_forecast, lat, lon)
        fut_aqi      = self._pool.submit(self._air_pollution,      lat, lon)
        fut_uvi      = self._pool.submit(self._uvi,                lat, lon)

        _result_timeout = config.REQUEST_TIMEOUT_S + 2
        try:
            current_raw = fut_current.result(timeout=_result_timeout)
            om_forecast = fut_forecast.result(timeout=_result_timeout)
        except Exception as exc:
            raise WeatherServiceError(f"weather fetch failed: {exc}", 502) from exc

        air_quality = _safe_result(fut_aqi, _result_timeout)
        uv          = _safe_result(fut_uvi, _result_timeout)

        payload = assemble(
            location    = f"{name}, {country}" if country else name,
            coords      = {"lat": lat, "lon": lon},
            current_raw = current_raw,
            om_forecast = om_forecast,
            air_quality = air_quality,
            uv          = uv,
        )
        self._cache.set(cache_key, payload)
        return payload

    def get_dashboard_by_coords(self, lat: float, lon: float) -> Dict[str, Any]:
        cache_key = f"dashboard::coords::{lat:.4f},{lon:.4f}"
        cached = self._cache.get(cache_key)
        if cached:
            log.info("cache hit for coords %.4f,%.4f", lat, lon)
            return cached

        name, country = self._reverse_geocode(lat, lon)

        fut_current  = self._pool.submit(self._current_weather,    lat, lon)
        fut_forecast = self._pool.submit(self._openmeteo_forecast, lat, lon)
        fut_aqi      = self._pool.submit(self._air_pollution,      lat, lon)
        fut_uvi      = self._pool.submit(self._uvi,                lat, lon)

        _result_timeout = config.REQUEST_TIMEOUT_S + 2
        try:
            current_raw = fut_current.result(timeout=_result_timeout)
            om_forecast = fut_forecast.result(timeout=_result_timeout)
        except Exception as exc:
            raise WeatherServiceError(f"weather fetch failed: {exc}", 502) from exc

        air_quality = _safe_result(fut_aqi, _result_timeout)
        uv          = _safe_result(fut_uvi, _result_timeout)

        payload = assemble(
            location    = f"{name}, {country}" if country else name,
            coords      = {"lat": lat, "lon": lon},
            current_raw = current_raw,
            om_forecast = om_forecast,
            air_quality = air_quality,
            uv          = uv,
        )
        self._cache.set(cache_key, payload)
        return payload

    # ── private HTTP ─────────────────────────────────────────────────────────

    def _geocode(self, city: str) -> Tuple[str, str, float, float]:
        key = f"geo::{city.lower()}"
        hit = self._geo_cache.get(key)
        if hit:
            log.info("geo cache hit for %s", city)
            return hit

        data = self._get(
            f"{config.OPENWEATHER_BASE}/geo/1.0/direct",
            {"q": city, "limit": 1, "appid": self.api_key},
        )
        if not data:
            raise WeatherServiceError(f"city not found: {city}", 404)
        top    = data[0]
        result = (top.get("name", city), top.get("country", ""), top["lat"], top["lon"])
        self._geo_cache.set(key, result)
        return result

    def _reverse_geocode(self, lat: float, lon: float) -> Tuple[str, str]:
        data = self._get(
            f"{config.OPENWEATHER_BASE}/geo/1.0/reverse",
            {"lat": lat, "lon": lon, "limit": 1, "appid": self.api_key},
        )
        if not data:
            return f"{lat:.4f},{lon:.4f}", ""
        top = data[0]
        return top.get("name", ""), top.get("country", "")

    def _current_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        return self._get(
            f"{config.OPENWEATHER_BASE}/data/2.5/weather",
            {"lat": lat, "lon": lon, "units": "metric", "appid": self.api_key},
        )

    def _openmeteo_forecast(self, lat: float, lon: float) -> Dict[str, Any]:
        """7-day daily + next 48h hourly from Open-Meteo (no API key needed)."""
        return self._get(
            f"{OPEN_METEO_BASE}/v1/forecast",
            {
                "latitude":     lat,
                "longitude":    lon,
                "daily":        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "hourly":       "temperature_2m,weather_code,precipitation_probability",
                "forecast_days": 7,
                "forecast_hours": 48,
                "timezone":     "UTC",
            },
        )

    def _uvi(self, lat: float, lon: float) -> Optional[float]:
        try:
            data = self._get(
                f"{config.OPENWEATHER_BASE}/data/2.5/uvi",
                {"lat": lat, "lon": lon, "appid": self.api_key},
            )
            return data.get("value")
        except WeatherServiceError:
            log.warning("UV index lookup failed; continuing without it")
            return None

    def _air_pollution(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        try:
            return self._get(
                f"{config.OPENWEATHER_BASE}/data/2.5/air_pollution",
                {"lat": lat, "lon": lon, "appid": self.api_key},
                timeout=_AQI_TIMEOUT_S,
            )
        except WeatherServiceError:
            log.warning("air-quality lookup failed; continuing without it")
            return None

    def _get(
        self,
        url: str,
        params: Dict[str, Any],
        *,
        attempts: int = 3,
        backoff_s: float = 0.5,
        timeout: Optional[float] = None,
    ) -> Any:
        _timeout = timeout or config.REQUEST_TIMEOUT_S
        last_err: Optional[Exception] = None
        for attempt in range(1, attempts + 1):
            try:
                resp = requests.get(url, params=params, timeout=_timeout)
                if resp.status_code == 404:
                    raise WeatherServiceError("upstream 404", 404)
                if resp.status_code == 401:
                    raise WeatherServiceError(
                        f"API key rejected by {url} — check your OWM plan", 401
                    )
                resp.raise_for_status()
                return resp.json()
            except WeatherServiceError:
                raise
            except requests.RequestException as e:
                last_err = e
                log.warning("upstream call failed (attempt %d/%d): %s", attempt, attempts, e)
                if attempt < attempts:
                    time.sleep(backoff_s * (2 ** (attempt - 1)))
        raise WeatherServiceError(f"upstream unavailable: {last_err}", 502)
