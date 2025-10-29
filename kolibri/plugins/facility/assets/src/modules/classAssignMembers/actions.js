import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { UserKinds } from 'kolibri/constants';
import uniq from 'lodash/uniq';

export async function enrollLearnersInClass(store, { classId, users }) {
  return client({
    url: urls['kolibri:core:membership_list'](),
    method: 'POST',
    data: uniq(users).map(userId => ({
      collection: classId,
      user: userId,
    })),
  });
}

export async function assignCoachesToClass(store, { classId, coaches }) {
  return client({
    url: urls['kolibri:core:role_list'](),
    method: 'POST',
    data: uniq(coaches).map(userId => ({
      collection: classId,
      user: userId,
      kind: UserKinds.COACH,
    })),
  });
}
