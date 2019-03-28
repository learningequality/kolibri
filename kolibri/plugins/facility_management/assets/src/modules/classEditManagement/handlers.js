import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ClassroomResource, FacilityUserResource } from 'kolibri.resources';
import { PageNames } from '../../constants';
import { _userState } from '../mappers';
import { filterAndSortUsers } from '../../userSearchUtils';

export function showClassEditPage(store, classId) {
  store.dispatch('preparePage', {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
  });
  const facilityId = store.getters.currentFacilityId;
  const promises = [
    FacilityUserResource.fetchCollection({ getParams: { member_of: classId }, force: true }),
    ClassroomResource.fetchModel({ id: classId, force: true }),
    ClassroomResource.fetchCollection({ getParams: { parent: facilityId }, force: true }),
  ];

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom, classrooms]) => {
      store.commit('classEditManagement/SET_STATE', {
        modalShown: false,
        currentClass: classroom,
        classes: classrooms,
        classLearners: filterAndSortUsers(facilityUsers).map(_userState),
        classCoaches: filterAndSortUsers(classroom.coaches).map(_userState),
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
