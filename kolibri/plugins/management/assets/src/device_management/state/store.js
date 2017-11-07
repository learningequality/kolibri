import Vuex from 'kolibri.lib.vuex';
import * as coreStore from 'kolibri.coreVue.vuex.store';
import mutations from './mutations';

const initialState = {
  pageName: '',
  pageState: {},
  welcomeModalVisible: false,
  taskList: [],
};

export default new Vuex.Store({
  state: Object.assign(initialState, coreStore.initialState),
  mutations: Object.assign(mutations, coreStore.mutations),
});
