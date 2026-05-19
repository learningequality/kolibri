import { computed, ref } from 'vue';
import client from 'kolibri/client';
import { browser, os } from 'kolibri/utils/browserInfo';
import { setServerTime } from 'kolibri/utils/serverClock';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import CatchErrors from 'kolibri/utils/CatchErrors';
import Lockr from 'lockr';
import urls from 'kolibri/urls';
import { LoginErrors, ERROR_CONSTANTS, UPDATE_MODAL_DISMISSED, UserKinds } from 'kolibri/constants';
import { handleApiError } from 'kolibri/utils/appError';
import pick from 'lodash/pick';

// Base session state (migrated from session module)
const baseSessionState = {
  app_context: false,
  can_manage_content: false,
  facility_id: undefined,
  full_name: '',
  id: undefined,
  kind: [UserKinds.ANONYMOUS],
  user_id: undefined,
  username: '',
  full_facility_import: true,
};

// Module-level state
const sessionState = ref({ ...baseSessionState });

export default function useUser() {
  // Session state
  const session = computed(() => sessionState.value);
  const full_name = computed(() => sessionState.value.full_name);
  const sessionId = computed(() => sessionState.value.id);
  const kind = computed(() => sessionState.value.kind);
  const username = computed(() => sessionState.value.username);

  // Derived state
  const isUserLoggedIn = computed(() => !kind.value.includes(UserKinds.ANONYMOUS));
  const currentUserId = computed(() => sessionState.value.user_id);
  const isLearnerOnlyImport = computed(() => !sessionState.value.full_facility_import);
  const isCoach = computed(
    () => kind.value.includes(UserKinds.COACH) || kind.value.includes(UserKinds.ASSIGNABLE_COACH),
  );
  const isAdmin = computed(
    () => kind.value.includes(UserKinds.ADMIN) || kind.value.includes(UserKinds.SUPERUSER),
  );
  const isSuperuser = computed(() => kind.value.includes(UserKinds.SUPERUSER));
  const canManageContent = computed(() => sessionState.value.can_manage_content);
  const isAppContext = computed(() => sessionState.value.app_context);
  const isClassCoach = computed(() => kind.value.includes(UserKinds.ASSIGNABLE_COACH));
  const isFacilityCoach = computed(() => kind.value.includes(UserKinds.COACH));
  const isLearner = computed(() => kind.value.includes(UserKinds.LEARNER));
  const isFacilityAdmin = computed(() => kind.value.includes(UserKinds.ADMIN));
  const userPermissions = computed(() => ({ can_manage_content: canManageContent.value }));
  const userFacilityId = computed(() => sessionState.value.facility_id);
  const userKind = computed(() => {
    if (isSuperuser.value) return UserKinds.SUPERUSER;
    if (isAdmin.value) return UserKinds.ADMIN;
    if (isCoach.value) return UserKinds.COACH;
    if (isLearner.value) return UserKinds.LEARNER;
    return UserKinds.ANONYMOUS;
  });
  const userHasPermissions = computed(() => Object.values(userPermissions.value).some(Boolean));

  // Login/Logout Functions
  /**
   * Creates an authenticated session for the given credentials.
   *
   * @param {Object} sessionPayload - Credentials sent to the server.
   * @param {boolean} [prevalidate=false] - When true, validates credentials server-side without
   *   creating a session. Returns { full_name } on success so the caller can confirm the user's
   *   identity before committing to a real login (e.g. the picture-password confirm flow).
   *   Skips the Lockr update-modal flag and all redirect logic.
   * @param {boolean} [enableRedirect=true] - When false, suppresses the post-login redirect,
   *   allowing the caller to handle navigation manually.
   */
  async function login(sessionPayload, prevalidate = false, enableRedirect = true) {
    if (!prevalidate) {
      Lockr.set(UPDATE_MODAL_DISMISSED, false);
    }
    try {
      const response = await client({
        params: prevalidate ? { prevalidate } : undefined,
        data: { ...sessionPayload, active: true, browser, os },
        url: urls['kolibri:core:session_list'](),
        method: 'post',
      });

      if (enableRedirect) {
        // Update session state before redirecting so that bfcache stores the
        // logged-in user_id. If the user navigates back, pollSessionEndPoint
        // will see user_id change to null and trigger signOutDueToInactivity.
        setSession({ session: response.data });

        if (sessionPayload.next) {
          // OIDC redirect
          redirectBrowser(sessionPayload.next);
        } else {
          // Normal redirect on login
          redirectBrowser();
        }
      }
      return { data: response.data, error: null };
    } catch (error) {
      const errorsCaught = CatchErrors(error, [
        ERROR_CONSTANTS.INVALID_CREDENTIALS,
        ERROR_CONSTANTS.MISSING_PASSWORD,
        ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
        ERROR_CONSTANTS.NOT_FOUND,
      ]);

      if (errorsCaught) {
        let loginError;
        if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_CREDENTIALS)) {
          loginError = LoginErrors.INVALID_CREDENTIALS;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.MISSING_PASSWORD)) {
          loginError = LoginErrors.PASSWORD_MISSING;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED)) {
          loginError = LoginErrors.PASSWORD_NOT_SPECIFIED;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.NOT_FOUND)) {
          loginError = LoginErrors.USER_NOT_FOUND;
        }
        return { data: null, error: loginError };
      } else {
        handleApiError({ error });
      }
    }
  }

  function logout() {
    redirectBrowser(urls['kolibri:core:logout']());
  }

  function setSession({ session: newSession, clientNow }) {
    const serverTime = newSession.server_time;
    if (clientNow) {
      setServerTime(serverTime, clientNow);
    }

    sessionState.value = {
      ...sessionState.value,
      // Ensure only base session state keys are present
      ...pick(newSession, Object.keys(baseSessionState)),
    };
  }

  return {
    // Getters
    session,
    isLearnerOnlyImport,
    isUserLoggedIn,
    currentUserId,
    isCoach,
    isAdmin,
    isSuperuser,
    canManageContent,
    isAppContext,
    isClassCoach,
    isFacilityCoach,
    isLearner,
    isFacilityAdmin,
    userPermissions,
    userFacilityId,
    userKind,
    userHasPermissions,

    // State
    full_name,
    sessionId,
    kind,
    username,

    // Actions
    login,
    logout,
    setSession,
  };
}
