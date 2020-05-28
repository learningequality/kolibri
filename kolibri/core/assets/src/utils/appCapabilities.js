import urls from 'kolibri.urls';
import plugin_data from 'plugin_data';

const appCapabilities = plugin_data.appCapabilities || {};

export const can = {
  launchIntent: appCapabilities.launch_intent,
};

export const actionUrls = {
  get launchIntent() {
    return urls[`kolibri:kolibri.plugins.app:appcommands-launch_intent`]
      ? urls[`kolibri:kolibri.plugins.app:appcommands-launch_intent`]()
      : null;
  },
};
