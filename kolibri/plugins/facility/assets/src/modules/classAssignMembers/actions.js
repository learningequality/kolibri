import { MembershipResource, RoleResource } from 'kolibri.resources';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import uniq from 'lodash/uniq';

export function enrollLearnersInClass(store, { classId, users }) {
  return MembershipResource.saveCollection({
    getParams: {
      collection: classId,
    },
    data: uniq(users).map(userId => ({
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
    data: uniq(coaches).map(userId => ({
      collection: classId,
      user: userId,
      kind: UserKinds.COACH,
    })),
  }).catch(err => {
    store.dispatch('handleApiError', err, { root: true });
  });
}
