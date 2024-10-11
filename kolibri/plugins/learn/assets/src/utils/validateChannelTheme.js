import tinycolor from 'tinycolor2';
import logging from 'kolibri-logging';

const logger = logging.getLogger('theme validation');

const validKeys = ['appBarColor', 'textColor', 'backdropColor', 'backgroundColor'];

const defaultTheme = {
  appBarColor: null,
  textColor: null,
  backdropColor: null,
  backgroundColor: null,
};

export function validateChannelTheme(theme) {
  const updatedTheme = {
    ...defaultTheme,
  };
  for (const key in theme) {
    const color = theme[key];
    if (!color) {
      continue;
    } else if (!validKeys.includes(key)) {
      logger.error(`'${key}' is not a valid custom theme option`);
    } else if (!tinycolor(color).isValid()) {
      logger.error(`invalid color '${color}' provided for '${key}'`);
    } else {
      updatedTheme[key] = color;
    }
  }

  // if backdrop color has no transparency, give it an alpha of 0.7
  if (updatedTheme.backdropColor) {
    const bdcolor = tinycolor(updatedTheme.backdropColor);
    bdcolor.setAlpha(0.7);
    updatedTheme.backdropColor = bdcolor.toRgbString();
  }

  // if updated theme does not have valid values for both appBarColor and textColor,
  // log an error and reset the missing options to null
  if ((theme.textColor && !theme.appBarColor) || (!theme.textColor && theme.appBarColor)) {
    logger.error(`valid values for 'textColor' and 'appBarColor' must be provided`);
    updatedTheme.textColor = null;
    updatedTheme.appBarColor = null;
  }

  // check contrast and log a warning if it's not WCAG Level AA-compliant
  if (updatedTheme.textColor && updatedTheme.appBarColor) {
    if (!tinycolor.isReadable(updatedTheme.textColor, updatedTheme.appBarColor)) {
      logger.warn(
        `'textColor' and 'appBarColor' do not provide enough contrast and do not pass WCAG Level AA guidelines`,
      );
    }
  }

  return updatedTheme;
}
