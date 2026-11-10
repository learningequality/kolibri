import Vue from 'vue';
import { PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import { currentLanguage } from 'kolibri/utils/i18n';
import { getPicturePasswordIcons } from '../picturePassword';

jest.mock('kolibri/constants', () => ({
  PICTURE_PASSWORD_SET: {
    1: { name: 'tree', iconColorful: 'treeColorful', iconStandard: 'treeStandard' },
    2: { name: 'moon', iconColorful: 'moonColorful', iconStandard: 'moonStandard' },
    3: { name: 'bee', iconColorful: 'beeColorful', iconStandard: 'beeStandard' },
  },
}));

describe('getPicturePasswordIcons', () => {
  describe('with a valid picture_password string', () => {
    it('returns an ordered label-only descriptor per segment when iconStyle is omitted', () => {
      expect(getPicturePasswordIcons('1.2.3')).toEqual([
        { label: 'tree' },
        { label: 'moon' },
        { label: 'bee' },
      ]);
    });

    it('resolves iconName to the colorful token when iconStyle is "colorful"', () => {
      expect(getPicturePasswordIcons('1', PicturePasswordIconStyle.COLORFUL)).toEqual([
        { label: 'tree', iconName: 'treeColorful' },
      ]);
    });

    it('resolves iconName to the standard token when iconStyle is "standard"', () => {
      expect(getPicturePasswordIcons('2', PicturePasswordIconStyle.STANDARD)).toEqual([
        { label: 'moon', iconName: 'moonStandard' },
      ]);
    });

    it('filters out segments with unknown keys', () => {
      expect(getPicturePasswordIcons('1.99.2')).toEqual([{ label: 'tree' }, { label: 'moon' }]);
    });

    describe('in a non-English language', () => {
      beforeEach(() => {
        Vue.setLocale('es-es');
        Vue.registerMessages('es-es', {
          'PicturePasswordStrings.tree': 'árbol',
          'PicturePasswordStrings.moon': 'luna',
        });
      });

      afterEach(() => {
        Vue.setLocale(currentLanguage);
      });

      it('returns translated labels', () => {
        expect(getPicturePasswordIcons('1.2')).toEqual([{ label: 'árbol' }, { label: 'luna' }]);
      });
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
