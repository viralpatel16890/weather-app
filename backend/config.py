"""Application configuration. Reads all secrets from env vars."""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Immutable runtime configuration."""

    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    OPENWEATHER_BASE: str = os.getenv(
        "OPENWEATHER_BASE", "https://api.openweathermap.org"
    )
    REQUEST_TIMEOUT_S: float = float(os.getenv("REQUEST_TIMEOUT_S", "8"))
    CACHE_TTL_S: int = int(os.getenv("CACHE_TTL_S", "600"))  # 10 minutes
    PORT: int = int(os.getenv("PORT", "5001"))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()


config = Config()


def configure_logging() -> logging.Logger:
    """Configure structured logging once for the whole app."""
    logging.basicConfig(
        level=config.LOG_LEVEL,
        format='{"ts":"%(asctime)s","level":"%(levelname)s",'
        '"logger":"%(name)s","msg":"%(message)s"}',
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    return logging.getLogger("weather-api")
