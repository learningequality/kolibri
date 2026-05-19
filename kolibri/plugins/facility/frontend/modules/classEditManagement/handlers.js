import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { localeCompare } from 'kolibri/utils/i18n';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import useFacility from 'kolibri-common/composables/useFacility';
import { _userState } from '../mappers';

export function sortUsersByFullName(users) {
  return users.sort((a, b) => {
    return localeCompare(a.full_name, b.full_name);
  });
}

export function showClassEditPage(store, classId) {
  store.dispatch('preparePage');
  const { facilityId } = useFacility();

  const promises = [
    FacilityUserResource.fetchCollection({ getParams: { member_of: classId }, force: true }),
    ClassroomResource.fetchModel({ id: classId, force: true }),
    ClassroomResource.fetchCollection({ getParams: { parent: facilityId.value }, force: true }),
  ];
  store.commit('classEditManagement/SET_DATA_LOADING', true);
  Promise.all(promises)
    .then(([facilityUsers, classroom, classrooms]) => {
      store.commit('classEditManagement/SET_DATA_LOADING', false);
      store.commit('classEditManagement/SET_STATE', {
        modalShown: false,
        currentClass: classroom,
        classes: classrooms,
        classLearners: sortUsersByFullName(facilityUsers).map(_userState),
        classCoaches: sortUsersByFullName(classroom.coaches).map(_userState),
      });
      pageLoading.value = false;
    })
    .catch(error => {
      pageLoading.value = false;
      handleApiError({ error, reloadOnReconnect: true });
    });
}
