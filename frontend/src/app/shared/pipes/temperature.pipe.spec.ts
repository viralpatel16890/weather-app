import { TestBed } from '@angular/core/testing';
import { TemperaturePipe } from './temperature.pipe';
import { SettingsService } from '../../core/services/settings.service';

describe('TemperaturePipe', () => {
  let pipe: TemperaturePipe;
  let settings: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TemperaturePipe, SettingsService] });
    pipe = TestBed.inject(TemperaturePipe);
    settings = TestBed.inject(SettingsService);
    settings.setUnit('C');
  });

  it('returns em-dash for nullish input', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(undefined)).toBe('—');
    expect(pipe.transform(NaN)).toBe('—');
  });

  it('formats °C correctly', () => {
    expect(pipe.transform(31.4)).toBe('31°');
    expect(pipe.transform(31.4, 'long')).toBe('31°C');
  });

  it('converts to °F when unit is F', () => {
    settings.setUnit('F');
    expect(pipe.transform(0, 'long')).toBe('32°F');
    expect(pipe.transform(100, 'long')).toBe('212°F');
  });

  it('respects override unit', () => {
    settings.setUnit('C');
    expect(pipe.transform(0, 'long', 'F')).toBe('32°F');
  });
});
