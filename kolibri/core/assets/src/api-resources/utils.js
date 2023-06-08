import { Resource } from 'kolibri.lib.apiResource';
import plugin_data from 'plugin_data';

const contentCacheKey = plugin_data.contentCacheKey;

export function contentCacheClient(options) {
  // Add in content cache parameter if relevant
  if (!options.data) {
    options.params = options.params || {};
    options.params['contentCacheKey'] = contentCacheKey;
  }
  return Resource.prototype.client(options);
}
