/* eslint-env mocha */
const Vue = require('vue-test');
const Vuex = require('vuex');
const simulant = require('simulant');
const assert = require('assert');
const sinon = require('sinon');
const Wizard = require('../../src/views/manage-content-page/wizard-import-choose-source');

Vue.use(Vuex);

function makeVm(options = {}) {
  const store = new Vuex.Store({
    mutations: {
      SET_CONTENT_PAGE_WIZARD_STATE() {},
      SET_CONTENT_PAGE_WIZARD_BUSY() {},
    },
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
  const Ctor = Vue.extend(Wizard);
  return new Ctor(Object.assign(options, { store })).$mount();
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

describe('choose source wizard component', () => {
  describe('selecting an internet source', () => {
    it('sets the correct source when "internet" is selected', () => {
      const vm = makeVm();
      // targeting the div containing the Radio element
      const { internetRadioEl } = getElements(vm);
      simulant.fire(internetRadioEl(), 'click');
      return Vue.nextTick()
      .then(() => {
        assert.equal(vm.selectedDrive, 'internet_source');
      });
    });

    it('calls the network import wizard when "next" is clicked', () => {
      const vm = makeVm({ data: { selectedDrive: 'internet_source' } });
      const showWizardSpy = sinon.spy(vm, 'showImportNetworkWizard');
      const { nextButton } = getElements(vm);
      simulant.fire(nextButton(), 'click');
      return Vue.nextTick()
      .then(() => {
        sinon.assert.calledOnce(showWizardSpy);
      });
    });
  });

  describe('selecting a local source', () => {
    it('sets the correct source when a drive is selected', () => {
      const vm = makeVm();
      const { driveRadioEl } = getElements(vm);
      simulant.fire(driveRadioEl(), 'click');
      return Vue.nextTick()
      .then(() => {
        assert.equal(vm.selectedDrive, 'awesome_drive_1');
      });
    });

    it('clicking "next" calls the import preview wizard', () => {
      const vm = makeVm({ data: { selectedDrive: 'awesome_drive_2' } });
      const showPreviewStub = sinon.stub(vm, 'showLocalImportPreview');
      const { nextButton } = getElements(vm);
      simulant.fire(nextButton(), 'click');
      return Vue.nextTick()
      .then(() => {
        sinon.assert.calledOnce(showPreviewStub);
        sinon.assert.calledWith(showPreviewStub, {
          driveId: 'awesome_drive_2',
          driveName: 'Toshiba E:',
          channels: [1, 2],
        });
      });
    });

    // not tested: clicking disabled drive is noop
  });
});
