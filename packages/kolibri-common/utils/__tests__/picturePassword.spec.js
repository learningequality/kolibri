import { getPicturePasswordIcons } from '../picturePassword';

// The PICTURE_PASSWORD_SET JSON uses 1-based string keys:
// "1": bee, "2": star, "3": moon, "7": water, "12": bird
describe('getPicturePasswordIcons', () => {
  describe('with a valid picture_password string', () => {
    it('returns an ordered array of label objects for each position', () => {
      const result = getPicturePasswordIcons('3.7.12');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ label: 'moon' });
      expect(result[1]).toMatchObject({ label: 'water' });
      expect(result[2]).toMatchObject({ label: 'bird' });
    });

    it('does not include icon name properties when iconStyle is omitted', () => {
      const result = getPicturePasswordIcons('1');
      expect(result[0]).not.toHaveProperty('iconColorful');
      expect(result[0]).not.toHaveProperty('iconStandard');
    });

    it('includes iconColorful when iconStyle is "colorful"', () => {
      const result = getPicturePasswordIcons('1', 'colorful');
      expect(result[0]).toMatchObject({ label: 'bee', iconColorful: 'beeColorful' });
      expect(result[0]).not.toHaveProperty('iconStandard');
    });

    it('includes iconStandard when iconStyle is "standard"', () => {
      const result = getPicturePasswordIcons('2', 'standard');
      expect(result[0]).toMatchObject({ label: 'star', iconStandard: 'starStandard' });
      expect(result[0]).not.toHaveProperty('iconColorful');
    });

    it('returns a single-element array for a single-segment string', () => {
      const result = getPicturePasswordIcons('4');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('tree');
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
