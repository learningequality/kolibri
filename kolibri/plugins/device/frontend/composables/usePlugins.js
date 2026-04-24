/**
 * A composable function containing logic related to channels.
 */

import { ref } from 'vue';
import client from 'kolibri/client';
import urls from 'kolibri/urls';

/**
 * Composable providing plugin management state and actions.
 * @returns {object} Plugins list, fetchPlugins promise, and enable/disable/toggle methods.
 */
export default function usePlugins() {
  const plugins = ref(null);
  const fetchPlugins = Promise.resolve(
    client({
      url: urls['kolibri:core:plugins_list'](),
    }).then(response => {
      plugins.value = response.data;
    }),
  );

  /**
   * Enables or disables a plugin by ID.
   * @param {string} pluginId - The ID of the plugin to toggle.
   * @param {boolean} value - True to enable the plugin, false to disable it.
   * @returns {Promise<void>} Resolves when the plugin state has been updated.
   */
  function togglePlugin(pluginId, value) {
    const pluginIndex = plugins.value.findIndex(plugin => plugin.id === pluginId);
    if (pluginIndex !== -1) {
      const plugin = plugins.value[pluginIndex];
      if (plugin.enabled !== value) {
        return client({
          method: 'PATCH',
          url: urls['kolibri:core:plugins_detail'](pluginId),
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
  /**
   * Enables a plugin by ID.
   * @param {string} pluginId - The ID of the plugin to enable.
   * @returns {Promise<void>} Resolves when the plugin has been enabled.
   */
  function enablePlugin(pluginId) {
    return togglePlugin(pluginId, true);
  }
  /**
   * Disables a plugin by ID.
   * @param {string} pluginId - The ID of the plugin to disable.
   * @returns {Promise<void>} Resolves when the plugin has been disabled.
   */
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
