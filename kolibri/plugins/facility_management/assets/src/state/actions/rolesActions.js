import find from 'lodash/find';
import map from 'lodash/map';
import filter from 'lodash/filter';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { RoleResource } from 'kolibri.resources';

const FACILITY_ROLES = [UserKinds.ADMIN, UserKinds.CLASS_COACH, UserKinds.FACILITY_COACH];

/**
 * Implements business logic for changing a FacilityUser's Role
 *
 * If Learner/New User -> CLASS_COACH/FACILITY_COACH/ADMIN, then create that Role
 * If CLASS_COACH/FACILITY_COACH/ADMIN -> LEARNER, then delete all Classroom-Level Coach Roles
 * IF CLASS_COACH/FACILITY_COACH/ADMIN -> CLASS_COACH/FACILITY_COACH/ADMIN, then replace only that Role
 *
 */
export function updateFacilityLevelRoles(facilityUser, newRoleKind) {
  const { roles, facility, id } = facilityUser;
  // Currently, we assume only ONE Facility-Level Role per user
  const currentFacilityRole = find(roles, { collection: facility });
  const createFacilityRole = () =>
    RoleResource.createModel({
      user: id,
      collection: facility,
      kind: newRoleKind,
    }).save();

  // When FacilityUser is only a Learner or New User (i.e. no current Role)
  if (!currentFacilityRole) {
    if (newRoleKind === UserKinds.LEARNER) {
      return Promise.resolve();
    }
    return createFacilityRole();
  }

  // Downgrading Role to LEARNER
  if (newRoleKind === UserKinds.LEARNER) {
    const roleDeletionPromises = [
      RoleResource.getModel(currentFacilityRole.id).delete(),
      // Manually have to delete all Roles downstream in Classrooms
      map(filter(roles, { collection_parent: facility, kind: UserKinds.FACILITY_COACH }), role =>
        RoleResource.getModel(role.id).delete()
      ),
    ];
    return Promise.all(roleDeletionPromises);
  }

  // Changing from one Facility-Level Role to another. Any Classroom-Level Roles
  // are left untouched
  if (FACILITY_ROLES.includes(newRoleKind)) {
    return RoleResource.getModel(currentFacilityRole.id)
      .delete()
      ._promise.then(createFacilityRole);
  }
}
