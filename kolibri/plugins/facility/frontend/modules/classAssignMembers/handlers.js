import pickBy from 'lodash/pickBy';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import useFacility from 'kolibri-common/composables/useFacility';
import { _userState } from '../mappers';

export function showLearnerClassEnrollmentPage(store, toRoute, fromRoute) {
  const { facilityId } = useFacility();
  const { id } = toRoute.params;
  if (toRoute.name !== fromRoute.name) {
    store.dispatch('preparePage');
  }

  // facility users that are not enrolled in this class
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: pickBy({
      member_of: facilityId.value,
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
  const shouldResolve = samePageCheckGenerator(toRoute);
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
        pageLoading.value = false;
      }
    },
    error => {
      pageLoading.value = false;
      if (shouldResolve()) {
        handleApiError({ error, reloadOnReconnect: true });
      }
    },
  );
}

export function showCoachClassAssignmentPage(store, toRoute, fromRoute) {
  const { facilityId } = useFacility();
  const { id } = toRoute.params;
  if (toRoute.name !== fromRoute.name) {
    pageLoading.value = true;
  }
  // all users in facility eligible to be a coach that is not already a coach
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: {
      member_of: facilityId.value,
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
  const shouldResolve = samePageCheckGenerator(toRoute);
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
      pageLoading.value = false;
    },
    error => {
      pageLoading.value = false;
      if (shouldResolve()) {
        handleApiError({ error, reloadOnReconnect: true });
      }
    },
  );
}
