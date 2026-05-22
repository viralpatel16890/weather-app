/**
 * Core dashboard models. Every field is documented so consumers can
 * intellisense their way around without opening the backend code.
 *
 * NOTE: all times are ISO-8601 UTC strings ("2026-05-13T12:30:00Z").
 *       Convert with `new Date(iso)` for local rendering.
 */

/** Geographic coordinates returned by the geocoder. */
export interface Coordinates {
  /** Latitude in decimal degrees. */
  readonly lat: number;
  /** Longitude in decimal degrees. */
  readonly lon: number;
}

/** "Right now" snapshot for the hero card. */
export interface CurrentWeather {
  /** Temperature in metric units (°C). UI converts to °F as needed. */
  readonly temperature: number;
  /** Apparent temperature. */
  readonly feelsLike: number;
  /** Short label, e.g. "Clouds". */
  readonly condition: string;
  /** Long label, e.g. "scattered clouds". */
  readonly description: string;
  /** OWM icon code, e.g. "03d". Used by IconService. */
  readonly icon: string;
  /** Relative humidity 0–100. */
  readonly humidity: number;
  /** Wind speed in m/s. */
  readonly windSpeed: number;
  /** Surface pressure in hPa. */
  readonly pressure: number;
  /** Average visibility in metres. */
  readonly visibility: number;
  /** UV index (0–11+). Optional — not available in every region. */
  readonly uvIndex?: number;
  /** ISO-8601 sunrise time. */
  readonly sunrise?: string;
  /** ISO-8601 sunset time. */
  readonly sunset?: string;
  /** ISO-8601 timestamp the observation was made. */
  readonly observedAt: string;
}

/** Air quality summary. AQI scale 1–5, label is human-readable. */
export interface AirQuality {
  readonly aqi: 1 | 2 | 3 | 4 | 5;
  readonly label: 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor';
  /** Particulates < 2.5µm (µg/m³). */
  readonly pm2_5?: number;
  /** Particulates < 10µm (µg/m³). */
  readonly pm10?: number;
  readonly no2?: number;
  readonly o3?: number;
}
