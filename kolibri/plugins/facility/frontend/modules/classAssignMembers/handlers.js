import pickBy from 'lodash/pickBy';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { _userState } from '../mappers';

export function showLearnerClassEnrollmentPage(store, toRoute, fromRoute) {
  const { id, facility_id } = toRoute.params;
  if (toRoute.name !== fromRoute.name) {
    store.dispatch('preparePage');
  }

  // facility users that are not enrolled in this class
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: pickBy({
      member_of: facility_id || store.getters.activeFacilityId,
      page: toRoute.query.page || 1,
      page_size: toRoute.query.page_size || 30,
      search: toRoute.query.search && toRoute.query.search.trim(),
      exclude_member_of: id,
      exclude_coach_for: id,
    }),
    force: true,
  });
  // current class
  const classPromise = ClassroomResource.fetchModel({ id });
  const shouldResolve = samePageCheckGenerator(store);
  return Promise.all([userPromise, classPromise]).then(
    ([facilityUsers, classroom]) => {
      if (shouldResolve()) {
        store.commit('classAssignMembers/SET_STATE', {
          facilityUsers: facilityUsers.results.map(_userState),
          totalPageNumber: facilityUsers.total_pages,
          totalLearners: facilityUsers.count,
          class: classroom,
          modalShown: false,
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleApiError', { error, reloadOnReconnect: true }) : null;
    },
  );
}

export function showCoachClassAssignmentPage(store, toRoute, fromRoute) {
  const { id, facility_id } = toRoute.params;
  if (toRoute.name !== fromRoute.name) {
    store.dispatch('loading');
  }
  const facilityId = facility_id || store.getters.activeFacilityId;
  // all users in facility eligible to be a coach that is not already a coach
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: {
      member_of: facilityId,
      exclude_member_of: id,
      exclude_user_type: 'learner',
      exclude_coach_for: id,
      page: toRoute.query.page || 1,
      page_size: toRoute.query.page_size || 30,
      search: toRoute.query.search && toRoute.query.search.trim(),
    },
    force: true,
  });
  // current class
  const classPromise = ClassroomResource.fetchModel({ id, force: true });
  const shouldResolve = samePageCheckGenerator(store);
  return Promise.all([userPromise, classPromise]).then(
    ([facilityUsers, classroom]) => {
      if (shouldResolve()) {
        store.commit('classAssignMembers/SET_STATE', {
          // facilityUsers now only contains users that are eligible for coachdom
          facilityUsers: facilityUsers.results.map(_userState),
          totalPageNumber: facilityUsers.total_pages,
          totalLearners: facilityUsers.count,
          class: classroom,
          modalShown: false,
        });
      }
      store.dispatch('notLoading');
    },
    error => {
      store.dispatch('notLoading');
      shouldResolve() ? store.dispatch('handleApiError', { error, reloadOnReconnect: true }) : null;
    },
  );
}
