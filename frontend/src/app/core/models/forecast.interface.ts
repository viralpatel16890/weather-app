/** Forecast slices used by the dashboard. */

/** One day in the 7-day strip. */
export interface DailyForecast {
  /** ISO date (YYYY-MM-DD). */
  readonly date: string;
  /** 3-letter weekday, e.g. "Wed". */
  readonly day: string;
  /** Forecast high in °C. */
  readonly high: number;
  /** Forecast low in °C. */
  readonly low: number;
  readonly condition: string;
  readonly description?: string;
  /** OWM icon code, e.g. "10d". */
  readonly icon: string;
  /** Probability of precipitation as a 0–100 integer. */
  readonly precipitationChance: number;
  /** Convenience flag: card should be highlighted. */
  readonly isToday?: boolean;
}

/** One hour in the 24-hour chart. */
export interface HourlyForecast {
  /** ISO-8601 timestamp. */
  readonly time: string;
  /** Temperature in °C. */
  readonly temperature: number;
  readonly condition: string;
  readonly icon: string;
  readonly precipitationChance: number;
}
