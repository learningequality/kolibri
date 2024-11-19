import { ref, computed } from '@vue/composition-api';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import CatchErrors from 'kolibri/utils/CatchErrors';
import Lockr from 'lockr';
import some from 'lodash/some';
import pick from 'lodash/pick';
import { setServerTime } from 'kolibri/utils/serverClock';
import {
  UserKinds,
  ERROR_CONSTANTS,
  LoginErrors,
  UPDATE_MODAL_DISMISSED
} from 'kolibri/constants';
import { browser, os } from 'kolibri/utils/browserInfo';

// Module level state
const session = ref({
  app_context: false,
  can_manage_content: false,
  facility_id: undefined,
  full_name: '',
  id: undefined,
  kind: [UserKinds.ANONYMOUS],
  user_id: undefined,
  username: '',
  full_facility_import: true,
});

export default function useUser() {
  // Computed properties (former Vuex getters)
  const isUserLoggedIn = computed(() => session.value.id !== undefined);
  const currentUserId = computed(() => session.value.user_id);
  const isLearnerOnlyImport = computed(() => !session.value.full_facility_import);
  const isCoach = computed(() =>
    session.value.kind.some(kind =>
      [UserKinds.COACH, UserKinds.ASSIGNABLE_COACH].includes(kind)
    )
  );
  const isAdmin = computed(() =>
    session.value.kind.some(kind =>
      [UserKinds.ADMIN, UserKinds.SUPERUSER].includes(kind)
    )
  );
  const isSuperuser = computed(() => session.value.kind.includes(UserKinds.SUPERUSER));
  const canManageContent = computed(() =>
    session.value.kind.includes(UserKinds.CAN_MANAGE_CONTENT)
  );
  const isAppContext = computed(() => session.value.app_context);
  const isClassCoach = computed(() => session.value.kind.includes(UserKinds.ASSIGNABLE_COACH));
  const isFacilityCoach = computed(() => session.value.kind.includes(UserKinds.COACH));
  const isFacilityAdmin = computed(() => session.value.kind.includes(UserKinds.ADMIN));
  const userIsMultiFacilityAdmin = computed((rootState) =>
    isSuperuser.value && rootState.core.facilities.length > 1);
  const getUserPermissions = computed(() => {
    const permissions = {};
    permissions.can_manage_content = canManageContent.value;
    return permissions;
  });
  const isLearner = computed(() => session.value.kind.includes(UserKinds.LEARNER));
  const userFacilityId = computed(() => session.value.facility_id);
  const getUserKind = computed(() => session.value.kind[0]);
  const userHasPermissions = computed(() => some(getUserPermissions.value));


  // Actions
  async function kolibriLogin(sessionPayload) {
    Lockr.set(UPDATE_MODAL_DISMISSED, false);

    try {
      await client({
        data: {
          ...sessionPayload,
          active: true,
          browser,
          os,
        },
        url: urls['kolibri:core:session-list'](),
        method: 'post',
      });

      if (!sessionPayload.disableRedirect) {
        if (sessionPayload.next) {
          redirectBrowser(sessionPayload.next);
        } else {
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
      }
      throw error;
    }
  }

  function kolibriLogout() {
    redirectBrowser(urls['kolibri:core:logout']());
  }

  function setSession({ session: newSession, clientNow }) {
    const serverTime = newSession.server_time;
    if (clientNow) {
      setServerTime(serverTime, clientNow);
    }
    const filteredSession = pick(newSession, Object.keys(session));
    session.value = {
      ...session.value,
      ...filteredSession,
    };
  }


  async function kolibrisetUnspecifiedPassword({ username, password, facility }) {
    return client({
      url: urls['kolibri:core:setnonspecifiedpassword'](),
      data: { username, password, facility },
      method: 'post',
    });
  }

  return {

    // Computed
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
    userIsMultiFacilityAdmin,
    getUserPermissions,
    userFacilityId,
    getUserKind,
    userHasPermissions,
    session,

    // Actions
    kolibriLogin,
    kolibriLogout,
    setSession,
    kolibrisetUnspecifiedPassword,
  };
}
