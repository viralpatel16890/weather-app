import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  WeatherApiError,
  WeatherDashboardData,
} from '../models/api-response.interface';

/**
 * Reactive weather data service backed by `httpResource`.
 *
 * Changing the city signal automatically triggers a fresh HTTP fetch.
 * Force-refresh calls `reload()` on the resource without changing the city.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly _city = signal('');
  private readonly _lastUpdated = signal<Date | null>(null);

  private readonly _res = httpResource<WeatherDashboardData>(
    () => {
      const city = this._city();
      if (!city) return undefined;
      return { url: `${this.baseUrl}/api/weather`, params: { city } };
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

  readonly data = computed(() => this._res.value() ?? null);
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
      if (this._res.value() != null) {
        this._lastUpdated.set(new Date());
      }
    });
  }

  loadByCity(city: string, opts: { force?: boolean } = {}): void {
    const trimmed = city.trim();
    if (!trimmed) return;
    if (opts.force && trimmed.toLowerCase() === this._city().toLowerCase()) {
      this._res.reload();
    } else {
      this._city.set(trimmed);
    }
  }

  clearCache(): void {
    // No-op: httpResource has no client-side cache; backend caches responses.
  }
}
