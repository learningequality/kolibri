import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { computed } from 'vue';
import { useRoute } from 'vue-router/composables';
import { ExternalPagePaths, PageNames } from '../constants';

function _decodeBackLinkQuery(query) {
  return query && query.prevQuery ? JSON.parse(decodeURI(query.prevQuery)) : {};
}

export default function useContentLink() {
  const route = useRoute();

  function _makeNodeLink(id, isResource, query, deviceId) {
    const params = route.params;
    return {
      name: isResource ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
      params: pick({ id, deviceId: deviceId || params.deviceId }, ['id', 'deviceId']),
      query,
    };
  }

  function _getBackLinkQuery() {
    const oldQuery = route.query;
    const query = {
      prevName: route.name,
    };
    if (!isEmpty(oldQuery)) {
      query.prevQuery = encodeURI(JSON.stringify(oldQuery));
    }
    const params = route.params;
    if (!isEmpty(params)) {
      query.prevParams = encodeURI(JSON.stringify(params));
    }
    return query;
  }

  /**
   * A function to generate a VueRouter link object that links to
   * either a resource or a topic, and generates query parameters
   * that allow creating a backlink to the route context in which
   * this link is generated.
   * @param {string} id - The id of the node.
   * @param {boolean} isResource - Whether this is a resource or not.
   * @param {string} [deviceId] - Override for the device id route parameter; defaults
   * to the device id on the current route.
   * @returns {object} VueRouter link object.
   */
  function genContentLinkBackLinkCurrentPage(id, isResource = false, deviceId) {
    const query = _getBackLinkQuery();

    return _makeNodeLink(id, isResource, query, deviceId);
  }

  function genExternalContentURLBackLinkCurrentPage(id) {
    const pathname = window.location.pathname;
    const learnIndex = pathname.indexOf('/learn');
    const base = pathname.slice(0, learnIndex) + '/learn/#';
    const query = _getBackLinkQuery();

    const path = `/topics/c/${id}`;

    return `${base}${path}?${new URLSearchParams(query)}`;
  }

  /**
   * A function to generate a VueRouter link object that links to
   * either a resource or a topic, and copies current query parameters
   * created by generateContentBackLinkCurrentPage if they exist,
   * allowing e.g. a resource page to link to another resource page
   * while maintaining the conceptual model of a single immersive overlay
   * that can be closed out, returning to the originating page that linked
   * to the original resource.
   * @param {string} id - The id of the node.
   * @param {boolean} isResource - Whether this is a resource or not.
   * @param {string} [deviceId] - Override for the device id route parameter.
   * @returns {object} VueRouter link object.
   */
  function genContentLinkKeepCurrentBackLink(id, isResource = false, deviceId) {
    const oldQuery = route.query;
    const query = pick(oldQuery, ['prevName', 'prevQuery', 'prevParams']);

    return _makeNodeLink(id, isResource, query, deviceId);
  }

  /**
   * A function to generate a VueRouter link object that links to
   * a topic, and decodes previous query parameters
   * created by generateContentBackLinkCurrentPage if they exist,
   * allowing e.g. a resource page to link to a topic page
   * while maintaining the conceptual model of a single immersive overlay
   * that can be closed out, returning to the originating page that linked
   * to the original parent topic of the resource.
   * @param {string} id - The id of the node.
   * @param {string} [deviceId] - Override for the device id route parameter.
   * @returns {object} VueRouter link object.
   */
  function genContentLinkKeepPreviousBackLink(id, deviceId) {
    const oldQuery = _decodeBackLinkQuery(route.query);
    const query = pick(oldQuery, ['prevName', 'prevQuery', 'prevParams']);

    return _makeNodeLink(id, false, query, deviceId);
  }

  const back = computed(() => {
    const query = _decodeBackLinkQuery(route.query);
    const name = route.query.prevName || PageNames.HOME;
    const params = route.query.prevParams ? JSON.parse(decodeURI(route.query.prevParams)) : {};
    return {
      name,
      params,
      query,
    };
  });

  function genExternalBackURL() {
    const pathname = window.location.pathname;
    const learnIndex = pathname.indexOf('/learn');
    const base = pathname.slice(0, learnIndex) + '/learn';
    const backValue = back.value;
    const query = backValue.query ? `#/?${new URLSearchParams(backValue.query)}` : '';
    const path = ExternalPagePaths[backValue.name];
    return `${base}${path}${query}`;
  }

  function genLibraryPageBackLink(deviceId) {
    const query = _getBackLinkQuery();
    return {
      name: PageNames.LIBRARY,
      params: { deviceId },
      query,
    };
  }

  function genExploreLibrariesPageBackLink() {
    const query = _getBackLinkQuery();

    return {
      name: PageNames.EXPLORE_LIBRARIES,
      query,
    };
  }

  return {
    genContentLinkBackLinkCurrentPage,
    genContentLinkKeepCurrentBackLink,
    genContentLinkKeepPreviousBackLink,
    genExternalContentURLBackLinkCurrentPage,
    genExternalBackURL,
    genLibraryPageBackLink,
    genExploreLibrariesPageBackLink,
    back,
  };
}
