/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const mutations = require('../../src/state/mutations');
const sinon = require('sinon');
const assert = require('assert');
const ManageContentPage = require('../../src/views/manage-content-page/index.vue');

Vue.use(Vuex);

function makeStore() {
  return new Vuex.Store({
    mutations,
    actions: {
      cancelImportExportWizard() {},
    },
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
    'channels-grid': '<div>Channel Grid</div>',
    'task-status': '<div>Task Status</div>',
    'wizard-import-local': '<div>Wizard</div>',
  };
  const vuex = {
    actions: {
      pollTasksAndChannels() {},
    }
  };
  const Ctor = Vue.extend(ManageContentPage);
  return new Ctor(Object.assign(options, { components, store, vuex })).$mount();
}

describe.only('manage content page index', () => {
  it('clicking "import" goes to "wizard-import-local"', () => {
    // wizard-import-local needs to be renamed
    const vm = makeVm();
    const importButton = vm.$el.querySelector('button[name="import"]');
    simulant.fire(importButton, 'click');

    return Vue.nextTick()
    .then(() => {
      assert.equal(vm.$store.state.pageState.wizardState.page, 'CHOOSE_IMPORT_SOURCE');
    });
  });
});
