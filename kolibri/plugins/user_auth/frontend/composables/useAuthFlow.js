import { unref } from 'vue';
import { useLocalStorage, StorageSerializers } from '@vueuse/core';
import GlobalStore from 'kolibri/composables/GlobalStore';
import { handleApiError } from 'kolibri/utils/appError';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { FacilitiesStore } from 'kolibri-common/composables/useFacilities';
import { useFacilitySelect, useFacilityConfig } from 'kolibri-common/composables/useFacility';

/**
 * The state for the authentication flow and its pages
 */
export class AuthFlowStore extends GlobalStore {
  static dependencies = {
    facilitiesStore: FacilitiesStore,
    // Uses optional synchronization through localStorage, meaning all pages using this will be
    // synchronized to this facility selection state
    facilitySelect: () => useFacilitySelect(true),
    config: () => useFacilityConfig(null),
  };

  // Global initialization state to prevent unnecessary repeated API calls
  _initialized = false;

  // The user's last chosen sign-in method persisted in local storage
  _persistentSignInMethod = useLocalStorage('signInMethod', null, {
    serializer: StorageSerializers.string,
  });

  /**
   * The facilities known to this device.
   * @returns {object[]}
   */
  get facilities() {
    return this.facilitiesStore.facilities;
  }

  /**
   * Whether more than one facility is known to this device.
   * @returns {boolean}
   */
  get hasMultipleFacilities() {
    return this.facilitiesStore.hasMultipleFacilities;
  }

  /**
   * The selected facility's dataset config.
   * @returns {object}
   */
  get facilityConfig() {
    return this.config.facilityConfig;
  }

  /**
   * The sign-in options enabled for the selected facility.
   * @returns {string[]}
   */
  get signInOptions() {
    return this.config.signInOptions;
  }

  /**
   * The facility that should be activated for sign-in, either the previously selected or default
   * if there is only one facility
   * @returns {string|null}
   */
  get facilityId() {
    // Previously chosen facility ID takes precedence
    if (this.facilitySelect.selectedFacilityId) {
      return this.facilitySelect.selectedFacilityId;
    }
    // Without a previously chosen facility, we cannot default to one if the device has multiple
    if (this.hasMultipleFacilities) {
      return null;
    }
    // Return the first facility's ID otherwise
    return this.facilities[0]?.id || null;
  }

  set facilityId(value) {
    this.facilitySelect.setSelectedFacilityId(value);
  }

  /**
   * The facility selected by `facilityId`.
   * @returns {object|null}
   */
  get selectedFacility() {
    return this.facilityId ? this.facilitiesStore.getFacility(this.facilityId) : null;
  }

  /**
   * The sign-in method, either previously chosen by the user, or the default according to facility
   * settings
   * @returns {string}
   */
  get signInMethod() {
    // Previously chosen sign-in method takes precedence if enabled
    if (this._persistentSignInMethod && this.signInOptions.includes(this._persistentSignInMethod)) {
      return this._persistentSignInMethod;
    }
    // Picture password sign-in is the default if enabled
    if (this.signInOptions.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
      return OptionsForSignIn.PICTURE_PASSWORD;
    }
    // otherwise there should be only one method
    return this.signInOptions[0];
  }

  set signInMethod(value) {
    // Persist the sign-in method for the user in local storage
    this._persistentSignInMethod = value;
  }

  /**
   * Whether a user can sign up with any facility.
   * @returns {boolean}
   */
  get canSignUpWithAnyFacility() {
    // TODO: this doesn't incorporate `is_full_facility_import` since that is only available on the
    // dataset API. Once the nested `.dataset` is consistent with that API, we can correct this.
    return this.facilities.some(f => f.dataset?.learner_can_sign_up);
  }

  /**
   * Whether a user can sign up with the active/selected facility.
   * @returns {boolean}
   */
  get canSignUpWithFacility() {
    return (
      this.selectedFacility &&
      this.facilityConfig.is_full_facility_import &&
      this.facilityConfig.learner_can_sign_up
    );
  }

  /**
   * Whether a user can sign up, either with the active facility if set, or any facility otherwise.
   * @returns {boolean}
   */
  get canSignUp() {
    if (this.selectedFacility) {
      return this.canSignUpWithFacility;
    }
    return this.canSignUpWithAnyFacility;
  }

  /**
   * The icon style for picture password sign-in.
   * @returns {string|null}
   */
  get picturePasswordStyle() {
    return this.config.picturePasswordSettings?.icon_style;
  }

  /**
   * Whether picture password icons show their text.
   * @returns {boolean}
   */
  get picturePasswordShowIconText() {
    return this.config.picturePasswordSettings?.show_icon_text;
  }

  /**
   * Set the active facility ID
   * @param {import('vue').Ref<string>|string} facilityId - The facility ID to activate.
   * @returns {Promise<void>}
   */
  async setFacilityId(facilityId) {
    try {
      // fetch updated config first, then update the selected facility
      await this.config.fetchFacilityConfig(facilityId);
    } catch (error) {
      handleApiError({ error, reloadOnReconnect: true });
    }

    // Since things watch this, leave this til last
    this.facilityId = unref(facilityId);
  }

  /**
   * Initializes the sign-in flow state
   * @param {boolean} [force] - Re-run initialization even if it has already run.
   * @returns {Promise<void>}
   */
  async initializeFlow(force = false) {
    if (this._initialized && !force) return;

    this._initialized = true;

    try {
      await this.facilitiesStore.fetchFacilities();
    } catch (error) {
      handleApiError({ error, reloadOnReconnect: true });
    }

    if (!this.facilityId) return;

    // this could occur in development, or otherwise this could occur with a removed facility and/or
    // the persisted value hasn't been set yet
    if (!this.selectedFacility || this.facilityId !== this.facilitySelect.selectedFacilityId) {
      // double check facility exists
      const hasFacility = Boolean(this.facilitiesStore.getFacility(this.facilityId));
      this.facilitySelect.setSelectedFacilityId(hasFacility ? this.facilityId : null);
    }

    try {
      await this.config.fetchFacilityConfig(this.facilityId);
    } catch (error) {
      handleApiError({ error, reloadOnReconnect: true });
    }
  }
}

export default AuthFlowStore.use;
