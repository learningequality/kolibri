import { ClassroomResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';
import { samePageCheckGenerator, handleApiError } from 'kolibri.coreVue.vuex.actions';
import { currentFacilityId } from 'kolibri.coreVue.vuex.getters';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { PageNames } from '../../constants';
import { _userState } from './helpers/mappers';
import displayModal from './helpers/displayModal';
import preparePage from './helpers/preparePage';

/**
 * Do a POST to create new class
 * @param {string} name
 */
export function createClass(store, name) {
  ClassroomResource.createModel({
    name,
    parent: store.state.core.session.facility_id,
  })
    .save()
    .then(
      classroom => {
        store.dispatch('ADD_CLASS', classroom);
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

/**
 * Do a PATCH to update the class.
 * @param {string} id - class id.
 * @param {object} updateData.
 */
export function updateClass(store, id, updateData) {
  if (!id || Object.keys(updateData).length === 0) {
    // if no id or empty updateData passed, abort the function
    return;
  }
  ClassroomResource.getModel(id)
    .save(updateData)
    .then(
      classroom => {
        store.dispatch('UPDATE_CLASS', id, classroom);
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

/**
 * Do a DELETE to delete the class.
 * @param {string or Integer} id
 */
export function deleteClass(store, id) {
  if (!id) {
    // if no id passed, abort the function
    return;
  }
  return ClassroomResource.getModel(id)
    .delete()
    .then(
      () => {
        store.dispatch('DELETE_CLASS', id);
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

export function enrollUsersInClass(store, classId, users) {
  // TODO no error handling
  return MembershipResource.createCollection(
    {
      collection: classId,
    },
    users.map(userId => ({
      collection: classId,
      user: userId,
    }))
  ).save();
}

export function removeClassUser(store, classId, userId) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  return MembershipResource.getCollection({
    user: userId,
    collection: classId,
  })
    .delete()
    .then(
      () => {
        store.dispatch('DELETE_CLASS_USER', userId);
        displayModal(store, false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

export function showClassesPage(store) {
  // TODO localize this title
  preparePage(store.dispatch, {
    name: PageNames.CLASS_MGMT_PAGE,
    title: 'Classes',
  });
  return ClassroomResource.getCollection()
    .fetch({}, true)
    .only(
      samePageCheckGenerator(store),
      classrooms => {
        store.dispatch('SET_PAGE_STATE', {
          modalShown: false,
          classes: [...classrooms],
        });
        store.dispatch('CORE_SET_PAGE_LOADING', false);
      },
      error => {
        handleApiError(store, error);
      }
    );
}

export function showClassEditPage(store, classId) {
  /*
   * TODO inline this
   * This mostly duplicates _userState but searches Roles array for an exact match
   * on the classId, and not for any Role object.
   */
  function _userStateForClassEditPage(facilityId, classId, apiUserData) {
    const matchingRole = apiUserData.roles.find(
      r =>
        String(r.collection) === String(classId) ||
        String(r.collection) === String(facilityId) ||
        r.kind === UserKinds.ADMIN ||
        r.kind === UserKinds.SUPERUSER
    );

    return {
      id: apiUserData.id,
      facility_id: apiUserData.facility,
      username: apiUserData.username,
      full_name: apiUserData.full_name,
      kind: matchingRole ? matchingRole.kind : UserKinds.LEARNER,
    };
  }

  // TODO localize this title
  preparePage(store.dispatch, {
    name: PageNames.CLASS_EDIT_MGMT_PAGE,
    title: 'Edit Class',
  });

  const promises = [
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true),
    ClassroomResource.getModel(classId).fetch(),
    ClassroomResource.getCollection().fetch({}, true),
  ];

  const transformResults = ([facilityUsers, classroom, classrooms]) => ({
    modalShown: false,
    currentClass: classroom,
    classes: classrooms,
    classUsers: facilityUsers.map(
      _userStateForClassEditPage.bind(null, currentFacilityId(store.state), classId)
    ),
  });

  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    results => {
      store.dispatch('SET_PAGE_STATE', transformResults(results));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

function showClassEnrollPage(store, classId) {
  // all users in facility
  const userPromise = FacilityUserResource.getCollection().fetch({}, true);
  // current class
  const classPromise = ClassroomResource.getModel(classId).fetch();
  // users in current class
  const classUsersPromise = FacilityUserResource.getCollection({
    member_of: classId,
  }).fetch({}, true);

  return ConditionalPromise.all([userPromise, classPromise, classUsersPromise]).only(
    samePageCheckGenerator(store),
    ([facilityUsers, classroom, classUsers]) => {
      const pageState = {
        facilityUsers: facilityUsers.map(_userState),
        classUsers: classUsers.map(_userState),
        class: classroom,
        modalShown: false,
        userJustCreated: null,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleApiError(store, error);
    }
  );
}

export function showLearnerClassEnrollmentPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return showClassEnrollPage(store, classId).then(() => {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('SET_PAGE_NAME', PageNames.CLASS_ENROLL_LEARNER);
    // // TODO localize title
    // preparePage(store.dispatch, {
    //   name: PageNames.CLASS_ENROLL_LEARNER,
    //   title: 'Classes - Learner Enrollment',
    //   isAsync: false,
    // });
  });
}
export function showCoachClassAssignmentPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return showClassEnrollPage(store, classId).then(() => {
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('SET_PAGE_NAME', PageNames.CLASS_ASSIGN_COACH);
  });
}
