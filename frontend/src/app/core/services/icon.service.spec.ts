import { IconService } from './icon.service';

describe('IconService', () => {
  const svc = new IconService();

  it('resolves by OWM icon code', () => {
    expect(svc.resolve('01d')).toBe('☀️');
    expect(svc.resolve('11d')).toBe('⛈️');
  });

  it('falls back to condition', () => {
    expect(svc.resolve(null, 'Snow')).toBe('❄️');
    expect(svc.resolve(undefined, 'Tornado')).toBe('🌪️');
  });

  it('falls back to default for unknown inputs', () => {
    expect(svc.resolve('zzz', 'Spaghetti')).toBe('🌡️');
    expect(svc.resolve(null, null)).toBe('🌡️');
  });
});
