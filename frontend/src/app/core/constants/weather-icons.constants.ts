/**
 * Maps OpenWeatherMap icon codes (and our coarse `condition` strings) to a
 * single emoji glyph. Using emoji keeps the bundle tiny — for full fidelity,
 * swap in a sprite or animated SVG set.
 */

export const ICON_BY_OWM_CODE: Readonly<Record<string, string>> = {
  '01d': '☀️', '01n': '🌙',
  '02d': '🌤️', '02n': '☁️',
  '03d': '⛅',  '03n': '☁️',
  '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️',
  '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️',
  '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
};

/** Fallback by `condition` text — used when we only have the short label. */
export const ICON_BY_CONDITION: Readonly<Record<string, string>> = {
  Clear: '☀️',
  Clouds: '⛅',
  Rain: '🌧️',
  Drizzle: '🌦️',
  Thunderstorm: '⛈️',
  Snow: '❄️',
  Mist: '🌫️',
  Smoke: '🌫️',
  Haze: '🌫️',
  Fog: '🌫️',
  Tornado: '🌪️',
};

export const DEFAULT_ICON = '🌡️';
