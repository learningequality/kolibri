import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
import RoleResource from 'kolibri-common/apiResources/RoleResource';
import { UserKinds } from 'kolibri/constants';
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
  });
}
