/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const assert = require('assert');
const simulant = require('simulant');
const sinon = require('sinon');
const Wizard = require('../../src/views/manage-content-page/wizard-export');

Vue.use(Vuex);

function makeStore() {
  return new Vuex.Store({
    state: {
      core: {
        channels: {
          list: [{ id: 'channel_1' }, { id: 'channel_2' }],
        },
      },
      pageState: {
        channelInfo: {},
        wizardState: {
          driveList: [
            { id: 'awesome_drive_1', writable: true },
            { id: 'awesome_drive_2', writable: false },
          ],
          busy: false,
          meta: {},
        },
      },
    },
  });
}

function makeVm(options = {}) {
  const store = options.store || makeStore();
  const vuex = {
    actions: {
      updateWizardLocalDriveList() {},
    },
  };
  const Ctor = Vue.extend(Wizard);
  // to silence errors and allow inspection of $tr output
  Ctor.prototype.$tr = (...x) => x;
  return new Ctor(Object.assign(options, { store, vuex })).$mount();
}

function getElements(vm) {
  return {
    contentSize: () => vm.$el.querySelector('#content-size'),
    driveRadioEl: () => vm.$el.querySelector('div[name="drive-0"]'),
    submitButton: () => vm.$el.querySelector('button[name="submit"]'),
  };
}

describe('export wizard component', () => {
  describe('export statistics', () => {
    it('shows a "wait" message if channel file stats are incomplete', () => {
      const store = makeStore();
      store.state.pageState.channelInfo = { channel_1: {} };
      const vm = makeVm({ store });
      const { contentSize } = getElements(vm);
      const parsed = JSON.parse(contentSize().innerText);
      // sends the argument of $tr exactly
      assert.equal(parsed[0], 'waitForTotalSize');
    });

    it('shows the total size when file stats are completed', () => {
      const store = makeStore();
      const ONE_GB = 1024 ** 3;
      store.state.pageState.channelInfo = {
        channel_1: { totalFileSizeInBytes: ONE_GB },
        channel_2: { totalFileSizeInBytes: ONE_GB * 2 },
      };
      const vm = makeVm({ store });
      const { contentSize } = getElements(vm);
      assert.equal(contentSize().innerText.trim(), '3 GB');
    });
  });

  describe('exporting to a drive', () => {
    it('dispatches a export task with the correct driveId', () => {
      const vm = makeVm();
      const triggerTaskStub = sinon.stub(vm, 'triggerLocalContentExportTask');
      const { driveRadioEl, submitButton } = getElements(vm);
      simulant.fire(driveRadioEl(), 'click');

      return Vue.nextTick()
      .then(() => {
        simulant.fire(submitButton(), 'click');
        return Vue.nextTick();
      })
      .then(() => {
        sinon.assert.calledOnce(triggerTaskStub);
        sinon.assert.calledWith(triggerTaskStub, 'awesome_drive_1');
      });
    });
  });

  // not tested:
  // contents when there are (no) drives
  // that start export button is properly disabled
  // cancel buttons
  // that file stats appear in submit button
});
