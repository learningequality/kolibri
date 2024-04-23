import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ContentRendererError from '../ContentRendererError.vue';

// Helper function to render the component with given props and a router
const renderComponent = props => {
  return render(ContentRendererError, {
    props,
  });
};

const DEFAULT_REPORT_ERROR_MESSAGE = 'Help us by reporting this error';
const RENDERED_NOT_AVAILABLE_MESSAGE = 'Kolibri is unable to render this resource';

const sampleError = { message: 'Test error message' };

describe('ContentRendererError', () => {
  test('renders the error prompt properly if an error is provided', () => {
    renderComponent({ error: sampleError });

    expect(screen.getByText(RENDERED_NOT_AVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_REPORT_ERROR_MESSAGE)).toBeInTheDocument();
  });

  test('renders the error message properly after clicking the report error button', async () => {
    renderComponent({ error: sampleError });

    const reportErrorButton = screen.getByText(DEFAULT_REPORT_ERROR_MESSAGE);
    await userEvent.click(reportErrorButton);

    expect(screen.getByText(sampleError.message)).toBeInTheDocument();
  });

  test("hides the error message after clicking the 'Cancel' button in the Report Error Modal", async () => {
    renderComponent({
      error: sampleError,
    });

    const reportErrorButton = screen.getByText(DEFAULT_REPORT_ERROR_MESSAGE);
    // Open the Report Error Modal
    await userEvent.click(reportErrorButton);

    // Close the Report Error Modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    expect(screen.queryByText(sampleError.message)).not.toBeInTheDocument();
  });

  test('does not renders the report error button if the error is not provided', () => {
    renderComponent({ error: null });

    expect(screen.getByText(RENDERED_NOT_AVAILABLE_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_REPORT_ERROR_MESSAGE)).not.toBeInTheDocument();
  });
});
