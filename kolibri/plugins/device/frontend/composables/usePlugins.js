/**
 * A composable function containing logic related to channels
 */

import { ref } from 'vue';
import PluginsResource from 'kolibri-common/apiResources/PluginsResource';

export default function usePlugins() {
  const plugins = ref(null);
  const fetchPlugins = PluginsResource.list().then(data => {
    plugins.value = data;
  });

  function togglePlugin(pluginId, value) {
    const pluginIndex = plugins.value.findIndex(plugin => plugin.id === pluginId);
    if (pluginIndex !== -1) {
      const plugin = plugins.value[pluginIndex];
      if (plugin.enabled !== value) {
        return PluginsResource.update(pluginId, { enabled: value }).then(updatedPlugin => {
          plugins.value.splice(pluginIndex, 1, updatedPlugin);
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
    fetchPlugins,
    enablePlugin,
    disablePlugin,
    togglePlugin,
  };
}
