import isUndefined from 'lodash/isUndefined';
import browsers from 'browserslist-config-kolibri';
import plugin_data from 'plugin_data';
import { browser, passesRequirements } from './browserInfo';

const minimumBrowserRequirements = {};

const browserRegex = /^([a-zA-Z]+) ([><=]+) (\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

for (const browser of browsers) {
  const [name, sign, major, minor, patch] = browserRegex.exec(browser).slice(1);
  if (sign !== '>' && sign !== '>=') {
    throw new Error('Unsupported browser requirement');
  }

  // This only supports > and >=, but that's all we need.
  // In the case that it is > then we will need to add one to the version number
  // we will add one to the smallest defined version number out of major, minor, patch
  const addOne = sign === '>';
  const entry = {
    major: Number(major),
  };
  let valueToIncrement = 'major';
  if (!isUndefined(minor)) {
    entry.minor = Number(minor);
    valueToIncrement = 'minor';
    // We only check for patch if we have a minor version number
    // as it is not possible to be defined without a minor version number
    if (!isUndefined(patch)) {
      entry.patch = Number(patch);
      valueToIncrement = 'patch';
    }
  }
  if (addOne) {
    entry[valueToIncrement] += 1;
  }
  minimumBrowserRequirements[name] = entry;
}

if (!passesRequirements(browser, minimumBrowserRequirements)) {
  window.location.href = plugin_data.unsupportedUrl;
}
