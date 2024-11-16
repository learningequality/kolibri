import logging from 'kolibri-logging';
import { validateChannelTheme } from '../validateChannelTheme';

const defaultTheme = {
  appBarColor: null,
  textColor: null,
  backdropColor: null,
  backgroundColor: null,
};

describe('theme validator', () => {
  let logError = jest.fn();
  let logWarn = jest.fn();

  beforeAll(() => {
    const logger = logging.getLogger('theme validation');
    logError = jest.spyOn(logger, 'error').mockImplementation();
    logWarn = jest.spyOn(logger, 'warn').mockImplementation();
  });

  it('accepts valid colors for the theme', () => {
    const validTheme = {
      appBarColor: 'rgb(247, 138, 224)',
      textColor: '#282a36',
      backdropColor: 'lightblue',
      backgroundColor: 'rgba(40, 42, 54, 1.00)',
    };
    const theme = validateChannelTheme(validTheme);
    expect(logWarn).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
    expect(theme).toEqual({
      appBarColor: 'rgb(247, 138, 224)',
      textColor: '#282a36',
      backdropColor: 'rgba(173, 216, 230, 0.7)', // opacity is added to backdrop color
      backgroundColor: 'rgba(40, 42, 54, 1.00)',
    });
  });

  const invalidThemeTests = [
    ['appBarColor', 'rgb()'],
    ['textColor', 'purplish'],
    ['backdropColor', 100],
    ['backgroundColor', '#YYTTXX'],
  ];
  it.each(invalidThemeTests)('handles invalid setting of %s to %s', (key, color) => {
    const expectedLog = `invalid color '${color}' provided for '${key}'`;
    const theme = validateChannelTheme({ ...defaultTheme, [key]: color });
    expect(logError).toHaveBeenCalledWith(expectedLog);
    // No changes are made
    expect(theme).toEqual(defaultTheme);
  });

  it('logs an error if an invalid theme key is provided', () => {
    const theme = validateChannelTheme({ fontFamily: 'Roboto Mono' });
    expect(logError).toHaveBeenCalledWith(`'fontFamily' is not a valid custom theme option`);
    expect(theme).toEqual(defaultTheme);
  });

  it('logs a warning if the chosen colors do not pass WCAG Level AA', () => {
    const theme = validateChannelTheme({
      textColor: 'white',
      appBarColor: 'rgb(238, 238, 238)', // a light grey
    });
    expect(logWarn).toHaveBeenCalledWith(
      "'textColor' and 'appBarColor' do not provide enough contrast and do not pass WCAG Level AA guidelines",
    );
    expect(theme).toEqual({
      textColor: 'white',
      appBarColor: 'rgb(238, 238, 238)', // a light grey
      backdropColor: null,
      backgroundColor: null,
    });
  });

  const requiredOptionsTests = [
    ['black', undefined],
    [undefined, 'white'],
  ];
  it.each(requiredOptionsTests)(
    'logs an error if valid values for both textColor and appBarColor are not provided',
    (appBarColor, textColor) => {
      const theme = validateChannelTheme({
        textColor,
        appBarColor,
      });
      expect(logError).toHaveBeenCalledWith(
        `valid values for 'textColor' and 'appBarColor' must be provided`,
      );
      expect(theme).toEqual(defaultTheme);
    },
  );
});
