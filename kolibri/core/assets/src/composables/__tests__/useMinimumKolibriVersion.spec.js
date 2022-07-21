import useMinimumKolibriVersion from '../useMinimumKolibriVersion';

const { isMinimumKolibriVersion } = useMinimumKolibriVersion();

describe(`useMinimumKolibriVersion`, () => {
  describe(`isMinimumKolibriVersion computed function`, () => {
    it(`lower version is detected, with 0.15.0 as default`, () => {
      expect(isMinimumKolibriVersion.value('0.14.99')).toBe(false);
    });

    it(`same version is detected, with 0.15.0 as default`, () => {
      expect(isMinimumKolibriVersion.value('0.15.0')).toBe(true);
    });

    it(`lower version is detected, without default`, () => {
      expect(isMinimumKolibriVersion.value('0.15.4', 0, 16, 0)).toBe(false);
    });

    it(`same version is detected, without default`, () => {
      expect(isMinimumKolibriVersion.value('0.16.0', 0, 16, 0)).toBe(true);
    });

    it(`higher version is detected, without default`, () => {
      expect(isMinimumKolibriVersion.value('0.16.1', 0, 16, 0)).toBe(true);
    });

    it(`check beta versions work fine with equal values`, () => {
      expect(isMinimumKolibriVersion.value('0.16.1-b4', 0, 16, 1)).toBe(false);
    });
    it(`check beta versions work when betas are included`, () => {
      expect(isMinimumKolibriVersion.value('0.16.0-b4', 0, 16)).toBe(true);
    });

    it(`check beta versions work fine with upper values`, () => {
      expect(isMinimumKolibriVersion.value('0.16.1-b4', 0, 16, 0)).toBe(true);
    });
  });
});
