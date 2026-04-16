import { render, screen, waitFor, within } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import makeStore from '../../__tests__/utils/makeStore';
import FacilityPermissionsForm from '../onboarding-forms/FacilityPermissionsForm';
import FacilityNameTextbox from '../onboarding-forms/FacilityNameTextbox';

const { facilityNameFieldLabel$ } = createTranslator(
  FacilityNameTextbox.name,
  FacilityNameTextbox.$trs,
);

describe('FacilityPermissionsForm', () => {
  let focusSpy;

  beforeEach(() => {
    // 1. Spy on the browser's native focus method before the component even mounts.
    // This allows us to catch the component in the act of calling .focus() internally.
    focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
  });

  afterEach(() => {
    // 2. Always clean up spies after the test
    focusSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('"non-formal" option is selected by default and facility name textbox is auto-focused', async () => {
    const store = makeStore();

    render(FacilityPermissionsForm, {
      store,
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

    await global.flushPromises();

    const nonFormalRadio = within(screen.getByTestId('nonformal-radio')).getByRole('radio');
    expect(nonFormalRadio).toBeChecked();

    const facilityInput = screen.getByRole('textbox', { name: facilityNameFieldLabel$() });

    await waitFor(() => {
      // 3. Assert that the component's internal logic successfully fired the focus command
      expect(focusSpy).toHaveBeenCalled();

      // 4. Prove that the focus command was specifically targeted at our input element
      const elementsThatWereFocused = focusSpy.mock.instances;
      expect(elementsThatWereFocused).toContain(facilityInput);
    });
  });
});
