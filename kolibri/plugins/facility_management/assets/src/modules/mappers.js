import UserType from 'kolibri.utils.UserType';

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

export function _userState(facilityUser) {
  return {
    id: facilityUser.id,
    facility_id: facilityUser.facility,
    username: facilityUser.username,
    full_name: facilityUser.full_name,
    kind: UserType(facilityUser),
    is_superuser: facilityUser.is_superuser,
    roles: facilityUser.roles,
    gender: facilityUser.gender,
    birth_year: facilityUser.birth_year,
    id_number: facilityUser.id_number,
  };
}
