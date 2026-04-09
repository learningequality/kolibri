import { PICTURE_PASSWORD_SET } from 'kolibri/constants';
import { PicturePasswordIconStyle } from '../constants/Auth';

/**
 * Resolves a `picture_password` string into an ordered array of icon descriptor objects.
 *
 * @param {string|null} picturePassword - Dot-separated string of icon IDs, e.g. "3.7.12"
 * @param {string|null} [iconStyle] - Optional display style: "colorful" or "standard"
 * @returns {Array<{label: string, iconColorful?: string, iconStandard?: string}>}
 */
export function getPicturePasswordIcons(picturePassword, iconStyle = null) {
  if (!picturePassword) {
    return [];
  }
  return picturePassword
    .split('.')
    .map(segment => {
      const key = String(parseInt(segment, 10));
      const entry = PICTURE_PASSWORD_SET[key];
      if (!entry) {
        return null;
      }
      const result = { label: entry.name };
      if (iconStyle === PicturePasswordIconStyle.COLORFUL) {
        result.iconColorful = entry.iconColorful;
      } else if (iconStyle === PicturePasswordIconStyle.STANDARD) {
        result.iconStandard = entry.iconStandard;
      }
      return result;
    })
    .filter(Boolean);
}
