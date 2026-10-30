import ComposableBase from 'kolibri/composables/ComposableBase';
import PluginsResource from 'kolibri-common/apiResources/PluginsResource';

/**
 * Logic related to the plugins installed on this device
 */
export class PluginsComposable extends ComposableBase {
  plugins = null;

  async fetchPlugins() {
    this.plugins = await PluginsResource.list();
  }

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

  enablePlugin(pluginId) {
    return this.togglePlugin(pluginId, true);
  }

  disablePlugin(pluginId) {
    return this.togglePlugin(pluginId, false);
  }
}

export default PluginsComposable.use;
