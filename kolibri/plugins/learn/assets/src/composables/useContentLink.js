import { get } from '@vueuse/core';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { computed, getCurrentInstance } from 'vue';
import { ExternalPagePaths, PageNames } from '../constants';

function _decodeBackLinkQuery(query) {
  return query && query.prevQuery ? JSON.parse(decodeURI(query.prevQuery)) : {};
}

export default function useContentLink(store) {
  // Get store reference from the curent instance
  // but allow it to be passed in to allow for dependency
  // injection, primarily for tests.
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);

  function _makeNodeLink(id, isResource, query, deviceId) {
    const params = get(route).params;
    return {
      name: isResource ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
      params: pick({ id, deviceId: deviceId || params.deviceId }, ['id', 'deviceId']),
      query,
    };
  }

  function _getBackLinkQuery() {
    const oldQuery = get(route).query || {};
    const query = {
      prevName: get(route).name,
    };
    if (!isEmpty(oldQuery)) {
      query.prevQuery = encodeURI(JSON.stringify(oldQuery));
    }
    const params = get(route).params;
    if (!isEmpty(params)) {
      query.prevParams = encodeURI(JSON.stringify(params));
    }
    return query;
  }

  /**
   * A function to generate a VueRouter link object that links to
   * either a resource or a topic, and generates query parameters
   * that allow creating a backlink to the route context in which
   * this link is generated
   * @param {string} id - the id of the node
   * @param {boolean} isResource - whether this is a resource or not
   * @return {Object} VueRouter link object
   */
  function genContentLinkBackLinkCurrentPage(id, isResource = false, deviceId) {
    if (!route.value) {
      return null;
    }

    const query = _getBackLinkQuery();

    return _makeNodeLink(id, isResource, query, deviceId);
  }

  function genExternalContentURLBackLinkCurrentPage(id) {
    const pathname = window.location.pathname;
    const learnIndex = pathname.indexOf('/learn');
    const base = pathname.slice(0, learnIndex) + '/learn/#';
    if (!route.value) {
      return base;
    }

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
   * @param {string} id - the id of the node
   * @param {boolean} isResource - whether this is a resource or not
   * @return {Object} VueRouter link object
   */
  function genContentLinkKeepCurrentBackLink(id, isResource = false, deviceId) {
    if (!route.value) {
      return null;
    }
    const oldQuery = get(route).query || {};
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
   * @param {string} id - the id of the node
   * @return {Object} VueRouter link object
   */
  function genContentLinkKeepPreviousBackLink(id, deviceId) {
    if (!route.value) {
      return null;
    }
    const oldQuery = _decodeBackLinkQuery(get(route).query);
    const query = pick(oldQuery, ['prevName', 'prevQuery', 'prevParams']);

    return _makeNodeLink(id, false, query, deviceId);
  }

  const back = computed(() => {
    const routeValue = get(route);
    if (!routeValue) {
      return null;
    }
    const query = _decodeBackLinkQuery(routeValue.query);
    const name = (routeValue.query || {}).prevName || PageNames.HOME;
    const params =
      routeValue.query && routeValue.query.prevParams
        ? JSON.parse(decodeURI(routeValue.query.prevParams))
        : {};
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
    const backValue = get(back);
    if (!backValue) {
      return base;
    }
    const query = backValue.query ? `#/?${new URLSearchParams(backValue.query)}` : '';
    const path = ExternalPagePaths[backValue.name];
    return `${base}${path}${query}`;
  }

  function genLibraryPageBackLink(deviceId) {
    if (!route.value) {
      return null;
    }

    const query = _getBackLinkQuery();
    return {
      name: PageNames.LIBRARY,
      params: { deviceId },
      query,
    };
  }

  function genExploreLibrariesPageBackLink() {
    if (!route.value) {
      return null;
    }

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
