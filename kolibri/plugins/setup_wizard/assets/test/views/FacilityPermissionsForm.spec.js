import { mount } from '@vue/test-utils';
import makeStore from '../makeStore';
import FacilityPermissionsForm from '../../src/views/onboarding-forms/FacilityPermissionsForm';

function makeWrapper() {
  const node = document.createElement('app');
  document.body.appendChild(node);
  const store = makeStore();
  const wrapper = mount(FacilityPermissionsForm, {
    attachTo: node,
    store,
    provide: {
      wizardService: {
        state: {
          context: {
            learnerCanCreateAccount: null,
            formalOrNonformal: 'nonformal',
          },
        },
      },
    },
  });
  // prettier-ignore
  const els = {
    nonFormalRadioButton: () => wrapper.findAllComponents({ name: 'KRadioButton' }).at(0),
    formalRadioButton: () => wrapper.findAllComponents({ name: 'KRadioButton' }).at(1),
    facilityNameTextbox: () => wrapper.findAllComponents({ name: 'FacilityNameTextbox' }).at(0),
  }
  jest.spyOn(wrapper.vm, '$emit');
  return { wrapper, store, els };
}

describe('FacilityPermissionsForm', () => {
  it('"non-formal" option is selected by default and facility name textbox is focused', () => {
    const { wrapper, els } = makeWrapper({ preset: 'nonformal' });
    expect(wrapper.vm.selected).toEqual('nonformal');
    expect(els.nonFormalRadioButton().vm.isChecked).toEqual(true);
    const elementThatIsFocused = document.activeElement;
    expect(elementThatIsFocused).toHaveClass('ui-textbox-input');
  });
});
