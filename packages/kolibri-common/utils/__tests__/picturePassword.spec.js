import { getPicturePasswordIcons } from '../picturePassword';

jest.mock('kolibri/constants', () => ({
  PICTURE_PASSWORD_SET: {
    1: { name: 'alpha', iconColorful: 'alphaColorful', iconStandard: 'alphaStandard' },
    2: { name: 'bravo', iconColorful: 'bravoColorful', iconStandard: 'bravoStandard' },
    3: { name: 'charlie', iconColorful: 'charlieColorful', iconStandard: 'charlieStandard' },
  },
}));

describe('getPicturePasswordIcons', () => {
  describe('with a valid picture_password string', () => {
    it('returns an ordered array of label objects for each dot-separated segment', () => {
      const result = getPicturePasswordIcons('1.2.3');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ label: 'alpha' });
      expect(result[1]).toMatchObject({ label: 'bravo' });
      expect(result[2]).toMatchObject({ label: 'charlie' });
    });

    it('does not include icon name properties when iconStyle is omitted', () => {
      const result = getPicturePasswordIcons('1');
      expect(result[0]).not.toHaveProperty('iconColorful');
      expect(result[0]).not.toHaveProperty('iconStandard');
    });

    it('includes iconColorful when iconStyle is "colorful"', () => {
      const result = getPicturePasswordIcons('1', 'colorful');
      expect(result[0]).toMatchObject({
        label: 'alpha',
        iconColorful: 'alphaColorful',
        iconName: 'alphaColorful',
      });
      expect(result[0]).not.toHaveProperty('iconStandard');
    });

    it('includes iconStandard when iconStyle is "standard"', () => {
      const result = getPicturePasswordIcons('2', 'standard');
      expect(result[0]).toMatchObject({
        label: 'bravo',
        iconStandard: 'bravoStandard',
        iconName: 'bravoStandard',
      });
      expect(result[0]).not.toHaveProperty('iconColorful');
    });

    it('returns a single-element array for a single-segment string', () => {
      const result = getPicturePasswordIcons('3');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('charlie');
    });

    it('filters out segments with unknown keys', () => {
      const result = getPicturePasswordIcons('1.99.2');
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ label: 'alpha' });
      expect(result[1]).toMatchObject({ label: 'bravo' });
    });
  });

  describe('with a null or falsy input', () => {
    it('returns an empty array for null', () => {
      expect(getPicturePasswordIcons(null)).toEqual([]);
    });

    it('returns an empty array for undefined', () => {
      expect(getPicturePasswordIcons(undefined)).toEqual([]);
    });

    it('returns an empty array for an empty string', () => {
      expect(getPicturePasswordIcons('')).toEqual([]);
    });
  });
});
