import { useFacilities } from 'kolibri-common/composables/useFacilities';
import profile from './profile';

const { setPageLoading, setError } = useFacilities();

export default {
  state() {
    return {
      pageName: '',
    };
  },
  actions: {
    reset() {
      setPageLoading(false);
      setError(null);
    },
    resetModuleState(store) {
      store.commit('profile/RESET_STATE');
    },
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
  },
  modules: {
    profile,
  },
};
