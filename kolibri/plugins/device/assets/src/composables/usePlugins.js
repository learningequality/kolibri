/**
 * A composable function containing logic related to channels
 */

import { ref } from 'kolibri.lib.vueCompositionApi';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

export default function usePlugins() {
  const plugins = ref(null);
  function fetchPlugins() {
    return client({
      url: urls['kolibri:core:plugins-list'](),
    }).then(response => {
      plugins.value = response.data;
    });
  }
  fetchPlugins();
  function togglePlugin(pluginId, value) {
    const pluginIndex = plugins.value.findIndex(plugin => plugin.id === pluginId);
    if (pluginIndex !== -1) {
      const plugin = plugins.value[pluginIndex];
      if (plugin.enabled !== value) {
        return client({
          method: 'PATCH',
          url: urls['kolibri:core:plugins-detail'](pluginId),
          data: {
            enabled: value,
          },
        }).then(response => {
          plugins.value.splice(pluginIndex, 1, response.data);
        });
      }
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Plugin ${pluginId} not found`));
  }
  function enablePlugin(pluginId) {
    return togglePlugin(pluginId, true);
  }
  function disablePlugin(pluginId) {
    return togglePlugin(pluginId, false);
  }
  return {
    plugins,
    enablePlugin,
    disablePlugin,
  };
}
