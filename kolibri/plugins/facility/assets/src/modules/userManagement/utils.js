import find from 'lodash/find';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { RoleResource } from 'kolibri.resources';

const FACILITY_ROLES = [UserKinds.ADMIN, UserKinds.ASSIGNABLE_COACH, UserKinds.COACH];

/**
 * Implements business logic for changing a FacilityUser's Role
 *
 * If Learner/New User -> ASSIGNABLE_COACH/COACH/ADMIN, then create that Role
 * If ASSIGNABLE_COACH/COACH/ADMIN -> LEARNER, then delete all Classroom-Level Coach Roles
 * IF ASSIGNABLE_COACH/COACH/ADMIN -> ASSIGNABLE_COACH/COACH/ADMIN, then replace only that Role
 *
 */
export function updateFacilityLevelRoles(facilityUser, newRoleKind) {
  const { roles, facility, id } = facilityUser;
  // Currently, we assume only ONE Facility-Level Role per user
  const currentFacilityRole = find(roles, { collection: facility });
  const createFacilityRole = () =>
    RoleResource.saveModel({
      data: {
        user: id,
        collection: facility,
        kind: newRoleKind,
      },
    });

  // When FacilityUser is only a Learner or New User (i.e. no current Role)
  if (!currentFacilityRole) {
    if (newRoleKind === UserKinds.LEARNER) {
      return Promise.resolve();
    }
    return createFacilityRole();
  }

  // If facility-wide Role has not changed, do nothing
  if (currentFacilityRole.kind === newRoleKind) {
    return Promise.resolve();
  }

  // Downgrading Role to LEARNER
  if (newRoleKind === UserKinds.LEARNER) {
    return RoleResource.deleteCollection({ user: id });
  }

  // Changing from one Facility-Level Role to another. Any Classroom-Level Roles
  // are left untouched
  if (FACILITY_ROLES.includes(newRoleKind)) {
    return createFacilityRole().then(() =>
      RoleResource.deleteModel({ id: currentFacilityRole.id })
    );
  }
}
