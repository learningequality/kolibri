import { PageNames } from '../../constants';

export function showSearch(store, searchTerm) {
  store.commit('SET_PAGE_NAME', PageNames.SEARCH);
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('CORE_SET_ERROR', null);
  store.dispatch('search/clearSearch');
  return store.dispatch('setAndCheckChannels').then(channels => {
    if (!channels.length) {
      return;
    }
    if (searchTerm) {
      store.dispatch('search/triggerSearch', searchTerm);
    } else {
      store.commit('CORE_SET_PAGE_LOADING', false);
    }
  });
}
