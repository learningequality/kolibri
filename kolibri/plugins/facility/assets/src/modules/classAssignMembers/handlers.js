import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import pickBy from 'lodash/pickBy';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ClassroomResource, FacilityUserResource } from 'kolibri.resources';
import { _userState } from '../mappers';

export function showLearnerClassEnrollmentPage(store, toRoute) {
  const { id, facility_id } = toRoute.params;
  store.dispatch('preparePage');
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

  return ConditionalPromise.all([userPromise, classPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom]) => {
      store.commit('classAssignMembers/SET_STATE', {
        facilityUsers: facilityUsers.results.map(_userState),
        totalPageNumber: facilityUsers.total_pages,
        totalLearners: facilityUsers.count,
        class: classroom,
        modalShown: false,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}

export function showCoachClassAssignmentPage(store, toRoute) {
  const { id, facility_id } = toRoute.params;
  store.commit('CORE_SET_PAGE_LOADING', true);
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

  return ConditionalPromise.all([userPromise, classPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom]) => {
      store.commit('classAssignMembers/SET_STATE', {
        // facilityUsers now only contains users that are eligible for coachdom
        facilityUsers: facilityUsers.results.map(_userState),
        totalPageNumber: facilityUsers.total_pages,
        totalLearners: facilityUsers.count,
        class: classroom,
        modalShown: false,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
