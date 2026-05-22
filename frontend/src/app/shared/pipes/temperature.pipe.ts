import { Pipe, PipeTransform, inject } from '@angular/core';
import { SettingsService, TemperatureUnit } from '../../core/services/settings.service';

/**
 * Formats a Celsius value according to the user's current unit preference.
 *
 * Usage:
 *   {{ current.temperature | temp }}            → "31°"
 *   {{ current.temperature | temp:'long' }}     → "31°C"  (or °F)
 *   {{ current.temperature | temp:'long':'F' }} → force unit override
 *
 * The pipe is `pure: false` so it re-evaluates whenever the SettingsService
 * Signal changes. Angular's Signal-aware change detection keeps this cheap.
 */
@Pipe({ name: 'temp', standalone: true, pure: false })
export class TemperaturePipe implements PipeTransform {
  private readonly settings = inject(SettingsService);

  transform(
    valueC: number | null | undefined,
    style: 'short' | 'long' = 'short',
    overrideUnit?: TemperatureUnit,
  ): string {
    if (valueC === null || valueC === undefined || isNaN(valueC)) return '—';
    const unit = overrideUnit ?? this.settings.unit();
    const value = unit === 'C' ? valueC : valueC * 1.8 + 32;
    const rounded = Math.round(value);
    return style === 'long' ? `${rounded}°${unit}` : `${rounded}°`;
  }
}
