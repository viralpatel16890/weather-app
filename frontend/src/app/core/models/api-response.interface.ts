import { AirQuality, Coordinates, CurrentWeather } from './weather.interface';
import { DailyForecast, HourlyForecast } from './forecast.interface';

/** Stable envelope returned by every backend endpoint. */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: { readonly message: string; readonly status: number };
  /** Server-side ISO-8601 timestamp. */
  readonly timestamp: string;
}

/** Full payload behind `GET /api/weather`. */
export interface WeatherDashboardData {
  readonly location: string;
  readonly coordinates: Coordinates;
  readonly current: CurrentWeather;
  readonly forecast: ReadonlyArray<DailyForecast>;
  readonly hourly: ReadonlyArray<HourlyForecast>;
  readonly airQuality: AirQuality | null;
}

/** Domain-level error raised by services after mapping HTTP failures. */
export interface WeatherApiError {
  readonly message: string;
  readonly status: number;
}
