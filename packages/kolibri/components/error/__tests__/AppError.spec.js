import { render, screen } from '@testing-library/vue';
import { error } from 'kolibri/utils/appError';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import AppError from '../AppError';

const { refresh$ } = coreStrings;

const { resourceNotFoundHeader$, defaultErrorExitPrompt$, defaultErrorHeader$ } = createTranslator(
  AppError.name,
  AppError.$trs,
);

jest.mock('kolibri/utils/appError');

describe('AppError component', () => {
  beforeEach(() => {
    error.value = null;
  });

  it('shows page not found errors and buttons if the error has status code 404', async () => {
    const errorObj = {
      status: 404,
      config: {
        method: 'get',
      },
    };
    error.value = JSON.stringify(errorObj);
    render(AppError);
    expect(screen.getByText(resourceNotFoundHeader$())).toBeInTheDocument();
    expect(screen.getByText(defaultErrorExitPrompt$())).toBeInTheDocument();
  });

  it('shows default errors and buttons if the error does not have status code 404', async () => {
    const errorObj = {
      status: 400,
      config: {
        method: 'get',
      },
    };
    error.value = JSON.stringify(errorObj);
    render(AppError);
    expect(screen.getByText(defaultErrorHeader$())).toBeInTheDocument();
    // First button should be Refresh
    expect(screen.getByText(refresh$())).toBeInTheDocument();
  });
});
