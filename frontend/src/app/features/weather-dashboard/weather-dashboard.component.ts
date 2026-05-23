import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { IconService } from '../../core/services/icon.service';
import { SettingsService } from '../../core/services/settings.service';
import { WeatherService } from '../../core/services/weather.service';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton/loading-skeleton.component';
import { SearchBoxComponent } from '../../shared/components/search-box/search-box.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { WeatherCardComponent } from '../../shared/components/weather-card/weather-card.component';
import { TemperaturePipe } from '../../shared/pipes/temperature.pipe';
import { HourlyChartComponent } from './hourly-chart.component';

const AUTO_REFRESH_MS = 30 * 60 * 1000;

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [
    SearchBoxComponent,
    WeatherCardComponent,
    StatCardComponent,
    LoadingSkeletonComponent,
    ErrorMessageComponent,
    HourlyChartComponent,
    TemperaturePipe,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './weather-dashboard.component.html',
  styleUrl: './weather-dashboard.component.scss',
})
export class WeatherDashboardComponent implements OnInit {
  protected readonly weather = inject(WeatherService);
  protected readonly settings = inject(SettingsService);
  protected readonly icons = inject(IconService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly data = this.weather.data;
  protected readonly loading = this.weather.loading;
  protected readonly error = this.weather.error;
  protected readonly lastUpdated = this.weather.lastUpdated;

  protected readonly currentIcon = computed(() => {
    const c = this.data()?.current;
    return c ? this.icons.resolve(c.icon, c.condition) : '';
  });

  protected readonly aqiClass = computed(() => {
    const aqi = this.data()?.airQuality?.aqi;
    if (!aqi) return '';
    return ['', 'good', 'fair', 'moderate', 'poor', 'very-poor'][aqi] ?? '';
  });

  protected readonly popularCities = [
    { name: 'New York',    emoji: '🗽' },
    { name: 'London',      emoji: '🎡' },
    { name: 'Tokyo',       emoji: '⛩️' },
    { name: 'Paris',       emoji: '🗼' },
    { name: 'Dubai',       emoji: '🏙️' },
    { name: 'Sydney',      emoji: '🦘' },
    { name: 'Mumbai',      emoji: '🌊' },
    { name: 'Singapore',   emoji: '🦁' },
    { name: 'Toronto',     emoji: '🍁' },
    { name: 'Los Angeles', emoji: '🌴' },
  ];

  ngOnInit(): void {
    this.detectAndLoad();
    interval(AUTO_REFRESH_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  protected onSearch(city: string): void {
    this.settings.setLastCity(city);
    this.weather.loadByCity(city, { force: true });
  }

  protected selectCity(city: string): void {
    this.settings.setLastCity(city);
    this.weather.loadByCity(city, { force: true });
  }

  protected refresh(): void {
    this.weather.loadByCity(this.settings.lastCity(), { force: true });
  }

  protected toggleUnit(): void { this.settings.toggleUnit(); }
  protected toggleTheme(): void { this.settings.toggleTheme(); }

  private detectAndLoad(): void {
    const fallback = () => this.weather.loadByCity(this.settings.lastCity());
    if (!('geolocation' in navigator)) {
      fallback();
      return;
    }
    let resolved = false;
    this.destroyRef.onDestroy(() => { resolved = true; });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (resolved) return;
        resolved = true;
        this.weather.loadByCoords(coords.latitude, coords.longitude);
      },
      () => {
        if (resolved) return;
        resolved = true;
        fallback();
      },
      { timeout: 4000, maximumAge: 600_000 },
    );
  }

  protected formatTime(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected trackByDate = (_: number, item: { date: string }) => item.date;
}
