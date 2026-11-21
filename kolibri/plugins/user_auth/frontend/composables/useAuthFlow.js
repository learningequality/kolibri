import { computed, ref, unref } from 'vue';
import { useLocalStorage, StorageSerializers } from '@vueuse/core';
import { handleApiError } from 'kolibri/utils/appError';
import useUser from 'kolibri/composables/useUser';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { useFacilitySelect, useFacilityConfig } from 'kolibri-common/composables/useFacility';
import FacilityUsernameResource from '../apiResources/FacilityUsernameResource';

/**
 * Global initialization state to prevent unnecessary repeated API calls. Having all the composables
 * state global makes testing challenging
 * @type {import('vue').Ref<boolean>}
 * @private
 */
const _initialized = ref(false);

// Uses optional synchronization through localStorage, meaning all pages using this will be
// synchronized to this facility selection state
const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect(true);
const { facilities, hasMultipleFacilities, fetchFacilities, getFacility } = useFacilities();
const { facilityConfig, signInOptions, picturePasswordSettings, fetchFacilityConfig } =
  useFacilityConfig(null);

const _savedFacilityId = computed(() => {
  // Previously chosen facility ID takes precedence
  if (selectedFacilityId.value) {
    return selectedFacilityId.value;
  }
  // Without a previously chosen facility, we cannot default to one if the device has multiple
  if (hasMultipleFacilities.value) {
    return null;
  }
  // Return the first facility's ID otherwise
  return facilities.value[0]?.id || null;
});

const _facilityIdForThisVisit = ref(null);
const _signInMethodForThisVisit = ref(null);

function _endThisVisitsChoices() {
  _facilityIdForThisVisit.value = null;
  _signInMethodForThisVisit.value = null;
}

/**
 * @type {import('vue').WritableComputedRef<string|null>}
 */
const facilityId = computed({
  get() {
    return _facilityIdForThisVisit.value || _savedFacilityId.value;
  },
  set(value) {
    _endThisVisitsChoices();
    setSelectedFacilityId(value);
  },
});

/**
 * The facility selected by `facilityId`
 * @type {import('vue').ComputedRef<object|null>}
 */
const selectedFacility = computed(() => (facilityId.value ? getFacility(facilityId.value) : null));

/**
 * The user's last chosen sign-in method persisted in local storage
 * @type {import('@vueuse/core').RemovableRef<string|null>}
 * @private
 */
const _persistentSignInMethod = useLocalStorage('signInMethod', null, {
  serializer: StorageSerializers.string,
});

/**
 * The sign-in method, either previously chosen by the user, or the default according to facility
 * settings
 * @type {import('vue').WritableComputedRef<string>}
 */
const signInMethod = computed({
  get() {
    if (_signInMethodForThisVisit.value) {
      return _signInMethodForThisVisit.value;
    }
    // Previously chosen sign-in method takes precedence if enabled
    if (
      _persistentSignInMethod.value &&
      signInOptions.value.includes(_persistentSignInMethod.value)
    ) {
      return _persistentSignInMethod.value;
    }
    // Picture password sign-in is the default if enabled
    if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
      return OptionsForSignIn.PICTURE_PASSWORD;
    }
    // otherwise there should be only one method
    return signInOptions.value[0];
  },
  set(value) {
    _signInMethodForThisVisit.value = null;
    // Persist the sign-in method for the user in local storage
    _persistentSignInMethod.value = value;
  },
});

/**
 * Whether a user can sign up with any facility
 * @type {import('vue').ComputedRef<boolean>}
 */
const canSignUpWithAnyFacility = computed(() => {
  // TODO: this doesn't incorporate `is_full_facility_import` since that is only available on the
  // dataset API. Once the nested `.dataset` is consistent with that API, we can correct this.
  return facilities.value.some(f => f.dataset?.learner_can_sign_up);
});

/**
 * Whether a user can sign up with the active/selected facility
 * @type {import('vue').ComputedRef<boolean>}
 */
const canSignUpWithFacility = computed(() => {
  return (
    selectedFacility.value &&
    facilityConfig.value.is_full_facility_import &&
    facilityConfig.value.learner_can_sign_up
  );
});

/**
 * Whether a user can sign up, either with the active facility if set, or any facility otherwise
 * @type {import('vue').ComputedRef<boolean>}
 */
const canSignUp = computed(() => {
  if (selectedFacility.value) {
    return canSignUpWithFacility.value;
  }
  return canSignUpWithAnyFacility.value;
});

/**
 * @type {import('vue').ComputedRef<string|null>}
 */
const picturePasswordStyle = computed(() => {
  return picturePasswordSettings.value?.icon_style;
});

/**
 * @type {import('vue').ComputedRef<boolean>}
 */
const picturePasswordShowIconText = computed(() => {
  return picturePasswordSettings.value?.show_icon_text;
});

let _pendingOSUsername = null;

function takeOSUsername() {
  const username = _pendingOSUsername;
  _pendingOSUsername = null;
  return _facilityIdForThisVisit.value ? username : null;
}

/**
 * Set the active facility ID
 * @param {import('vue').Ref<string>|string} _facilityId - The facility ID to activate.
 * @returns {Promise<void>}
 */
async function setFacilityId(_facilityId) {
  try {
    // fetch updated config first, then update the selected facility
    await fetchFacilityConfig(_facilityId);
  } catch (error) {
    handleApiError({ error, reloadOnReconnect: true });
  }

  // Since things watch this, leave this til last
  facilityId.value = unref(_facilityId);
}

function saveFacilityId() {
  setSelectedFacilityId(_savedFacilityId.value);
}

/**
 * Initializes the sign-in flow state
 * @param {boolean} [force] - Re-run initialization even if it has already run.
 * @returns {Promise<void>}
 */
async function initializeFlow(force = false) {
  if (_initialized.value && !force) return;

  _initialized.value = true;

  const osUserRequest =
    !force && useUser().isAppContext.value
      ? FacilityUsernameResource.osuser().catch(() => null)
      : null;

  try {
    await fetchFacilities();
  } catch (error) {
    handleApiError({ error, reloadOnReconnect: true });
  }

  const osUser = await osUserRequest;
  if (osUser && getFacility(osUser.facility)) {
    _pendingOSUsername = osUser.username;
    _facilityIdForThisVisit.value = osUser.facility;
    _signInMethodForThisVisit.value = OptionsForSignIn.USERNAME_ONLY;
  }

  if (_facilityIdForThisVisit.value && !getFacility(_facilityIdForThisVisit.value)) {
    _endThisVisitsChoices();
  }

  if (!facilityId.value) return;

  // this could occur in development, or otherwise this could occur with a removed facility and/or
  // the persisted value hasn't been set yet
  if (
    _savedFacilityId.value &&
    (!getFacility(_savedFacilityId.value) || _savedFacilityId.value !== selectedFacilityId.value)
  ) {
    // double check facility exists
    const hasFacility = Boolean(getFacility(_savedFacilityId.value));
    setSelectedFacilityId(hasFacility ? _savedFacilityId.value : null);
  }

  try {
    await fetchFacilityConfig(facilityId);
  } catch (error) {
    handleApiError({ error, reloadOnReconnect: true });
  }
}

/**
 * Composable managing the state for the authentication flow and its pages
 * @returns {object} The authentication-flow state and its action helpers.
 */
export default function useAuthFlow() {
  return {
    facilities,
    facilityId,
    selectedFacility,
    facilityConfig,
    hasMultipleFacilities,
    signInMethod,
    signInOptions,
    canSignUp,
    canSignUpWithAnyFacility,
    canSignUpWithFacility,
    picturePasswordStyle,
    picturePasswordShowIconText,
    takeOSUsername,
    initializeFlow,
    setFacilityId,
    saveFacilityId,
  };
}
