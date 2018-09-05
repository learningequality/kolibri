import { PageNames } from '../../constants';

export function showSearch(store, { searchTerm, kind, channel_id }) {
  store.commit('SET_PAGE_NAME', PageNames.SEARCH);
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('CORE_SET_ERROR', null);
  store.dispatch('search/clearSearch');
  return store.dispatch('setAndCheckChannels').then(channels => {
    if (!channels.length) {
      return;
    }
    if (searchTerm) {
      store.dispatch('search/triggerSearch', {
        searchTerm,
        kindFilter: kind,
        channelFilter: channel_id,
      });
    } else {
      store.commit('CORE_SET_PAGE_LOADING', false);
    }
  });
}
