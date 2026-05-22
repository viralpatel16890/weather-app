import { Injectable } from '@angular/core';
import {
  DEFAULT_ICON,
  ICON_BY_CONDITION,
  ICON_BY_OWM_CODE,
} from '../constants/weather-icons.constants';

/** Resolves an emoji glyph from either an OWM icon code or a condition name. */
@Injectable({ providedIn: 'root' })
export class IconService {
  /**
   * @param icon  OpenWeather icon code (e.g. "10d"). Optional.
   * @param condition  Coarse condition string (e.g. "Rain"). Optional.
   */
  resolve(icon?: string | null, condition?: string | null): string {
    if (icon && ICON_BY_OWM_CODE[icon]) return ICON_BY_OWM_CODE[icon];
    if (condition && ICON_BY_CONDITION[condition]) {
      return ICON_BY_CONDITION[condition];
    }
    return DEFAULT_ICON;
  }
}
