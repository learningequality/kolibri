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
    nonFormalRadioButton: () => wrapper.findAllComponents({ name: 'KRadioButton' }).at(0),
    formalRadioButton: () => wrapper.findAllComponents({ name: 'KRadioButton' }).at(1),
    facilityNameTextbox: () => wrapper.findAllComponents({ name: 'FacilityNameTextbox' }).at(0),
  }
  const actions = {
    simulateSubmit: () => wrapper.findComponent({ name: 'OnboardingForm' }).vm.$emit('submit'),
    selectPreset: preset => wrapper.setData({ selected: preset }),
  };
  jest.spyOn(wrapper.vm, '$emit');
  return { wrapper, store, els, actions };
}

describe('FacilityPermissionsForm', () => {
  it('"non-formal" option is selected by default and facility name textbox is focused', () => {
    const { els } = makeWrapper();
    expect(els.nonFormalRadioButton().vm.isChecked).toEqual(true);
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused.classList.contains('ui-textbox-input')).toBe(true);
  });

  describe('submitting', () => {
    function testVuex(store, wrapper, expected) {
      expect(store.state.onboardingData.facility.name).toEqual(expected.name);
      expect(store.state.onboardingData.preset).toEqual(expected.preset);
      expect(wrapper.vm.$emit).toHaveBeenCalledWith('click_next');
    }

    it('does not submit if "non-formal" and facility name is empty', () => {
      const { els, actions, wrapper } = makeWrapper();
      els.facilityNameTextbox().setData({ facilityName: '' });
      actions.simulateSubmit();
      expect(wrapper.vm.$emit).not.toHaveBeenCalled();
    });

    it('does not submit if "formal" and facility name is empty', () => {
      const { els, actions, wrapper } = makeWrapper();
      actions.selectPreset('formal');
      els.facilityNameTextbox().setData({ facilityName: '' });
      actions.simulateSubmit();
      expect(wrapper.vm.$emit).not.toHaveBeenCalled();
    });

    it('submitting with "non-formal" updates vuex correctly', () => {
      const { els, actions, store, wrapper } = makeWrapper();
      els.facilityNameTextbox().setData({
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
      els.facilityNameTextbox().setData({
        facilityName: 'Formal Facility',
      });
      actions.simulateSubmit();
      testVuex(store, wrapper, {
        name: 'Formal Facility',
        preset: 'formal',
      });
    });
  });
});
