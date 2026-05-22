import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';

import { IconService } from '../../../core/services/icon.service';
import { TemperaturePipe } from '../../pipes/temperature.pipe';

/**
 * Reusable card for a single day in the forecast strip.
 *
 * Inputs are intentionally primitive — the component does not depend on the
 * forecast model. This keeps it portable across screens.
 */
@Component({
  selector: 'app-weather-card',
  standalone: true,
  imports: [DatePipe, TemperaturePipe],
  templateUrl: './weather-card.component.html',
  styleUrl: './weather-card.component.scss',
})
export class WeatherCardComponent {
  readonly day = input.required<string>();
  readonly date = input.required<string>();
  readonly temperatureHigh = input.required<number>();
  readonly temperatureLow = input.required<number>();
  readonly condition = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly precipitationChance = input(0);
  readonly isToday = input(false);
  readonly iconOverride = input<string | null>(null);

  private readonly iconService = inject(IconService);

  readonly resolvedIcon = computed(
    () =>
      this.iconOverride() ?? this.iconService.resolve(this.icon(), this.condition()),
  );

  readonly ariaLabel = computed(() => {
    const today = this.isToday() ? 'Today, ' : '';
    return `${today}${this.day()} ${this.date()}: ${this.condition()}, ` +
      `high ${this.temperatureHigh()} degrees, low ${this.temperatureLow()} degrees, ` +
      `${this.precipitationChance()}% chance of precipitation`;
  });
}
