import plugin_data from 'plugin_data';

const appCapabilities = plugin_data.appCapabilities || {};

export default {
  launchIntent: appCapabilities.launch_intent,
};
