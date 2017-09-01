import Vue from 'vue';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';
import mutations from './mutations';
import initialState from './initialState';

Vue.use(Vuex);

export default function makeStore() {
  return new Vuex.Store({
    mutations,
    state: cloneDeep(initialState),
  });
}
