
import { Component, input } from '@angular/core';

/**
 * Generic stat tile used in the dashboard's statistics grid.
 *
 * <app-stat-card label="Humidity" value="74%" icon="💧"></app-stat-card>
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [],
  template: `
    <div class="stat" role="group" [attr.aria-label]="label() + ': ' + value()">
      <div class="stat__icon" aria-hidden="true">{{ icon() }}</div>
      <div class="stat__body">
        <div class="stat__label">{{ label() }}</div>
        <div class="stat__value">{{ value() }}</div>
        @if (sublabel()) {
          <div class="stat__sub">{{ sublabel() }}</div>
        }
      </div>
    </div>
    `,
  styles: [
    `
      :host { display: block; }
      .stat {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
        transition: transform 0.18s cubic-bezier(0.4,0,0.2,1),
                    box-shadow 0.18s ease, border-color 0.18s ease;
        height: 100%;
      }
      .stat:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--accent);
      }
      .stat__icon {
        font-size: 1.3rem;
        background: var(--accent-soft);
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 11px;
        flex-shrink: 0;
      }
      .stat__body { min-width: 0; }
      .stat__label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;
                     text-transform: uppercase; color: var(--text-muted); }
      .stat__value { font-size: 1.05rem; font-weight: 800; color: var(--text-strong);
                     line-height: 1.25; white-space: nowrap; overflow: hidden;
                     text-overflow: ellipsis; }
      .stat__sub   { font-size: 0.68rem; color: var(--text-muted); margin-top: 1px; font-weight: 500; }
    `,
  ],
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input('📊');
  readonly sublabel = input<string | undefined>(undefined);
}
