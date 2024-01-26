module.exports = [
  // Exclude the following because their market share is no > 0.1%
  // Baidu for Baidu Browser.
  // BlackBerry or bb for Blackberry browser.
  // kaios for KaiOS Browser.
  // OperaMobile or op_mob for Opera Mobile.
  // We exclude OperaMini explicitly as it does not support basic functionality
  'Android > 4.4.3',
  'Chrome >= 49',
  'ChromeAndroid >= 49',
  'Edge >= 18',
  'Firefox >= 52',
  'FirefoxAndroid >= 68',
  'iOS >= 9.3',
  'Opera >= 67',
  'QQAndroid >= 10.4',
  'Safari >= 11.1',
  'Samsung >= 4',
  'UCAndroid >= 12.12',
];
