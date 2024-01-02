import isUndefined from 'lodash/isUndefined';
import browsers from 'browserslist-config-kolibri';
import { browser, passesRequirements } from './browserInfo';
import plugin_data from 'plugin_data';

const minimumBrowserRequirements = {};

const browserRegex = /^([a-zA-Z]+) ([><=]+) (\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

for (const browser of browsers) {
  const [name, sign, major, minor, patch] = browserRegex.exec(browser).slice(1);
  // This only supports > and >=, but that's all we need.
  const addOne = sign === '>' ? 1 : 0;
  const entry = {
    major: isUndefined(minor) && isUndefined(patch) ? Number(major) + addOne : Number(major),
  };
  if (!isUndefined(minor)) {
    entry.minor = Number(minor);
    if (isUndefined(patch)) {
      entry.minor += addOne;
    }
  }
  if (!isUndefined(patch)) {
    entry.patch = Number(patch) + addOne;
  }
  minimumBrowserRequirements[name] = entry;
}

if (!passesRequirements(browser, minimumBrowserRequirements)) {
  window.location.href = plugin_data.unsupportedUrl;
}
