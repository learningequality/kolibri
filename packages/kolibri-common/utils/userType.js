import { UserKinds } from 'kolibri/constants';

export default function UserType(userObject) {
  if (userObject.is_superuser) {
    return UserKinds.SUPERUSER;
  }
  if (!userObject.roles.length) {
    return UserKinds.LEARNER;
  }

  // get first role associated with this facility
  const firstRole = userObject.roles.find(role => role.collection === userObject.facility);

  if (firstRole) {
    return firstRole.kind;
  } else {
    // HACK check for edge case where the User has a Classroom-level COACH role in
    // spite of not having a Facility-level ASSIGNABLE_COACH role
    const coachRole = userObject.roles.find(role => role.kind === UserKinds.COACH);
    if (coachRole) {
      return UserKinds.ASSIGNABLE_COACH;
    } else {
      // If all else fails, display user as a LEARNER
      return UserKinds.LEARNER;
    }
  }
}
