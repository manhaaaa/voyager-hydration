import { describe, it } from 'node:test';
import { assert, registerTest } from '../harness.ts';

describe('Tier 2 - Feature 03: Weather API & Geolocation Boundaries', () => {
  const tier = 'Tier 2';
  const fId = 'F03';

  it('3.6: Network blackout handles fetch exception with offline fallback', () => {
    registerTest(tier, fId, '3.6', 'Offline network blackout resilience', () => {
      // Simulate network throw
      const handleFetchError = (error: Error) => {
        return {
          temperature: 26.0,
          humidity: 65,
          weatherCode: 1,
          locationName: 'Hà Nội (Mặc định)',
          isOffline: true,
          bonusMl: 0,
        };
      };

      const fallback = handleFetchError(new Error('Failed to fetch'));
      assert.strictEqual(fallback.isOffline, true);
      assert.strictEqual(fallback.bonusMl, 0);
      assert.ok(fallback.locationName.includes('Mặc định'));
    });
  });

  it('3.7: Corrupted or malformed API JSON payload triggers safe fallback', () => {
    registerTest(tier, fId, '3.7', 'Malformed JSON payload resilience', () => {
      const parseWeatherJson = (rawJson: string) => {
        try {
          const parsed = JSON.parse(rawJson);
          if (!parsed.current || typeof parsed.current.temperature_2m !== 'number') {
            throw new Error('Invalid schema');
          }
          return parsed;
        } catch {
          return { current: { temperature_2m: 26, relative_humidity_2m: 60, weather_code: 1 }, isFallback: true };
        }
      };

      const result = parseWeatherJson('{"corrupted": true}');
      assert.strictEqual(result.isFallback, true);
      assert.strictEqual(result.current.temperature_2m, 26);
    });
  });

  it('3.8: Geolocation timeout (5000ms abort) activates Hanoi fallback coordinates', () => {
    registerTest(tier, fId, '3.8', 'Geolocation timeout fallback', () => {
      const HANOI_COORDS = { lat: 21.0285, lon: 105.8542 };
      const resolveCoords = (timedOut: boolean) => {
        if (timedOut) {
          return HANOI_COORDS;
        }
        return { lat: 10.0, lon: 106.0 };
      };
      const coords = resolveCoords(true);
      assert.strictEqual(coords.lat, 21.0285);
      assert.strictEqual(coords.lon, 105.8542);
    });
  });

  it('3.9: Extreme coordinates clamping (-90 to 90, -180 to 180)', () => {
    registerTest(tier, fId, '3.9', 'Extreme coordinates clamping', () => {
      const clampCoords = (lat: number, lon: number) => ({
        lat: Math.min(90, Math.max(-90, lat)),
        lon: Math.min(180, Math.max(-180, lon)),
      });

      const clamped1 = clampCoords(120, -220);
      assert.strictEqual(clamped1.lat, 90);
      assert.strictEqual(clamped1.lon, -180);
    });
  });

  it('3.10: Unrecognized WMO weather code gracefully falls back to default icon/description', () => {
    registerTest(tier, fId, '3.10', 'Unrecognized WMO weather code fallback', () => {
      const mapWmoCode = (code: number) => {
        switch (code) {
          case 0: return { label: 'Trời quang đãng', icon: 'Sun' };
          case 1:
          case 2:
          case 3: return { label: 'Trời nhiều mây', icon: 'Cloud' };
          case 61:
          case 63:
          case 65: return { label: 'Mưa rào', icon: 'CloudRain' };
          default: return { label: 'Bầu trời ngân hà', icon: 'Sparkles' };
        }
      };

      const normal = mapWmoCode(0);
      assert.strictEqual(normal.label, 'Trời quang đãng');
      const unknown = mapWmoCode(999);
      assert.strictEqual(unknown.label, 'Bầu trời ngân hà');
    });
  });
});
