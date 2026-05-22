# Weather Dashboard — Angular Frontend

Angular 20 standalone-component SPA. Talks to the Flask backend on
`http://localhost:5000`.

## Run

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

## Project layout

```
src/app/
├── core/
│   ├── services/{weather,icon,settings}.service.ts
│   ├── models/{weather,forecast,api-response}.interface.ts
│   └── constants/weather-icons.constants.ts
├── shared/
│   ├── components/
│   │   ├── weather-card/        # reusable forecast card
│   │   ├── stat-card/           # generic statistic tile
│   │   ├── search-box/          # accessible search
│   │   ├── loading-skeleton/    # shimmer placeholder
│   │   └── error-message/       # retry-able error banner
│   └── pipes/temperature.pipe.ts
└── features/weather-dashboard/  # lazy-loaded screen
    ├── weather-dashboard.component.{ts,html,scss}
    └── hourly-chart.component.ts
```

## State management

All state lives in **Signals** exposed by the `core/services` layer.
Components read them with `service.data()`, `service.loading()` etc., and
Angular re-renders only the views that depend on what changed.

| Concern             | Source of truth                |
|---------------------|--------------------------------|
| Dashboard payload   | `WeatherService.data`          |
| Loading / error     | `WeatherService.loading` / `error` |
| Unit & theme        | `SettingsService` (persisted)  |
| Last city           | `SettingsService.lastCity`     |

## Accessibility (WCAG 2.1 AA)

- `aria-label`s on every interactive control & card group
- Keyboard navigation: cards are `tabindex="0"`, focus outline visible
- `role="alert"` on error banner, `role="status"` on skeletons
- Color contrast ≥ 4.5:1 in both light and dark themes
- Honors `prefers-reduced-motion`

## Tests

```bash
npm test
```

The Jest suite covers the temperature pipe, icon service, settings service
and weather service (HTTP layer mocked).

## Build

```bash
npm run build      # outputs dist/weather-dashboard/
```
