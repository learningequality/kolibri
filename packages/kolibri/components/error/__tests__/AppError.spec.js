import { render, screen } from '@testing-library/vue';
import { error } from 'kolibri/utils/appError';
import AppError from '../AppError';

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
    expect(screen.getByText('Resource not found')).toBeInTheDocument();
    expect(screen.getByText('Back to home')).toBeInTheDocument();
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
    expect(screen.getByText('Sorry! Something went wrong!')).toBeInTheDocument();
    // First button should be Refresh
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
