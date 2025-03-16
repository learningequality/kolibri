import { computed, ref } from 'vue';
import client from 'kolibri/client';
import heartbeat from 'kolibri/heartbeat';
import { browser, os } from 'kolibri/utils/browserInfo';
import { setServerTime } from 'kolibri/utils/serverClock';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import CatchErrors from 'kolibri/utils/CatchErrors';
import Lockr from 'lockr';
import urls from 'kolibri/urls';
import {
  DisconnectionErrorCodes,
  LoginErrors,
  ERROR_CONSTANTS,
  UPDATE_MODAL_DISMISSED,
 UserKinds } from 'kolibri/constants';

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
  const app_context = computed(() => sessionState.value.app_context);
  const can_manage_content = computed(() => sessionState.value.can_manage_content);
  const facility_id = computed(() => sessionState.value.facility_id);
  const full_name = computed(() => sessionState.value.full_name);
  const id = computed(() => sessionState.value.id);
  const kind = computed(() => sessionState.value.kind);
  const user_id = computed(() => sessionState.value.user_id);
  const full_facility_import = computed(() => sessionState.value.full_facility_import);
  const username = computed(() => sessionState.value.username);

  // Derived state
  const isUserLoggedIn = computed(() => !kind.value.includes('anonymous'));
  const currentUserId = computed(() => user_id.value);
  const isLearnerOnlyImport = computed(() => !full_facility_import.value);
  const isCoach = computed(
    () => kind.value.includes('coach') || kind.value.includes('assignablecoach'),
  );
  const isAdmin = computed(() => kind.value.includes('admin') || kind.value.includes('superuser'));
  const isSuperuser = computed(() => kind.value.includes('superuser'));
  const canManageContent = computed(() => can_manage_content.value);
  const isAppContext = computed(() => app_context.value);
  const isClassCoach = computed(() => kind.value.includes('assignablecoach'));
  const isFacilityCoach = computed(() => kind.value.includes('coach'));
  const isLearner = computed(() => kind.value.includes('learner'));
  const isFacilityAdmin = computed(() => kind.value.includes('admin'));
  const getUserPermissions = computed(() => ({ can_manage_content: can_manage_content.value }));
  const userFacilityId = computed(() => facility_id.value);
  const getUserKind = computed(() => {
    if (isSuperuser.value) return 'SUPERUSER';
    if (isAdmin.value) return 'ADMIN';
    if (isCoach.value) return 'COACH';
    if (isLearner.value) return 'LEARNER';
    return 'ANONYMOUS';
  });
  const userHasPermissions = computed(() => Object.values(getUserPermissions.value).some(Boolean));

  // Login/Logout Functions
  async function login(sessionPayload) {
    Lockr.set(UPDATE_MODAL_DISMISSED, false);
    try {
      await client({
        data: {
          ...sessionPayload,
          active: true,
          browser,
          os,
        },
        url: urls['kolibri:core:session_list'](),
        method: 'post',
      });

      if (!sessionPayload.disableRedirect) {
        if (sessionPayload.next) {
          // OIDC redirect
          redirectBrowser(sessionPayload.next);
        } else {
          // Normal redirect on login
          redirectBrowser();
        }
      }
    } catch (error) {
      const errorsCaught = CatchErrors(error, [
        ERROR_CONSTANTS.INVALID_CREDENTIALS,
        ERROR_CONSTANTS.MISSING_PASSWORD,
        ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED,
        ERROR_CONSTANTS.NOT_FOUND,
      ]);

      if (errorsCaught) {
        if (errorsCaught.includes(ERROR_CONSTANTS.INVALID_CREDENTIALS)) {
          return LoginErrors.INVALID_CREDENTIALS;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.MISSING_PASSWORD)) {
          return LoginErrors.PASSWORD_MISSING;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.PASSWORD_NOT_SPECIFIED)) {
          return LoginErrors.PASSWORD_NOT_SPECIFIED;
        } else if (errorsCaught.includes(ERROR_CONSTANTS.NOT_FOUND)) {
          return LoginErrors.USER_NOT_FOUND;
        }
      } else {
        throw error;
      }
    }
  }

  function logout() {
    redirectBrowser(urls['kolibri:core:logout']());
  }

  async function setUnspecifiedPassword({ username, password, facility }) {
    return client({
      url: urls['kolibri:core:setnonspecifiedpassword'](),
      data: { username, password, facility },
      method: 'post',
    });
  }

  function setSession({ session: newSession, clientNow }) {
    const serverTime = newSession.server_time;
    if (clientNow) {
      setServerTime(serverTime, clientNow);
    }

    // Update module-level state with session data that matches baseSessionState shape
    Object.assign(sessionState.value, {
      app_context: newSession.app_context,
      can_manage_content: newSession.can_manage_content,
      facility_id: newSession.facility_id,
      full_name: newSession.full_name,
      id: newSession.id,
      kind: newSession.kind,
      user_id: newSession.user_id,
      full_facility_import: newSession.full_facility_import,
      username: newSession.username,
    });
  }

  return {
    // Getters
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
    getUserPermissions,
    userFacilityId,
    getUserKind,
    userHasPermissions,
    session,

    // State
    app_context,
    can_manage_content,
    facility_id,
    full_name,
    id,
    kind,
    user_id,
    username,
    full_facility_import,

    // Actions
    login,
    logout,
    setUnspecifiedPassword,
    setSession,
  };
}
