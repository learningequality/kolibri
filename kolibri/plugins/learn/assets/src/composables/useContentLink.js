import { get } from '@vueuse/core';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { computed, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { PageNames } from '../constants';

export default function useContentLink(store) {
  // Get store reference from the curent instance
  // but allow it to be passed in to allow for dependency
  // injection, primarily for tests.
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);

  function genContentLink(id, isLeaf = false, repeatParams = false) {
    if (!route) {
      return null;
    }
    const query = {};
    const oldQuery = get(route).query || {};
    if (repeatParams) {
      // Indicates that we should just pass through any previously
      // generated parameters
      Object.assign(query, pick(oldQuery, ['prevName', 'prevQuery', 'prevParams']));
    } else {
      query.prevName = get(route).name;
      if (!isEmpty(oldQuery)) {
        query.prevQuery = encodeURI(JSON.stringify(oldQuery));
      }
      const params = get(route).params;
      if (!isEmpty(params)) {
        query.prevParams = encodeURI(JSON.stringify(params));
      }
    }
    return {
      name: isLeaf ? PageNames.TOPICS_CONTENT : PageNames.TOPICS_TOPIC,
      params: { id },
      query,
    };
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
    genContentLink,
    back,
  };
}
