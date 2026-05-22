import { Routes } from '@angular/router';

/**
 * Lazy-loaded feature routes. The dashboard is intentionally code-split so
 * that future routes (compare cities, saved locations, etc.) don't bloat the
 * initial bundle.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './features/weather-dashboard/weather-dashboard.component'
      ).then((m) => m.WeatherDashboardComponent),
    title: 'Weather Dashboard',
  },
  { path: '**', redirectTo: '' },
];
