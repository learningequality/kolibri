import pickBy from 'lodash/pickBy';
import { FacilityUserResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { _userState } from '../mappers';
// An action for setting up the initial state of the app by fetching data from the server
export function showUserPage(store, toRoute) {
  store.dispatch('preparePage');
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  const shouldResolve = samePageCheckGenerator(store);
  return FacilityUserResource.fetchCollection({
    getParams: pickBy({
      member_of: facilityId,
      page: toRoute.query.page || 1,
      page_size: toRoute.query.page_size || 30,
      search: toRoute.query.search && toRoute.query.search.trim(),
      user_type: toRoute.query.user_type,
    }),
    force: true,
  }).then(
    users => {
      if (shouldResolve()) {
        store.commit('userManagement/SET_STATE', {
          facilityUsers: users.results.map(_userState),
          totalPages: users.total_pages,
          usersCount: users.count,
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}
