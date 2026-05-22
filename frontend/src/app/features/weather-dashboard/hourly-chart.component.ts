
import { Component, computed, inject, input, signal } from '@angular/core';
import { SettingsService } from '../../core/services/settings.service';
import { HourlyForecast } from '../../core/models/forecast.interface';

/** Lightweight SVG line chart for the next 24 hours. Zero deps. */
@Component({
  selector: 'app-hourly-chart',
  standalone: true,
  imports: [],
  template: `
    <div
      class="hourly"
      role="img"
      [attr.aria-label]="ariaLabel()"
      >
      <svg
        [attr.viewBox]="'0 0 ' + width() + ' ' + height"
        preserveAspectRatio="none"
        class="hourly__svg"
        >
        <defs>
          <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.45" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>

        @if (areaPath()) {
          <path
            [attr.d]="areaPath()"
            fill="url(#hourlyGradient)"
            />
        }
        @if (linePath()) {
          <path
            [attr.d]="linePath()"
            fill="none"
            stroke="var(--accent)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            />
        }

        <g class="hourly__points">
          @for (p of points(); track p; let i = $index) {
            <circle
              [attr.cx]="p.x"
              [attr.cy]="p.y"
              r="3"
              fill="var(--accent)"
              />
          }
        </g>
      </svg>

      <ul class="hourly__labels" aria-hidden="true">
        @for (p of points(); track p; let i = $index) {
          <li>
            @if (i % 3 === 0) {
              <span class="hourly__hour">{{ p.label }}</span>
              <span class="hourly__temp">{{ p.tempDisplay }}</span>
            }
          </li>
        }
      </ul>
    </div>
    `,
  styles: [
    `
      :host { display: block; width: 100%; }
      .hourly {
        width: 100%;
        position: relative;
      }
      .hourly__svg {
        width: 100%; height: 90px; display: block;
        overflow: visible;
      }
      @media (min-width: 480px) { .hourly__svg { height: 110px; } }
      .hourly__labels {
        list-style: none; padding: 0; margin: 14px 0 0 0;
        display: grid;
        grid-template-columns: repeat(24, 1fr);
        gap: 0;
        font-size: 0.72rem; color: var(--text-muted);
        font-weight: 500;
      }
      @media (min-width: 480px) { .hourly__labels { font-size: 0.8rem; margin-top: 16px; } }
      .hourly__labels li {
        display: flex; flex-direction: column; align-items: center;
        text-align: center;
      }
      /* Mobile: hide every-other visible label (show only i=0,6,12,18 instead of 0,3,6,...,21) */
      @media (max-width: 479px) {
        .hourly__labels li:nth-child(6n+4) { visibility: hidden; }
      }
      .hourly__temp { color: var(--text-strong); font-weight: 700; margin-top: 2px; }
      .hourly__hour { opacity: 0.8; }
    `,
  ],
})
export class HourlyChartComponent {
  private readonly settings = inject(SettingsService);

  readonly data = input<ReadonlyArray<HourlyForecast>>([]);

  readonly width = signal(720);
  readonly height = 100;

  readonly points = computed(() => {
    const data = this.data();
    if (!data.length) return [];
    const w = this.width();
    const h = this.height;
    const padX = 10;
    const padY = 16;
    const temps = data.map((d) => d.temperature);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;
    const unit = this.settings.unit();

    return data.map((d, i) => {
      const x = padX + (i * (w - padX * 2)) / (data.length - 1);
      const y = h - padY - ((d.temperature - min) / range) * (h - padY * 2);
      const display =
        unit === 'C'
          ? `${Math.round(d.temperature)}°`
          : `${Math.round(d.temperature * 1.8 + 32)}°`;
      const date = new Date(d.time);
      const label = date.toLocaleTimeString([], { hour: 'numeric' });
      return { x, y, label, tempDisplay: display };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L${last.x.toFixed(1)},${this.height} L${first.x.toFixed(1)},${this.height} Z`;
  });

  readonly ariaLabel = computed(() => {
    const d = this.data();
    if (!d.length) return 'Hourly forecast unavailable';
    const first = d[0];
    const last = d[d.length - 1];
    return `Hourly temperature forecast from ${first.time} to ${last.time}.`;
  });
}
