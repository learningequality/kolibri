/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const assert = require('assert');
const sinon = require('sinon');
const mutations = require('../../src/state/mutations');
const Wizard = require('../../src/views/manage-content-page/wizard-import-choose-source');

Vue.use(Vuex);

function makeStore() {
  return new Vuex.Store({
    mutations,
    state: {
      pageState: {
        wizardState: {
          driveList: [
            {
              id: 'awesome_drive_1',
              metadata: { channels: [1, 2] }, // enabled drive
            },
            {
              id: 'awesome_drive_2',
              name: 'Toshiba E:',
              metadata: { channels: [1, 2] }, // enabled drive
            },
            {
              id: 'empty_drive',
              metadata: { channels: [] }, // disabled drive
            },
          ],
          busy: false,
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
  return new Ctor(Object.assign(options, { store, vuex })).$mount();
}

function getElements(vm) {
  return {
    // the divs containing the radio elements are targeted, no the radios themselves
    driveRadioEl: () => vm.$el.querySelector('div[name="drive-0"]'),
    drive2RadioEl: () => vm.$el.querySelector('div[name="drive-1"]'),
    internetRadioEl: () => vm.$el.querySelector('div[name="internet_source"]'),
    nextButton: () => vm.$el.querySelector('button[name="next"]'),
  };
}

const getWizardState = (state) => state.pageState.wizardState;

describe('choose source wizard component', () => {
  describe('when internet source is selected', () => {
    it('selectedDrive prop is correct', () => {
      const vm = makeVm();
      const { internetRadioEl } = getElements(vm);
      simulant.fire(internetRadioEl(), 'click');
      return Vue.nextTick()
      .then(() => {
        assert.equal(vm.selectedDrive, 'internet_source');
      });
    });

    it('calls the network import wizard when "next" is clicked', () => {
      const vm = makeVm({ data: { selectedDrive: 'internet_source' } });
      const { nextButton } = getElements(vm);
      simulant.fire(nextButton(), 'click');
      return Vue.nextTick()
      .then(() => {
        const expectedState = {
          page: 'IMPORT_NETWORK'
        };
        sinon.assert.match(getWizardState(vm.$store.state), sinon.match(expectedState));
      });
    });
  });

  describe('when a local source is selected', () => {
    it('selectedDrive props is correct', () => {
      const vm = makeVm();
      const { driveRadioEl } = getElements(vm);
      simulant.fire(driveRadioEl(), 'click');
      return Vue.nextTick()
      .then(() => {
        assert.equal(vm.selectedDrive, 'awesome_drive_1');
      });
    });

    it('calls the import preview wizard when "next" is clicked', () => {
      const vm = makeVm({ data: { selectedDrive: 'awesome_drive_2' } });
      const { nextButton } = getElements(vm);
      simulant.fire(nextButton(), 'click');
      return Vue.nextTick()
      .then(() => {
        const expectedState = {
          page: 'IMPORT_PREVIEW',
          meta: {
            sourceType: 'local',
            sourceName: 'Toshiba E:',
            channels: [1, 2],
          },
        };
        sinon.assert.match(getWizardState(vm.$store.state), sinon.match(expectedState));
      });
    });

    // not tested:
    // cancel button
    // submit button validation
    // drive-list contents
    // refresh button
  });
});
