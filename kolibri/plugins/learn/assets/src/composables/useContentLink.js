import { get } from '@vueuse/core';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { PageNames } from '../constants';

function _makeLink(id, isResource, query) {
  return {
    name: isResource ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
    params: { id },
    query,
  };
}

export default function useContentLink(store) {
  // Get store reference from the curent instance
  // but allow it to be passed in to allow for dependency
  // injection, primarily for tests.
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);

  /**
   * A function to generate a VueRouter link object that links to
   * either a resource or a topic, and generates query parameters
   * that allow creating a backlink to the route context in which
   * this link is generated
   * @param {string} id - the id of the node
   * @param {boolean} isResource - whether this is a resource or not
   * @return {Object} VueRouter link object
   */
  function genContentLinkBackLinkCurrentPage(id, isResource = false) {
    if (!route) {
      return null;
    }
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
    return _makeLink(id, isResource, query);
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
  function genContentLinkKeepCurrentBackLink(id, isResource = false) {
    if (!route) {
      return null;
    }
    const oldQuery = get(route).query || {};
    const query = pick(oldQuery, ['prevName', 'prevQuery', 'prevParams']);

    return _makeLink(id, isResource, query);
  }

  const back = computed(() => {
    const routeValue = get(route);
    if (!routeValue) {
      return null;
    }
    const query =
      routeValue.query && routeValue.query.prevQuery
        ? JSON.parse(decodeURI(routeValue.query.prevQuery))
        : {};
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

  return {
    genContentLinkBackLinkCurrentPage,
    genContentLinkKeepCurrentBackLink,
    back,
  };
}
