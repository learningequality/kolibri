import { useFacilities } from 'kolibri-common/composables/useFacilities';
import profile from './profile';

const { setPageLoading } = useFacilities();

export default {
  state() {
    return {
      pageName: '',
    };
  },
  actions: {
    reset(store) {
      setPageLoading(false);
      store.commit('CORE_SET_ERROR', null);
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
