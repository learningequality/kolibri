import { UserKinds } from '../constants';

const baseLoggingState = {
  summary: { progress: 0 },
  session: {},
  mastery: {},
  attempt: {},
};

export const baseSessionState = {
  id: undefined,
  username: '',
  full_name: '',
  user_id: undefined,
  facility_id: undefined,
  kind: [UserKinds.ANONYMOUS],
  can_manage_content: false,
};

const baseConnectionState = {
  connected: true,
  reconnectTime: null,
};

// core state is namespaced, and merged with a particular app's state
export const initialState = {
  core: {
    error: '',
    loading: true,
    title: '',
    pageSessionId: 0,
    session: baseSessionState,
    loginError: null,
    signInBusy: false,
    logging: baseLoggingState,
    totalProgress: null,
    channels: {
      list: [],
      currentId: null,
    },
    facilityConfig: {},
    facilities: [],
    connection: baseConnectionState,
    snackbarIsVisible: false,
    snackbarOptions: {},
  },
};
