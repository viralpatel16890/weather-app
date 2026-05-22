"""Pure normalisation functions for the dashboard API.

Data sources:
  current_raw  — OWM /data/2.5/weather
  om_forecast  — Open-Meteo /v1/forecast  (7-day daily + 48h hourly)
  air_quality  — OWM /data/2.5/air_pollution
  uv           — OWM /data/2.5/uvi (float or None)

All times returned as ISO-8601 UTC strings.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

AQI_LABELS = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}

_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# WMO weather code → (OWM-style condition, icon prefix)
_WMO: Dict[int, tuple] = {
    0:  ("Clear",        "01"),
    1:  ("Clouds",       "02"),
    2:  ("Clouds",       "03"),
    3:  ("Clouds",       "04"),
    45: ("Mist",         "50"),
    48: ("Mist",         "50"),
    51: ("Drizzle",      "09"),
    53: ("Drizzle",      "09"),
    55: ("Drizzle",      "09"),
    56: ("Drizzle",      "09"),
    57: ("Drizzle",      "09"),
    61: ("Rain",         "10"),
    63: ("Rain",         "10"),
    65: ("Rain",         "10"),
    66: ("Rain",         "13"),
    67: ("Rain",         "13"),
    71: ("Snow",         "13"),
    73: ("Snow",         "13"),
    75: ("Snow",         "13"),
    77: ("Snow",         "13"),
    80: ("Rain",         "09"),
    81: ("Rain",         "09"),
    82: ("Rain",         "09"),
    85: ("Snow",         "13"),
    86: ("Snow",         "13"),
    95: ("Thunderstorm", "11"),
    96: ("Thunderstorm", "11"),
    99: ("Thunderstorm", "11"),
}

_WMO_DESC: Dict[int, str] = {
    0:  "clear sky",
    1:  "mainly clear",   2:  "partly cloudy",  3:  "overcast",
    45: "mist",           48: "rime fog",
    51: "light drizzle",  53: "drizzle",        55: "heavy drizzle",
    61: "light rain",     63: "rain",           65: "heavy rain",
    71: "light snow",     73: "snow",           75: "heavy snow",
    77: "snow grains",
    80: "light showers",  81: "showers",        82: "heavy showers",
    95: "thunderstorm",   96: "thunderstorm with hail",
    99: "thunderstorm with heavy hail",
}


def _iso(epoch: int | float | None) -> str | None:
    if epoch is None:
        return None
    return datetime.fromtimestamp(int(epoch), tz=timezone.utc).isoformat()


def _wmo(code: int, daytime: bool = True) -> tuple[str, str]:
    cond, prefix = _WMO.get(code, ("Clouds", "04"))
    suffix = "d" if daytime else "n"
    # night icons only make sense for clear/few-clouds
    if not daytime and prefix not in ("01", "02"):
        suffix = "d"
    return cond, f"{prefix}{suffix}"


# ── Current weather ──────────────────────────────────────────────────────────

def transform_current(current_raw: Dict[str, Any], uv: Optional[float]) -> Dict[str, Any]:
    main    = current_raw.get("main", {})
    wind    = current_raw.get("wind", {})
    sys     = current_raw.get("sys", {})
    weather = (current_raw.get("weather") or [{}])[0]
    return {
        "temperature": round(main.get("temp", 0), 1),
        "feelsLike":   round(main.get("feels_like", 0), 1),
        "condition":   weather.get("main", "Unknown"),
        "description": weather.get("description", ""),
        "icon":        weather.get("icon", "01d"),
        "humidity":    main.get("humidity"),
        "windSpeed":   wind.get("speed"),
        "pressure":    main.get("pressure"),
        "visibility":  current_raw.get("visibility"),
        "uvIndex":     uv,
        "sunrise":     _iso(sys.get("sunrise")),
        "sunset":      _iso(sys.get("sunset")),
        "observedAt":  _iso(current_raw.get("dt")),
    }


# ── 7-day daily forecast (Open-Meteo) ────────────────────────────────────────

def transform_forecast(om: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convert Open-Meteo daily block into 7 forecast cards."""
    daily  = om.get("daily", {})
    times  = daily.get("time", [])               # ["2026-05-22", ...]
    codes  = daily.get("weather_code", [])
    highs  = daily.get("temperature_2m_max", [])
    lows   = daily.get("temperature_2m_min", [])
    pops   = daily.get("precipitation_probability_max", [])

    today_str = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")
    out: List[Dict[str, Any]] = []

    for i, date_str in enumerate(times[:7]):
        code      = int(codes[i]) if i < len(codes) else 0
        cond, icon = _wmo(code, daytime=True)
        dt        = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        pop       = pops[i] if i < len(pops) else 0

        out.append({
            "date":                date_str,
            "day":                 _DAY_NAMES[dt.weekday()],
            "high":                round(float(highs[i])) if i < len(highs) else 0,
            "low":                 round(float(lows[i]))  if i < len(lows)  else 0,
            "condition":           cond,
            "description":         _WMO_DESC.get(code, ""),
            "icon":                icon,
            "precipitationChance": int(round(float(pop or 0))),
            "isToday":             date_str == today_str,
        })
    return out


# ── 24-hour hourly forecast (Open-Meteo) ─────────────────────────────────────

def transform_hourly(om: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the next 24 hourly slots starting from the current hour."""
    hourly = om.get("hourly", {})
    times  = hourly.get("time", [])
    temps  = hourly.get("temperature_2m", [])
    codes  = hourly.get("weather_code", [])
    pops   = hourly.get("precipitation_probability", [])

    now_ts = datetime.now(tz=timezone.utc).timestamp()
    out: List[Dict[str, Any]] = []

    for i, time_str in enumerate(times):
        # Open-Meteo returns "2026-05-22T14:00" — treat as UTC
        dt = datetime.fromisoformat(time_str).replace(tzinfo=timezone.utc)
        if dt.timestamp() < now_ts:
            continue
        if len(out) >= 24:
            break

        code       = int(codes[i]) if i < len(codes) else 0
        hour_local = dt.hour
        cond, icon = _wmo(code, daytime=(6 <= hour_local < 20))
        pop        = pops[i] if i < len(pops) else 0

        out.append({
            "time":                dt.isoformat(),
            "temperature":         round(float(temps[i]), 1) if i < len(temps) else 0,
            "condition":           cond,
            "icon":                icon,
            "precipitationChance": int(round(float(pop or 0))),
        })
    return out


# ── Air quality ───────────────────────────────────────────────────────────────

def transform_air_quality(aq: Dict[str, Any] | None) -> Dict[str, Any] | None:
    if not aq or not aq.get("list"):
        return None
    entry = aq["list"][0]
    aqi   = entry["main"]["aqi"]
    comps = entry.get("components", {})
    return {
        "aqi":   aqi,
        "label": AQI_LABELS.get(aqi, "Unknown"),
        "pm2_5": comps.get("pm2_5"),
        "pm10":  comps.get("pm10"),
        "no2":   comps.get("no2"),
        "o3":    comps.get("o3"),
    }


# ── Assemble ──────────────────────────────────────────────────────────────────

def assemble(
    location:    str,
    coords:      Dict[str, float],
    current_raw: Dict[str, Any],
    om_forecast: Dict[str, Any],
    air_quality: Optional[Dict[str, Any]],
    uv:          Optional[float],
) -> Dict[str, Any]:
    return {
        "location":   location,
        "coordinates": coords,
        "current":    transform_current(current_raw, uv),
        "forecast":   transform_forecast(om_forecast),
        "hourly":     transform_hourly(om_forecast),
        "airQuality": transform_air_quality(air_quality),
    }
