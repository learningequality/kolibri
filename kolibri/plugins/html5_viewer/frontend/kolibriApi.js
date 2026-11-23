import isPlainObject from 'lodash/isPlainObject';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { events, nameSpace } from './kolibriApiEvents';

const zipListings = new Map();
const nodeReferenceParams = [
  'parent',
  'descendant_of',
  'ids',
  'related',
  'prerequisite_for',
  'has_prerequisite',
];

function statusError(status, message) {
  return Object.assign(new Error(message), { status });
}

function resolveSelf(value, contentNode) {
  if (Array.isArray(value)) {
    return value.map(item => resolveSelf(item, contentNode));
  }
  if (value !== 'self') {
    return value;
  }
  if (!contentNode?.id) {
    throw statusError(400, 'self requires a calling content node');
  }
  return contentNode.id;
}

function resolveParams(params, contentNode) {
  if (params === undefined) {
    return;
  }
  if (!isPlainObject(params)) {
    throw statusError(400, 'params must be a plain object');
  }
  const references = nodeReferenceParams.filter(key => key in params);
  return references.length
    ? {
        ...params,
        ...Object.fromEntries(references.map(key => [key, resolveSelf(params[key], contentNode)])),
      }
    : params;
}

function remoteBaseurl(files = []) {
  for (const file of files) {
    const baseurl =
      file.storage_url &&
      new URL(file.storage_url, window.location.href).searchParams.get('baseurl');
    if (baseurl) {
      return baseurl;
    }
  }
}

function withRemoteBaseurl(params, files) {
  const baseurl = remoteBaseurl(files);
  return baseurl ? { ...params, baseurl } : params;
}

function serverError(error) {
  return error.response ? statusError(error.response.status || 500, error.message) : error;
}

async function answerFromServer(request) {
  try {
    const response = await request();
    return response.data;
  } catch (error) {
    throw serverError(error);
  }
}

function validateNodeId(id, name) {
  if (typeof id !== 'string' || !id || /^\.{1,2}$|[/\\]/.test(id)) {
    throw statusError(400, `${name} must be a string containing a single path segment`);
  }
}

function contentNodeAnswer(action) {
  return async (data, { contentNode, files }) => {
    let routeParams;
    if (action !== 'list') {
      const id = data?.id;
      validateNodeId(id, 'id');
      routeParams = resolveSelf(id, contentNode);
    }
    const params = withRemoteBaseurl(resolveParams(data?.params, contentNode), files);
    return answerFromServer(() => ContentNodeResource.request({ action, routeParams, params }));
  };
}

async function navigateTo(data, { emit, hasListener, files }) {
  const nodeId = data?.nodeId;
  validateNodeId(nodeId, 'nodeId');
  if (!hasListener('navigateTo')) {
    throw statusError(501, 'The host has no navigateTo listener');
  }
  const params = withRemoteBaseurl(undefined, files);
  await ContentNodeResource.retrieve(nodeId, { params }).catch(error => {
    throw serverError(error);
  });
  emit('navigateTo', { nodeId });
}

function storageUrl(file) {
  return new URL(file.storage_url, window.location.href).href;
}

function zipFilenames(file) {
  const { checksum } = file;
  if (!zipListings.has(checksum)) {
    const listing = import('kolibri-zip')
      .then(async ({ default: ZipFile }) => {
        const zip = new ZipFile(storageUrl(file), { maxFullLoadSize: 0 });
        try {
          return new Set(await zip.filenames());
        } finally {
          await zip.close();
        }
      })
      .catch(error => {
        zipListings.delete(checksum);
        throw error;
      });
    zipListings.set(checksum, listing);
  }
  return zipListings.get(checksum);
}

async function dependencyUrl(data, { files = [] }) {
  const path = data?.path;
  if (typeof path !== 'string') {
    throw statusError(400, 'path must be a string');
  }
  const available = files.filter(file => file.available && file.storage_url);
  const direct = available.find(file => `${file.checksum}.${file.extension}` === path);
  if (direct) {
    return answerFromServer(() => client({ url: storageUrl(direct), responseType: 'blob' }));
  }
  let listingFailed = false;
  for (const file of available) {
    if (file.preset !== 'html5_dependency') {
      continue;
    }
    const filenames = await zipFilenames(file).catch(() => {
      listingFailed = true;
    });
    if (filenames?.has(path)) {
      return urls.zipContentUrl(file, path.split('/').map(encodeURIComponent).join('/'));
    }
  }
  if (listingFailed) {
    throw statusError(502, 'A dependency ZIP could not be listed');
  }
  throw statusError(404, 'Dependency not found');
}

export default {
  nameSpace,
  answers: {
    [events.LIST]: contentNodeAnswer('list'),
    [events.RETRIEVE]: contentNodeAnswer('detail'),
    [events.TREE]: contentNodeAnswer('tree_detail'),
    [events.NAVIGATE_TO]: navigateTo,
    [events.REQUEST_DATA]: (_, { hostData }) => hostData ?? null,
    [events.DEPENDENCY_URL]: dependencyUrl,
  },
};
