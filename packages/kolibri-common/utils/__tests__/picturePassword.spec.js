import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
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
    it('returns an ordered label-only descriptor per segment when iconStyle is omitted', () => {
      expect(getPicturePasswordIcons('1.2.3')).toEqual([
        { label: 'alpha' },
        { label: 'bravo' },
        { label: 'charlie' },
      ]);
    });

    it('resolves iconName to the colorful token when iconStyle is "colorful"', () => {
      expect(getPicturePasswordIcons('1', PicturePasswordIconStyle.COLORFUL)).toEqual([
        { label: 'alpha', iconName: 'alphaColorful' },
      ]);
    });

    it('resolves iconName to the standard token when iconStyle is "standard"', () => {
      expect(getPicturePasswordIcons('2', PicturePasswordIconStyle.STANDARD)).toEqual([
        { label: 'bravo', iconName: 'bravoStandard' },
      ]);
    });

    it('filters out segments with unknown keys', () => {
      expect(getPicturePasswordIcons('1.99.2')).toEqual([{ label: 'alpha' }, { label: 'bravo' }]);
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
