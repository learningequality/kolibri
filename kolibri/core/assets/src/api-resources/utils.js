import { Resource } from 'kolibri.lib.apiResource';
import plugin_data from 'plugin_data';

const contentCacheKey = plugin_data.contentCacheKey;

export function contentCacheClient(options) {
  // Add in content cache parameter if relevant
  // don't add it if we are fetching using a baseurl
  // as the content cache key only applies to locally served content
  if ((!options.data && !options.params) || !options.params.baseurl) {
    options.params = options.params || {};
    options.params['contentCacheKey'] = contentCacheKey;
  }
  return Resource.prototype.client(options);
}
