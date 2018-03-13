import { ClassroomResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';

import { samePageCheckGenerator, handleApiError } from 'kolibri.coreVue.vuex.actions';
import { currentFacilityId } from 'kolibri.coreVue.vuex.getters';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';

import ConditionalPromise from 'kolibri.lib.conditionalPromise';

import { PageNames } from '../../constants';

import { _classState, _userState } from './helpers/mappers';
import displayModal from './helpers/displayModal';
import preparePage from './helpers/preparePage';

/**
 * Do a POST to create new class
 * @param {string} name
 */
export function createClass(store, name) {
  const classData = {
    name,
    parent: store.state.core.session.facility_id,
  };

  ClassroomResource.createModel(classData)
    .save()
    .then(
      classModel => {
        // dispatch newly created class
        store.dispatch('ADD_CLASS', _classState(classModel));
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
  const classModel = ClassroomResource.getModel(id);

  classModel.save(updateData).then(
    response => {
      store.dispatch('UPDATE_CLASS', id, response);
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
  ClassroomResource.getModel(id)
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
  const memberships = users.map(userId => ({
    collection: classId,
    user: userId,
  }));
  return MembershipResource.createCollection(
    {
      collection: classId,
    },
    memberships
  ).save();
}

export function removeClassUser(store, classId, userId) {
  if (!classId || !userId) {
    // if no id passed, abort the function
    return;
  }
  // fetch the membership model with this classId and userId.
  const MembershipCollection = MembershipResource.getCollection({
    user: userId,
    collection: classId,
  });

  MembershipCollection.delete().then(
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
  preparePage(store.dispatch, {
    name: PageNames.CLASS_MGMT_PAGE,
    title: 'Classes',
  });
  const classCollection = ClassroomResource.getCollection();
  const classPromise = classCollection.fetch({}, true);
  const promises = [classPromise];
  ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([classes]) => {
      const pageState = {
        modalShown: false,
        classes: classes.map(_classState),
      };

      store.dispatch('SET_PAGE_STATE', pageState);
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

export function showClassEnrollPage(store, classId) {
  preparePage(store.dispatch, {
    name: PageNames.CLASS_ENROLL_MGMT_PAGE,
    title: 'Classes',
  });

  // all users in facility
  const userPromise = FacilityUserResource.getCollection().fetch({}, true);
  // current class
  const classPromise = ClassroomResource.getModel(classId).fetch();
  // users in current class
  const classUsersPromise = FacilityUserResource.getCollection({
    member_of: classId,
  }).fetch({}, true);

  ConditionalPromise.all([userPromise, classPromise, classUsersPromise]).only(
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
