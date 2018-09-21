import { UserKinds } from 'kolibri.coreVue.vuex.constants';

export default function UserType(userObject) {
  if (userObject.is_superuser) {
    return UserKinds.SUPERUSER;
  }
  if (!userObject.roles.length) {
    return UserKinds.LEARNER;
  }

  // get first role associated with this facility
  return userObject.roles.find(role => role.collection === userObject.facility).kind;
}
