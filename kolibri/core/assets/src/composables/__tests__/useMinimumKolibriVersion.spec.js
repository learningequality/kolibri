import useMinimumKolibriVersion from '../useMinimumKolibriVersion';

describe(`useMinimumKolibriVersion`, () => {
  describe(`returns isMinimumKolibriVersion function defaulting to 0.15+`, () => {
    const { isMinimumKolibriVersion } = useMinimumKolibriVersion();

    it(`lower version is detected, with 0.15.0 as default`, () => {
      expect(isMinimumKolibriVersion('0.14.99')).toBe(false);
    });

    it(`same version is detected, with 0.15.0 as default`, () => {
      expect(isMinimumKolibriVersion('0.15.0')).toBe(true);
    });
  });

  describe(`returns isMinimumKolibriVersion function for custom version`, () => {
    const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16, 0);

    it(`lower version is detected, without default`, () => {
      expect(isMinimumKolibriVersion('0.15.4')).toBe(false);
    });

    it(`same version is detected, without default`, () => {
      expect(isMinimumKolibriVersion('0.16.0')).toBe(true);
    });

    it(`higher version is detected, without default`, () => {
      expect(isMinimumKolibriVersion('0.16.1')).toBe(true);
    });

    it(`check beta versions work when betas are included`, () => {
      expect(isMinimumKolibriVersion('0.16.0-b4')).toBe(false);
    });

    it(`check beta versions work fine with upper values`, () => {
      expect(isMinimumKolibriVersion('0.16.1-b4')).toBe(true);
    });
  });

  it(`check beta versions work when betas are included`, () => {
    const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16);
    expect(isMinimumKolibriVersion('0.16.0-b4')).toBe(true);
  });

  it(`check beta versions work fine with equal values`, () => {
    const { isMinimumKolibriVersion } = useMinimumKolibriVersion(0, 16, 1);
    expect(isMinimumKolibriVersion('0.16.1-b4')).toBe(false);
  });
});
