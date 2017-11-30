/* eslint-env mocha */
import { mount } from 'avoriaz';
import assert from 'assert';
import sinon from 'sinon';
import Vue from 'vue-test'; // eslint-disable-line no-unused-vars, import/no-unresolved
import coreSnackbar from 'kolibri.coreVue.components.coreSnackbar';
import connectionSnackbars from '../../src/views/connection-snackbars';
import { ConnectionSnackbars } from '../../src/constants';
import coreStore from 'kolibri.coreVue.vuex.store';

function makeWrapper({ store }) {
  return mount(connectionSnackbars, { store });
}

function showDisconnectedSnackbar(store) {
  store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.DISCONNECTED);
}

function showTryingToReconnectSnackbar(store) {
  store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.TRYING_TO_RECONNECT);
}

function showSuccessfullyReconnectedSnackbar(store) {
  store.dispatch('CORE_SET_CURRENT_SNACKBAR', ConnectionSnackbars.SUCCESSFULLY_RECONNECTED);
}

function setConnected(store, connected) {
  store.dispatch('CORE_SET_CONNECTED', connected);
}

describe('Within the connection snackbars component,', () => {
  describe('the disconnected snackbar', () => {
    it('should be visible if disconnected', () => {
      const store = coreStore.factory();
      const wrapper = makeWrapper({ store });
      showDisconnectedSnackbar(store);
      setConnected(store, false);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('disconnected-snackbar'));
      });
    });
    it('should try to reconnect if the try now button is clicked', () => {
      const store = coreStore.factory();
      const wrapper = makeWrapper({ store });
      showDisconnectedSnackbar(store);
      setConnected(store, false);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        const snackbarButton = snackbar.first('.ui-snackbar__action-button');
        const stub = sinon.stub(wrapper.vm, 'tryToReconnect');
        wrapper.update();
        snackbarButton.trigger('click');
        return wrapper.vm.$nextTick().then(() => {
          assert.ok(stub.calledOnce);
        });
      });
    });
  });
  describe('the trying to reconnect snackbar', () => {
    it('should be visible if trying to reconnect', () => {
      const store = coreStore.factory();
      const wrapper = makeWrapper({ store });
      showTryingToReconnectSnackbar(store);
      setConnected(store, false);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('trying-to-reconnect-snackbar'));
      });
    });
  });
  describe('the successfully reconnected snackbar', () => {
    it('should be visible if successfully reconnected', () => {
      const store = coreStore.factory();
      const wrapper = makeWrapper({ store });
      showSuccessfullyReconnectedSnackbar(store);
      setConnected(store, true);
      return wrapper.vm.$nextTick().then(() => {
        const snackbar = wrapper.first(coreSnackbar);
        assert(snackbar.hasClass('successfully-reconnected-snackbar'));
      });
    });
  });
});
