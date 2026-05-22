import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [SettingsService] });
  });

  it('defaults to °C light theme', () => {
    const s = TestBed.inject(SettingsService);
    expect(s.unit()).toBe('C');
    expect(s.theme()).toBe('light');
    expect(s.unitLabel()).toBe('°C');
  });

  it('toggleUnit flips C ↔ F', () => {
    const s = TestBed.inject(SettingsService);
    s.toggleUnit();
    expect(s.unit()).toBe('F');
    s.toggleUnit();
    expect(s.unit()).toBe('C');
  });

  it('persists to localStorage', () => {
    const s = TestBed.inject(SettingsService);
    s.setUnit('F');
    s.toggleTheme();
    s.setLastCity('Tokyo');
    // Effect runs synchronously in tests; flush microtasks via JSON read.
    const raw = JSON.parse(localStorage.getItem('weather-dashboard.settings')!);
    expect(raw.unit).toBe('F');
    expect(raw.theme).toBe('dark');
    expect(raw.lastCity).toBe('Tokyo');
  });

  it('rehydrates from localStorage', () => {
    localStorage.setItem(
      'weather-dashboard.settings',
      JSON.stringify({ unit: 'F', theme: 'dark', lastCity: 'Berlin' }),
    );
    const s = TestBed.inject(SettingsService);
    expect(s.unit()).toBe('F');
    expect(s.theme()).toBe('dark');
    expect(s.lastCity()).toBe('Berlin');
  });
});
