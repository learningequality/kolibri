/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const mutations = require('../../src/state/mutations');
const assert = require('assert');
const ManageContentPage = require('../../src/views/manage-content-page/index.vue');

Vue.use(Vuex);

function makeStore() {
  return new Vuex.Store({
    mutations,
    state: {
      core: {
        channels: {
          list: [],
        },
        session: {
          kind: ['superuser'],
        },
      },
      pageState: {
        taskList: [],
        wizardState: {},
      },
    },
  });
}

function makeVm(options = {}) {
  const store = options.store || makeStore();
  const components = {
    'channels-grid': '<div>Channels Grid</div>',
    'task-status': '<div>Task Status</div>',
    'wizard-import-choose-source': '<div>Choose Source Wizard</div>',
    'wizard-export': '<div>Export Wizard</div>',
  };
  const vuex = {
    actions: {
      pollTasksAndChannels() {},
    }
  };
  const Ctor = Vue.extend(ManageContentPage);
  return new Ctor(Object.assign(options, { components, store, vuex })).$mount();
}

describe('manage content page index', () => {
  it('clicking "import" goes to "wizard-import-choose-source"', () => {
    const vm = makeVm();
    const importButton = vm.$el.querySelector('button[name="import"]');
    simulant.fire(importButton, 'click');

    return Vue.nextTick()
    .then(() => {
      assert.equal(vm.wizardComponent, 'wizard-import-choose-source');
    });
  });

  it('clicking "export" goes to "wizard-export"', () => {
    const vm = makeVm();
    const importButton = vm.$el.querySelector('button[name="export"]');
    simulant.fire(importButton, 'click');

    return Vue.nextTick()
    .then(() => {
      assert.equal(vm.wizardComponent, 'wizard-export');
    });
  });
});
