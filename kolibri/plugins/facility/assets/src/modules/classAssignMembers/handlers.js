import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ClassroomResource, FacilityUserResource } from 'kolibri.resources';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import { _userState } from '../mappers';

export function showLearnerClassEnrollmentPage(store, classId) {
  store.commit('SET_PAGE_NAME', PageNames.CLASS_ENROLL_LEARNER);
  store.commit('CORE_SET_PAGE_LOADING', true);
  const facilityId = store.getters.currentFacilityId;
  // all users in facility
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: { member_of: facilityId },
  });
  // current class
  const classPromise = ClassroomResource.fetchModel({ id: classId });
  // users in current class
  const classUsersPromise = FacilityUserResource.fetchCollection({
    getParams: {
      member_of: classId,
    },
    force: true,
  });

  return ConditionalPromise.all([userPromise, classPromise, classUsersPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom, classUsers]) => {
      store.commit('classAssignMembers/SET_STATE', {
        facilityUsers: facilityUsers.map(_userState),
        classUsers: classUsers.map(_userState),
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

export function showCoachClassAssignmentPage(store, classId) {
  store.commit('SET_PAGE_NAME', PageNames.CLASS_ASSIGN_COACH);
  store.commit('CORE_SET_PAGE_LOADING', true);
  const facilityId = store.getters.currentFacilityId;
  // all users in facility
  const userPromise = FacilityUserResource.fetchCollection({
    getParams: { member_of: facilityId },
  });
  // current class
  const classPromise = ClassroomResource.fetchModel({ id: classId, force: true });

  return ConditionalPromise.all([userPromise, classPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom]) => {
      store.commit('classAssignMembers/SET_STATE', {
        // facilityUsers now only contains users that are eligible for coachdom
        // TODO rename
        facilityUsers: facilityUsers
          // filter out users who are not eligible to be coaches
          .filter(user => {
            const eligibleRoles = [
              UserKinds.ASSIGNABLE_COACH,
              UserKinds.COACH,
              UserKinds.ADMIN,
              UserKinds.SUPERUSER,
            ];
            return user.roles.some(({ kind }) => eligibleRoles.includes(kind));
          })
          .map(_userState),
        classUsers: classroom.coaches.map(_userState),
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
