import { browser, passesRequirements } from './browserInfo';
import plugin_data from 'plugin_data';

const minimumBrowserRequirements = {
  IE: {
    major: 11,
  },
  Android: {
    major: 4,
    minor: 0,
    patch: 2,
  },
};

if (!passesRequirements(browser, minimumBrowserRequirements)) {
  window.location.href = plugin_data.unsupportedUrl;
}
