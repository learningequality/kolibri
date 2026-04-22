import { render, screen } from '@testing-library/vue';
import '@testing-library/jest-dom';
import { createTranslator } from 'kolibri/utils/i18n';
import makeStore from '../../__tests__/utils/makeStore';
import CreateLearnerAccountForm from '../onboarding-forms/CreateLearnerAccountForm';

const { yesOptionLabel$, noOptionLabel$ } = createTranslator(
  CreateLearnerAccountForm.name,
  CreateLearnerAccountForm.$trs,
);

function renderComponent(options) {
  const store = makeStore();

  render(CreateLearnerAccountForm, {
    store,
    provide: {
      wizardService: {
        state: {
          context: {
            learnerCanCreateAccount: null,
            formalOrNonformal: options.preset,
          },
        },
      },
    },
  });
}

describe('CreateLearnerAccountForm', () => {
  it('defaults to allowing learners to join for a nonformal facility', () => {
    renderComponent({ preset: 'nonformal' });

    expect(screen.getByRole('radio', { name: yesOptionLabel$() })).toBeChecked();
    expect(screen.getByRole('radio', { name: noOptionLabel$() })).not.toBeChecked();
  });

  it('defaults to requiring admins to create learner accounts for a formal facility', () => {
    renderComponent({ preset: 'formal' });

    expect(screen.getByRole('radio', { name: yesOptionLabel$() })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: noOptionLabel$() })).toBeChecked();
  });
});
