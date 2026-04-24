import { PICTURE_PASSWORD_SET } from 'kolibri/constants';
import { PicturePasswordIconStyle } from '../constants/Auth';

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
        result.iconName = result.iconColorful = entry.iconColorful;
      } else if (iconStyle === PicturePasswordIconStyle.STANDARD) {
        result.iconName = result.iconStandard = entry.iconStandard;
      }
      return result;
    })
    .filter(Boolean);
}
