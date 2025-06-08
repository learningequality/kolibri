import pickBy from 'lodash/pickBy';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { _userState } from '../mappers';

export function fetchSortedFacilityUsersHandler(
  store,
  { column, order, page, page_size, router, search, user_type },
) {
  store.commit('SET_STATE', { dataLoading: true });

  const orderingParam = order === 'desc' ? `-${column}` : column || null;
  const shouldResolve = samePageCheckGenerator(store);

  return FacilityUserResource.fetchCollection({
    getParams: pickBy({
      ordering: orderingParam,
      page,
      page_size,
      search,
      user_type,
    }),
    force: true,
  })
    .then(users => {
      if (shouldResolve()) {
        const mappedUsers = users.results.map(_userState);
        store.commit('SET_STATE', {
          facilityUsers: mappedUsers,
          totalPages: users.total_pages,
          usersCount: users.count,
        });

        const currentQuery = router.currentRoute.query;
        const newQuery = pickBy({
          ...currentQuery,
          ordering: column,
          order,
          page,
          page_size,
          search,
          user_type,
        });

        router.push({
          path: router.currentRoute.path,
          query: newQuery,
        });
      }
      store.commit('SET_STATE', { dataLoading: false });
      store.dispatch('notLoading');
    })
    .catch(error => {
      if (shouldResolve()) {
        store.dispatch('handleApiError', { error, reloadOnReconnect: true });
      }
      store.commit('SET_STATE', { dataLoading: false });
      store.dispatch('notLoading');
    });
}
// An action for setting up the initial state of the app by fetching data from the server
export function showUserPage(store, toRoute, fromRoute, options = {}) {
  store.commit('userManagement/SET_STATE', { dataLoading: true });
  if (toRoute.name !== fromRoute.name) {
    store.dispatch('preparePage');
  }
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  const shouldResolve = samePageCheckGenerator(store);
  const page = options.page || toRoute.query.page || 1;
  const page_size = options.page_size || toRoute.query.page_size || 30;
  const ordering = options.ordering || toRoute.query.ordering;
  const order = options.order || toRoute.query.order;
  const router = options.router;
  const search = (options.search !== undefined ? options.search : toRoute.query.search) || '';
  const user_type = options.user_type !== undefined ? options.user_type : toRoute.query.user_type;

  if (ordering || order) {
    return store.dispatch('userManagement/fetchSortedFacilityUsers', {
      column: ordering,
      order,
      page,
      page_size,
      router,
      search: search.trim() || undefined,
      user_type,
    });
  }

  // Default fetch logic
  return FacilityUserResource.fetchCollection({
    getParams: pickBy({
      member_of: facilityId,
      page,
      page_size,
      search: search.trim() || undefined,
      user_type,
    }),
    force: true,
  })
    .then(users => {
      if (shouldResolve()) {
        store.commit('userManagement/SET_STATE', {
          facilityUsers: users.results.map(_userState),
          totalPages: users.total_pages,
          usersCount: users.count,
        });
      }
      store.commit('userManagement/SET_STATE', { dataLoading: false });
      store.dispatch('notLoading');
    })
    .catch(error => {
      shouldResolve() ? store.dispatch('handleApiError', { error, reloadOnReconnect: true }) : null;
      store.commit('userManagement/SET_STATE', { dataLoading: false });
      store.dispatch('notLoading');
    });
}
