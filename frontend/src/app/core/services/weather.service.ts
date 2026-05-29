import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  WeatherApiError,
  WeatherDashboardData,
} from '../models/api-response.interface';

const CACHE_PREFIX = 'wx_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Reactive weather data service backed by `httpResource`.
 *
 * Changing the city signal automatically triggers a fresh HTTP fetch.
 * Force-refresh calls `reload()` on the resource without changing the city.
 * localStorage is used as a 24-hour stale cache: last known data is shown
 * immediately on load while a fresh fetch runs in the background.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly _city = signal('');
  private readonly _coords = signal<{ lat: number; lon: number } | null>(null);
  private readonly _lastUpdated = signal<Date | null>(null);
  private readonly _stale = signal<WeatherDashboardData | null>(null);

  private readonly _res = httpResource<WeatherDashboardData>(
    () => {
      const coords = this._coords();
      if (coords) {
        const params: Record<string, string> = { lat: String(coords.lat), lon: String(coords.lon) };
        return { url: `${this.baseUrl}/api/weather`, params };
      }
      const city = this._city();
      if (!city) return undefined;
      const params: Record<string, string> = { city };
      return { url: `${this.baseUrl}/api/weather`, params };
    },
    {
      parse: (raw: unknown) => {
        const res = raw as ApiResponse<WeatherDashboardData>;
        if (!res.success || !res.data) {
          throw {
            message: res.error?.message ?? 'Unexpected server response',
            status: res.error?.status ?? 500,
          } satisfies WeatherApiError;
        }
        return res.data;
      },
    },
  );

  readonly data = computed(() => this._res.value() ?? this._stale() ?? null);
  readonly loading = this._res.isLoading;
  readonly error = computed<WeatherApiError | null>(() => {
    const e = this._res.error();
    if (e == null) return null;
    const err = e as unknown as Record<string, unknown>;
    return {
      message: typeof err['message'] === 'string' ? err['message'] : String(e),
      status: typeof err['status'] === 'number' ? err['status'] : 500,
    };
  });
  readonly lastUpdated = this._lastUpdated.asReadonly();
  readonly hasData = computed(() => this._res.value() != null);

  constructor() {
    effect(() => {
      const val = this._res.value();
      if (val != null) {
        this._lastUpdated.set(new Date());
        this._stale.set(null);
        const key = this._city() ||
          (this._coords() ? `${this._coords()!.lat},${this._coords()!.lon}` : '');
        if (key) this._writeCache(key.toLowerCase(), val);
      }
    });
  }

  loadByCity(city: string, opts: { force?: boolean } = {}): void {
    const trimmed = city.trim();
    if (!trimmed) return;
    this._stale.set(this._readCache(trimmed.toLowerCase()));
    this._coords.set(null);
    if (opts.force && trimmed.toLowerCase() === this._city().toLowerCase()) {
      this._res.reload();
    } else {
      this._city.set(trimmed);
    }
  }

  loadByCoords(lat: number, lon: number): void {
    this._stale.set(this._readCache(`${lat},${lon}`));
    this._city.set('');
    this._coords.set({ lat, lon });
  }

  clearCache(): void {
    this._stale.set(null);
  }

  private _readCache(key: string): WeatherDashboardData | null {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw) as { ts: number; data: WeatherDashboardData };
      if (Date.now() - ts > CACHE_TTL_MS) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private _writeCache(key: string, data: WeatherDashboardData): void {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // localStorage full or unavailable — silently skip
    }
  }
}
