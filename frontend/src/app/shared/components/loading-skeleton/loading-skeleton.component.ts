
import { Component, input } from '@angular/core';

/** Generic shimmering block used as a placeholder while data loads. */
@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [],
  template: `
    <div
      class="skeleton"
      role="status"
      aria-live="polite"
      aria-label="Loading"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius()"
    ></div>
  `,
  styles: [
    `
      :host { display: inline-block; width: 100%; }
      .skeleton {
        background: linear-gradient(
          90deg,
          var(--skeleton-base) 0%,
          var(--skeleton-shine) 50%,
          var(--skeleton-base) 100%
        );
        background-size: 200% 100%;
        animation: shimmer 1.4s linear infinite;
      }
      @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('8px');
}
