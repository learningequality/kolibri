import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
import RoleResource from 'kolibri-common/apiResources/RoleResource';
import { UserKinds } from 'kolibri/constants';
import uniq from 'lodash/uniq';

export async function enrollLearnersInClass(_, { classId, users }) {
  return MembershipResource.saveCollection({
    data: uniq(users).map(userId => ({
      collection: classId,
      user: userId,
    })),
  });
}

export async function assignCoachesToClass(_, { classId, coaches }) {
  return RoleResource.saveCollection({
    data: uniq(coaches).map(userId => ({
      collection: classId,
      user: userId,
      kind: UserKinds.COACH,
    })),
  });
}
