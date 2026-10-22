import { unref } from 'vue';
import GlobalStore from 'kolibri/composables/GlobalStore';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';

/**
 * The set of facilities known to this device.
 */
export class FacilitiesStore extends GlobalStore {
  static dependencies = { user: useUser };

  _facilities = [];

  /**
   * The cached list of facilities.
   * @returns {object[]}
   */
  get facilities() {
    return this._facilities;
  }

  /**
   * Whether more than one facility is cached.
   * @returns {boolean}
   */
  get hasMultipleFacilities() {
    return this._facilities.length > 1;
  }

  /**
   * Whether the user is a superuser with access to multiple facilities.
   * @returns {boolean}
   */
  get userIsMultiFacilityAdmin() {
    return this.user.isSuperuser && this.hasMultipleFacilities;
  }

  /**
   * Get a particular facility from the cache
   * @param {import('vue').Ref<string>|string} facilityId - The ID of the facility to look up.
   * @returns {object | undefined} The cached facility, or undefined when not cached.
   */
  getFacility(facilityId) {
    return this._facilities.find(f => f.id === unref(facilityId));
  }

  /**
   * Fetch all facilities from the backend
   * @returns {Promise<void>}
   */
  async fetchFacilities() {
    this._facilities = await FacilityResource.list();
  }

  /**
   * Fetch a single facility from the backend and cache it
   * @param {import('vue').Ref<string>|string} facilityId - The ID of the facility to fetch.
   * @returns {Promise<void>}
   */
  async fetchFacility(facilityId) {
    const facility = await FacilityResource.retrieve(unref(facilityId));
    const index = this._facilities.findIndex(f => f.id === facility.id);
    if (index === -1) {
      this._facilities.push(facility);
    } else {
      this._facilities.splice(index, 1, { ...this._facilities[index], ...facility });
    }
  }
}

export default FacilitiesStore.use;
