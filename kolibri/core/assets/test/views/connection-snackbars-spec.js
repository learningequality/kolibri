/* eslint-env mocha */
import Vue from 'vue-test';
import { mount } from 'avoriaz';
import assert from 'assert';
import Vuex from 'vuex';
import sinon from 'sinon';
import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
import connectionSnackbars from '../../src/views/connection-snackbars';
import {
  tryToReconnect,
  showDisconnectedSnackbar,
  showTryingToReconnectSnackbar,
  showSuccessfullyReconnectedSnackbar,
} from '../../src/state/actions';

const createStore = () =>
  new Vuex.Store({
    state: {
      core: {
        connection: {
          connected: true,
          reconnectTime: null,
        },
        currentSnackbar: null,
      },
    },
    mutations: {
      CORE_SET_CURRENT_SNACKBAR(state, snackbar) {
        state.core.currentSnackbar = snackbar;
      },
    },
  });

function makeWrapper({ propsData = {}, store = {} }) {
  return mount(connectionSnackbars, { propsData, store });
}

describe('Within the connection snackbars component,', () => {
  describe('the disconnected snackbar', () => {
    it('should be visible if disconnected', () => {
      const store = createStore();
      const wrapper = makeWrapper({ store });
      showDisconnectedSnackbar(store);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('disconnected-snackbar'));
      });
    });
    it('should try to reconnect if the try now button is clicked', () => {
      const store = createStore();
      const wrapper = makeWrapper({ store });
      showDisconnectedSnackbar(store);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        const snackbarButton = snackbar.first('.ui-snackbar__action-button');
        snackbarButton.trigger('click');
        // TODO spy action correctly
        // const spy = sinon.spy(wrapper.vm, 'tryToReconnect');
        return wrapper.vm.$nextTick().then(() => {
          // sinon.assert.calledOnce(spy);
          const snackbar = wrapper.first(coreSnackbar);
          assert(snackbar.hasClass('trying-to-reconnect-snackbar'));
        });
      });
    });
  });
  describe('the trying to reconnect snackbar', () => {
    it('should be visible if trying to reconnect', () => {
      const store = createStore();
      const wrapper = makeWrapper({ store });
      showTryingToReconnectSnackbar(store);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('trying-to-reconnect-snackbar'));
      });
    });
  });
  describe('the successfully reconnected snackbar', () => {
    it('should be visible if successfully reconnected', () => {
      const store = createStore();
      const wrapper = makeWrapper({ store });
      showSuccessfullyReconnectedSnackbar(store);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('successfully-reconnected-snackbar'));
      });
    });
  });
});
