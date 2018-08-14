import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import FacilityPermissionsForm from '../../src/views/onboarding-forms/FacilityPermissionsForm';

function makeWrapper() {
  const store = makeStore();
  const wrapper = mount(FacilityPermissionsForm, {
    store,
  });
  // prettier-ignore
  const els = {
    nonFormalRadioButton: () => wrapper.findAll({ name: 'KRadioButton' }).at(0),
    formalRadioButton: () => wrapper.findAll({ name: 'KRadioButton' }).at(1),
    personalRadioButton: () => wrapper.findAll({ name: 'KRadioButton' }).at(2),
    nonFormalTextbox: () => wrapper.findAll({ name: 'FacilityNameTextbox' }).at(0),
    formalTextbox: () => wrapper.findAll({ name: 'FacilityNameTextbox' }).at(1),
  }
  const actions = {
    simulateSubmit: () => wrapper.find({ name: 'OnboardingForm' }).vm.$emit('submit'),
    selectPreset: preset => wrapper.setData({ selectedPreset: preset }),
  };
  jest.spyOn(wrapper.vm, '$emit');
  return { wrapper, store, els, actions };
}

describe('FacilityPermissionsForm', () => {
  it('"non-formal" option is selected by default and facility name textbox is visible', () => {
    const { els } = makeWrapper();
    expect(els.nonFormalRadioButton().vm.isChecked).toEqual(true);
    expect(els.nonFormalTextbox().isVisible()).toEqual(true);
  });

  it('selecting "formal" shows facility name textbox', () => {
    const { els, actions } = makeWrapper();
    actions.selectPreset('formal');
    expect(els.nonFormalRadioButton().vm.isChecked).toEqual(false);
    expect(els.nonFormalTextbox().isVisible()).toEqual(false);
    expect(els.formalRadioButton().vm.isChecked).toEqual(true);
    expect(els.formalTextbox().isVisible()).toEqual(true);
  });

  it('selecting "personal" does not show any textboxes', () => {
    const { els, actions } = makeWrapper();
    actions.selectPreset('informal');
    expect(els.personalRadioButton().vm.isChecked).toEqual(true);
    expect(els.nonFormalTextbox().isVisible()).toEqual(false);
    expect(els.formalTextbox().isVisible()).toEqual(false);
  });

  describe('submitting', () => {
    function testVuex(store, wrapper, expected) {
      expect(store.state.onboardingData.facility.name).toEqual(expected.name);
      expect(store.state.onboardingData.preset).toEqual(expected.preset);
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('submit');
    }

    it('does not submit if "non-formal" and facility name is empty', () => {
      const { els, actions, wrapper } = makeWrapper();
      els.nonFormalTextbox().setData({ facilityName: '' });
      els.formalTextbox().setData({ facilityName: 'Unused Name' });
      actions.simulateSubmit();
      expect(wrapper.vm.$emit).not.toHaveBeenCalled();
    });

    it('does not submit if "formal" and facility name is empty', () => {
      const { els, actions, wrapper } = makeWrapper();
      actions.selectPreset('formal');
      els.formalTextbox().setData({ facilityName: '' });
      els.nonFormalTextbox().setData({ facilityName: 'Unused Name' });
      actions.simulateSubmit();
      expect(wrapper.vm.$emit).not.toHaveBeenCalled();
    });

    it('submitting with "non-formal" updates vuex correctly', () => {
      const { els, actions, store, wrapper } = makeWrapper();
      els.nonFormalTextbox().setData({
        facilityName: 'Non-Formal Facility',
      });
      actions.simulateSubmit();
      testVuex(store, wrapper, {
        name: 'Non-Formal Facility',
        preset: 'nonformal',
      });
    });

    it('submitting with "formal" updates vuex correctly', () => {
      const { els, actions, store, wrapper } = makeWrapper();
      actions.selectPreset('formal');
      els.formalTextbox().setData({
        facilityName: 'Formal Facility',
      });
      actions.simulateSubmit();
      testVuex(store, wrapper, {
        name: 'Formal Facility',
        preset: 'formal',
      });
    });

    it('submitting with "personal" updates vuex correctly', () => {
      const { actions, store, wrapper } = makeWrapper();
      actions.selectPreset('informal');
      actions.simulateSubmit();
      testVuex(store, wrapper, {
        name: '',
        preset: 'informal',
      });
    });
  });
});
