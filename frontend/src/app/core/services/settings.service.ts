import { Injectable, computed, effect, signal } from '@angular/core';

export type TemperatureUnit = 'C' | 'F';
export type ThemeMode = 'light' | 'dark';

interface PersistedSettings {
  unit: TemperatureUnit;
  theme: ThemeMode;
  lastCity: string;
}

const STORAGE_KEY = 'weather-dashboard.settings';

const DEFAULTS: PersistedSettings = {
  unit: 'C',
  theme: 'light',
  lastCity: 'Mumbai',
};

/**
 * Holds user preferences as Signals and writes through to `localStorage`.
 * Apps that need SSR should guard `localStorage` access; for this
 * browser-only build we keep it simple.
 */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly _unit = signal<TemperatureUnit>(DEFAULTS.unit);
  private readonly _theme = signal<ThemeMode>(DEFAULTS.theme);
  private readonly _lastCity = signal<string>(DEFAULTS.lastCity);

  readonly unit = this._unit.asReadonly();
  readonly theme = this._theme.asReadonly();
  readonly lastCity = this._lastCity.asReadonly();

  readonly unitLabel = computed(() => (this._unit() === 'C' ? '°C' : '°F'));

  constructor() {
    this.hydrate();

    // Persist on every change.
    effect(() => {
      const snapshot: PersistedSettings = {
        unit: this._unit(),
        theme: this._theme(),
        lastCity: this._lastCity(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        /* storage may be disabled — ignore */
      }
    });

    // Apply theme to <html>.
    effect(() => {
      const theme = this._theme();
      document.documentElement.dataset['theme'] = theme;
    });
  }

  toggleUnit(): void {
    this._unit.update((u) => (u === 'C' ? 'F' : 'C'));
  }

  setUnit(unit: TemperatureUnit): void {
    this._unit.set(unit);
  }

  toggleTheme(): void {
    this._theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setLastCity(city: string): void {
    const trimmed = city.trim();
    if (trimmed) this._lastCity.set(trimmed);
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
      if (parsed.unit === 'C' || parsed.unit === 'F') this._unit.set(parsed.unit);
      if (parsed.theme === 'light' || parsed.theme === 'dark') {
        this._theme.set(parsed.theme);
      }
      if (typeof parsed.lastCity === 'string' && parsed.lastCity) {
        this._lastCity.set(parsed.lastCity);
      }
    } catch {
      /* corrupted JSON — fall back to defaults */
    }
  }
}
