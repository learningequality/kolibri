import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ClassroomResource, FacilityUserResource } from 'kolibri.resources';
import { localeCompare } from 'kolibri.utils.i18n';
import { _userState } from '../mappers';

export function sortUsersByFullName(users) {
  return users.sort((a, b) => {
    return localeCompare(a.full_name, b.full_name);
  });
}

export function showClassEditPage(store, classId) {
  store.dispatch('preparePage');
  const facilityId = store.getters.activeFacilityId;
  const promises = [
    FacilityUserResource.fetchCollection({ getParams: { member_of: classId }, force: true }),
    ClassroomResource.fetchModel({ id: classId, force: true }),
    ClassroomResource.fetchCollection({ getParams: { parent: facilityId }, force: true }),
  ];
  const shouldResolve = samePageCheckGenerator(store);
  Promise.all(promises).then(
    ([facilityUsers, classroom, classrooms]) => {
      if (shouldResolve()) {
        store.commit('classEditManagement/SET_STATE', {
          modalShown: false,
          currentClass: classroom,
          classes: classrooms,
          classLearners: sortUsersByFullName(facilityUsers).map(_userState),
          classCoaches: sortUsersByFullName(classroom.coaches).map(_userState),
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}
