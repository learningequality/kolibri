import client from 'kolibri/client';
import urls from 'kolibri/urls';

const ZIM_RESOLVE_BATCH_URL_NAME = 'kolibri:kolibri.plugins.zim_viewer:zim_resolve_batch';

// gunicorn caps the request line at 8 KiB.
const BATCH_URL_BUDGET = 6000;

function queriesFor(paths) {
  const queries = [];
  let params = [];
  let length = 0;
  for (const path of paths) {
    const param = `path=${encodeURIComponent(path)}`;
    if (params.length && length + param.length + 1 > BATCH_URL_BUDGET) {
      queries.push(params.join('&'));
      params = [];
      length = 0;
    }
    params.push(param);
    length += param.length + 1;
  }
  if (params.length) queries.push(params.join('&'));
  return queries;
}

/**
 * Resolve ZIM entry paths to their descriptors.
 * @param {string} filename - The ZIM file's storage filename
 * @param {Array<string>} paths - Entry paths to resolve
 * @returns {Promise<object>} Descriptors keyed by path; paths not in the ZIM are absent
 */
export default async function resolveBatch(filename, paths) {
  const url = urls[ZIM_RESOLVE_BATCH_URL_NAME]({ filename });
  const responses = await Promise.all(
    queriesFor([...paths].sort()).map(query => client({ url: `${url}?${query}` })),
  );
  return Object.assign({}, ...responses.map(response => response.data.results));
}
