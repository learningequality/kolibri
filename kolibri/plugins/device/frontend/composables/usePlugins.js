import ComposableBase from 'kolibri/composables/ComposableBase';
import PluginsResource from 'kolibri-common/apiResources/PluginsResource';

/**
 * Logic related to the plugins installed on this device
 */
export class PluginsComposable extends ComposableBase {
  plugins = null;

  /**
   * Fetches the plugins installed on this device
   * @returns {Promise<void>}
   */
  async fetchPlugins() {
    this.plugins = await PluginsResource.list();
  }

  /**
   * Enables or disables a plugin
   * @param {string} pluginId - The ID of the plugin to update.
   * @param {boolean} value - Whether the plugin should be enabled.
   * @returns {Promise<void>}
   */
  togglePlugin(pluginId, value) {
    const pluginIndex = this.plugins.findIndex(plugin => plugin.id === pluginId);
    if (pluginIndex !== -1) {
      const plugin = this.plugins[pluginIndex];
      if (plugin.enabled !== value) {
        return PluginsResource.update(pluginId, { enabled: value }).then(updatedPlugin => {
          this.plugins.splice(pluginIndex, 1, updatedPlugin);
        });
      }
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Plugin ${pluginId} not found`));
  }

  /**
   * Enables a plugin
   * @param {string} pluginId - The ID of the plugin to enable.
   * @returns {Promise<void>}
   */
  enablePlugin(pluginId) {
    return this.togglePlugin(pluginId, true);
  }

  /**
   * Disables a plugin
   * @param {string} pluginId - The ID of the plugin to disable.
   * @returns {Promise<void>}
   */
  disablePlugin(pluginId) {
    return this.togglePlugin(pluginId, false);
  }
}

export default PluginsComposable.use;
