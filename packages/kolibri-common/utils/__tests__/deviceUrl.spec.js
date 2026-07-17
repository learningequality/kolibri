import {
  slugifyDeviceName,
  deviceLocalUrl,
  baseDeviceUrl,
  MAX_DEVICE_NAME_LABEL_LENGTH,
} from '../deviceUrl';

describe('slugifyDeviceName', () => {
  it('drops the apostrophe and space and lowercases', () => {
    expect(slugifyDeviceName("Tony's Laptop")).toBe('tonyslaptop');
  });

  it('keeps digits and hyphens', () => {
    expect(slugifyDeviceName('MyDevice-01')).toBe('mydevice-01');
  });

  it('strips non-ASCII characters to empty', () => {
    expect(slugifyDeviceName('日本語')).toBe('');
  });

  it('returns empty for a whitespace-only name', () => {
    expect(slugifyDeviceName('   ')).toBe('');
  });

  it('returns empty for an empty string', () => {
    expect(slugifyDeviceName('')).toBe('');
  });

  it('is null-safe for undefined', () => {
    expect(slugifyDeviceName(undefined)).toBe('');
  });

  it('truncates to MAX_DEVICE_NAME_LABEL_LENGTH characters', () => {
    expect(slugifyDeviceName('a'.repeat(40))).toHaveLength(MAX_DEVICE_NAME_LABEL_LENGTH);
    expect(MAX_DEVICE_NAME_LABEL_LENGTH).toBe(32);
  });
});

describe('deviceLocalUrl', () => {
  it('builds the http .local URL with the served port', () => {
    expect(deviceLocalUrl("Tony's Laptop", '8080')).toBe('http://tonyslaptop.local:8080');
  });

  it('omits the port suffix when no port is supplied', () => {
    expect(deviceLocalUrl('Lab1', '')).toBe('http://lab1.local');
  });

  it('returns empty when the name slugifies to empty', () => {
    expect(deviceLocalUrl('日本語', '8080')).toBe('');
  });
});

describe('baseDeviceUrl', () => {
  it('includes the served port in the kolibri.local URL', () => {
    expect(baseDeviceUrl('8080')).toBe('http://kolibri.local:8080');
  });

  it('omits the port suffix on the default port', () => {
    expect(baseDeviceUrl('')).toBe('http://kolibri.local');
  });
});
