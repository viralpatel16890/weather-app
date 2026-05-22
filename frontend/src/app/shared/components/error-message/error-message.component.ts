
import { Component, input, output } from '@angular/core';

/** Friendly inline error block with optional retry button. */
@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [],
  template: `
    <div class="err" role="alert" aria-live="assertive">
      <div class="err__icon" aria-hidden="true">⚠️</div>
      <div class="err__body">
        <div class="err__title">{{ title() }}</div>
        <div class="err__msg">{{ message() }}</div>
      </div>
      @if (retryable()) {
        <button
          type="button"
          class="err__btn"
          (click)="retry.emit()"
          >
          Try again
        </button>
      }
    </div>
    `,
  styles: [
    `
      :host { display: block; }
      .err {
        display: flex; align-items: center; gap: 14px;
        padding: 18px 20px; border-radius: 16px;
        background: var(--danger-soft);
        border: 1px solid var(--danger);
        color: var(--text-strong);
      }
      .err__icon { font-size: 1.6rem; }
      .err__body { flex: 1; }
      .err__title { font-weight: 600; }
      .err__msg { font-size: 0.9rem; color: var(--text-muted); }
      .err__btn {
        background: var(--danger); color: #fff; border: 0;
        border-radius: 999px; padding: 8px 14px; cursor: pointer;
        font-weight: 600;
      }
      .err__btn:hover { filter: brightness(1.05); }
    `,
  ],
})
export class ErrorMessageComponent {
  readonly title = input('Something went wrong');
  readonly message = input('Please try again in a moment.');
  readonly retryable = input(true);
  readonly retry = output<void>();
}
