import { MembershipResource, RoleResource } from 'kolibri.resources';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';

export function enrollLearnersInClass(store, { classId, users }) {
  // TODO no error handling
  return MembershipResource.saveCollection({
    getParams: {
      collection: classId,
    },
    data: users.map(userId => ({
      collection: classId,
      user: userId,
    })),
  });
}

export function assignCoachesToClass(store, { classId, coaches }) {
  // TODO no error handling
  return RoleResource.saveCollection({
    getParams: {
      collection: classId,
    },
    data: coaches.map(userId => ({
      collection: classId,
      user: userId,
      kind: UserKinds.COACH,
    })),
  });
}
