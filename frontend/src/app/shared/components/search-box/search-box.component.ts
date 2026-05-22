
import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Accessible city search box. Emits `search` on submit. */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form
      class="search"
      role="search"
      (ngSubmit)="onSubmit()"
      autocomplete="off"
    >
      <label class="search__icon" for="search-input" aria-label="Search">🔎</label>
      <input
        id="search-input"
        class="search__input"
        type="text"
        name="q"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [(ngModel)]="value"
        [attr.aria-busy]="disabled() ? 'true' : null"
      />
      <button
        type="submit"
        class="search__btn"
        [disabled]="disabled() || !value().trim()"
        aria-label="Search city"
      >
        Search
      </button>
    </form>
  `,
  styles: [
    `
      :host { display: block; width: 100%; max-width: 460px; flex: 1 1 auto; min-width: 0; }
      .search {
        display: flex; align-items: center; gap: 12px;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 6px 6px 6px 16px;
        box-shadow: var(--shadow-sm);
        transition: all 0.2s ease;
      }
      .search:focus-within {
        border-color: var(--accent);
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }
      .search__icon { font-size: 1.25rem; opacity: 0.7; }
      .search__input {
        flex: 1; border: 0; outline: 0; background: transparent;
        font-size: 1rem; color: var(--text-strong); padding: 10px 0;
        font-weight: 500;
      }
      .search__input::placeholder { color: var(--text-muted); }
      .search__btn {
        border: 0; border-radius: 12px; padding: 10px 24px;
        background: var(--accent); color: #fff; font-weight: 700;
        cursor: pointer; transition: all 0.2s ease;
        box-shadow: 0 4px 6px -1px rgba(var(--accent), 0.2);
      }
      .search__btn:hover:not(:disabled) {
        background: var(--accent-strong);
        box-shadow: 0 10px 15px -3px rgba(var(--accent), 0.3);
      }
      .search__btn:active:not(:disabled) { transform: scale(0.96); }
      .search__btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
  ],
})
export class SearchBoxComponent {
  readonly placeholder = input('Search any city…');
  readonly disabled = input(false);
  readonly initial = input('');
  readonly search = output<string>();

  protected readonly value = signal<string>('');

  constructor() {
    effect(() => {
      const v = this.initial();
      if (v) this.value.set(v);
    });
  }

  onSubmit(): void {
    const v = this.value().trim();
    if (v) this.search.emit(v);
  }
}
