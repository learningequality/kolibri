import { render, screen, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import makeStore from '../../__tests__/utils/makeStore';
import FacilityPermissionsForm from '../onboarding-forms/FacilityPermissionsForm';

describe('FacilityPermissionsForm', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  });

  const renderComponent = (props = {}) => {
    const store = makeStore();

    return render(FacilityPermissionsForm, {
      store,
      container,
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

  it('"non-formal" option is selected by default and facility name textbox is focused', async () => {
    renderComponent({ preset: 'nonformal' });

    const nonFormalRadio = screen.getByRole('radio', { name: /non-formal/i });
    expect(nonFormalRadio).toBeChecked();

    await waitFor(() => {
      const facilityInput = screen.getByRole('textbox', { name: /facility name/i });
      expect(facilityInput).toHaveFocus();
    });
  });
});
