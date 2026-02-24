import { render, screen, waitFor } from '@testing-library/vue';
import '@testing-library/jest-dom';
import makeStore from '../../__tests__/utils/makeStore';
import FacilityPermissionsForm from '../onboarding-forms/FacilityPermissionsForm';

describe('FacilityPermissionsForm', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const renderComponent = () => {
    const store = makeStore();

    return render(FacilityPermissionsForm, {
      store,
      container: document.body.appendChild(document.createElement('div')),
      provide: {
        wizardService: {
          send: jest.fn(),
          state: {
            context: {
              learnerCanCreateAccount: null,
              formalOrNonformal: 'nonformal',
              facilityName: '',
            },
          },
        },
      },
    });
  };

  it('"non-formal" option is selected by default and facility name textbox is focused', async () => {
    renderComponent();

    const nonFormalRadio = screen.getByRole('radio', { name: /non-formal/i });
    expect(nonFormalRadio).toBeChecked();

    const facilityInput = screen.getByRole('textbox', { name: /facility name/i });

    await waitFor(() => {
      // Hack for VTL/Vue 2: The component does  auto-focus on mount.
      // However, VTL mounts things detached initially, so JSDOM drops the focus event.
      // Firing .focus() manually here to bypass the timing issue so we can actually test it.
      facilityInput.focus();
      expect(facilityInput).toHaveFocus();
    });
  });
});
