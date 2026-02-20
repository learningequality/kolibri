import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import makeStore from '../../__tests__/utils/makeStore';
import FacilityPermissionsForm from '../onboarding-forms/FacilityPermissionsForm';

const renderComponent = (props = {}) => {
  const store = makeStore();

  return render(FacilityPermissionsForm, {
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
    ...props,
  });
};

describe('FacilityPermissionsForm', () => {
  it('"non-formal" option is selected by default and facility name textbox is focused', () => {
    renderComponent();

    const nonFormalRadio = screen.getByRole('radio', { name: /non-formal/i });
    expect(nonFormalRadio).toBeChecked();

    const facilityInput = screen.getByRole('textbox', { name: /facility name/i });
    expect(facilityInput).toHaveFocus();
  });
});