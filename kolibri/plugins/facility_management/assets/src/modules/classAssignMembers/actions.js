import { MembershipResource, RoleResource } from 'kolibri.resources';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';

export function enrollLearnersInClass(store, { classId, users }) {
  return MembershipResource.saveCollection({
    getParams: {
      collection: classId,
    },
    data: users.map(userId => ({
      collection: classId,
      user: userId,
    })),
  }).catch(err => {
    store.dispatch('handleApiError', err, { root: true });
  });
}

export function assignCoachesToClass(store, { classId, coaches }) {
  return RoleResource.saveCollection({
    getParams: {
      collection: classId,
    },
    data: coaches.map(userId => ({
      collection: classId,
      user: userId,
      kind: UserKinds.COACH,
    })),
  }).catch(err => {
    store.dispatch('handleApiError', err, { root: true });
  });
}
