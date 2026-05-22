"""Tests for the weather pipeline. The upstream HTTP layer is mocked so the
suite runs offline."""
from __future__ import annotations

from unittest.mock import patch

import pytest

from app import create_app
from models.weather_transformer import (
    transform_air_quality,
    transform_current,
    transform_forecast,
    transform_hourly,
)
from services.weather_service import WeatherService, WeatherServiceError


# ---------- Transformer ------------------------------------------------------


FAKE_ONECALL = {
    "current": {
        "dt": 1747136400,
        "sunrise": 1747094520,
        "sunset": 1747141620,
        "temp": 31.2,
        "feels_like": 36.4,
        "humidity": 74,
        "pressure": 1009,
        "uvi": 7,
        "visibility": 6000,
        "wind_speed": 4.2,
        "weather": [
            {"main": "Clouds", "description": "scattered clouds", "icon": "03d"}
        ],
    },
    "daily": [
        {
            "dt": 1747094400 + i * 86400,
            "temp": {"max": 33, "min": 27},
            "pop": 0.2,
            "weather": [{"main": "Clouds", "description": "clouds", "icon": "03d"}],
        }
        for i in range(8)
    ],
    "hourly": [
        {
            "dt": 1747136400 + i * 3600,
            "temp": 31.4,
            "pop": 0.1,
            "weather": [{"main": "Clouds", "description": "clouds", "icon": "03d"}],
        }
        for i in range(30)
    ],
}

FAKE_AQ = {
    "list": [
        {
            "main": {"aqi": 3},
            "components": {"pm2_5": 38.1, "pm10": 71.9, "no2": 12.0, "o3": 95.4},
        }
    ]
}


def test_transform_current_keys():
    out = transform_current(FAKE_ONECALL)
    assert out["temperature"] == 31.2
    assert out["condition"] == "Clouds"
    assert out["icon"] == "03d"
    assert out["humidity"] == 74
    assert out["sunrise"].endswith("+00:00")


def test_transform_forecast_marks_today_and_caps_seven():
    out = transform_forecast(FAKE_ONECALL)
    assert len(out) == 7
    assert out[0]["isToday"] is True
    assert all(c["precipitationChance"] == 20 for c in out)


def test_transform_hourly_caps_24():
    assert len(transform_hourly(FAKE_ONECALL)) == 24


def test_transform_air_quality_label():
    out = transform_air_quality(FAKE_AQ)
    assert out["aqi"] == 3
    assert out["label"] == "Moderate"
    assert out["pm2_5"] == 38.1


def test_transform_air_quality_handles_none():
    assert transform_air_quality(None) is None
    assert transform_air_quality({"list": []}) is None


# ---------- Service ----------------------------------------------------------


class _StubResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code

    def json(self):
        return self._json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


def test_service_assembles_full_payload():
    geo = [{"name": "Mumbai", "country": "IN", "lat": 19.07, "lon": 72.87}]
    with patch("services.weather_service.requests.get") as get:
        get.side_effect = [
            _StubResponse(geo),
            _StubResponse(FAKE_ONECALL),
            _StubResponse(FAKE_AQ),
        ]
        svc = WeatherService(api_key="x")
        payload = svc.get_dashboard("Mumbai")

    assert payload["location"] == "Mumbai, IN"
    assert payload["coordinates"] == {"lat": 19.07, "lon": 72.87}
    assert len(payload["forecast"]) == 7
    assert payload["airQuality"]["label"] == "Moderate"


def test_service_raises_on_empty_city():
    with pytest.raises(WeatherServiceError):
        WeatherService(api_key="x").get_dashboard("   ")


def test_service_raises_on_unknown_city():
    with patch("services.weather_service.requests.get") as get:
        get.return_value = _StubResponse([])
        with pytest.raises(WeatherServiceError) as exc:
            WeatherService(api_key="x").get_dashboard("xyzzy")
    assert exc.value.status_code == 404


# ---------- HTTP layer ------------------------------------------------------


@pytest.fixture
def client():
    class _FakeSvc:
        def get_dashboard(self, city):  # noqa: D401, ANN001
            if city == "boom":
                raise WeatherServiceError("upstream down", 502)
            return {
                "location": city, "coordinates": {"lat": 0, "lon": 0},
                "current": {}, "forecast": [], "hourly": [], "airQuality": None,
            }

    app = create_app(service=_FakeSvc())
    app.config.update(TESTING=True)
    return app.test_client()


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.get_json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_weather_requires_city(client):
    r = client.get("/api/weather")
    assert r.status_code == 400
    assert r.get_json()["success"] is False


def test_weather_happy_path(client):
    r = client.get("/api/weather?city=Mumbai")
    assert r.status_code == 200
    body = r.get_json()
    assert body["success"] is True
    assert body["data"]["location"] == "Mumbai"


def test_weather_propagates_service_errors(client):
    r = client.get("/api/weather?city=boom")
    assert r.status_code == 502
