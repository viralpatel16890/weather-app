import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WeatherService } from './weather.service';
import { ApiResponse, WeatherDashboardData } from '../models/api-response.interface';
import { environment } from '../../../environments/environment';

const FAKE: WeatherDashboardData = {
  location: 'Mumbai, IN',
  coordinates: { lat: 19.07, lon: 72.87 },
  current: {
    temperature: 31, feelsLike: 36, condition: 'Clouds', description: 'cloudy',
    icon: '03d', humidity: 70, windSpeed: 4.2, pressure: 1010, visibility: 6000,
    observedAt: '2026-05-13T12:00:00Z',
  },
  forecast: [],
  hourly: [],
  airQuality: null,
};

describe('WeatherService', () => {
  let svc: WeatherService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    });
    svc = TestBed.inject(WeatherService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts empty', () => {
    expect(svc.data()).toBeNull();
    expect(svc.loading()).toBe(false);
    expect(svc.error()).toBeNull();
  });

  it('loads, caches and exposes via signals', () => {
    svc.loadByCity('Mumbai');
    expect(svc.loading()).toBe(true);

    const req = http.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/api/weather`,
    );
    expect(req.request.params.get('city')).toBe('Mumbai');

    const body: ApiResponse<WeatherDashboardData> = {
      success: true, data: FAKE, timestamp: '2026-05-13T12:00:00Z',
    };
    req.flush(body);

    expect(svc.loading()).toBe(false);
    expect(svc.data()?.location).toBe('Mumbai, IN');
    expect(svc.lastUpdated()).toBeInstanceOf(Date);

    // Second call within TTL should NOT hit the network.
    svc.loadByCity('Mumbai');
    http.expectNone(`${environment.apiBaseUrl}/api/weather`);
  });

  it('exposes errors via signal', () => {
    svc.loadByCity('boom');
    const req = http.expectOne(`${environment.apiBaseUrl}/api/weather?city=boom`);
    req.flush(
      { success: false, error: { message: 'nope', status: 502 } },
      { status: 502, statusText: 'Bad Gateway' },
    );
    // Retries fire on transient failure (×2 more).
    http.expectOne(`${environment.apiBaseUrl}/api/weather?city=boom`).flush(
      { success: false, error: { message: 'nope', status: 502 } },
      { status: 502, statusText: 'Bad Gateway' },
    );
    http.expectOne(`${environment.apiBaseUrl}/api/weather?city=boom`).flush(
      { success: false, error: { message: 'nope', status: 502 } },
      { status: 502, statusText: 'Bad Gateway' },
    );

    expect(svc.loading()).toBe(false);
    expect(svc.error()?.status).toBe(502);
    expect(svc.error()?.message).toBe('nope');
  });

  it('ignores empty city', () => {
    svc.loadByCity('   ');
    http.expectNone(() => true);
  });
});
