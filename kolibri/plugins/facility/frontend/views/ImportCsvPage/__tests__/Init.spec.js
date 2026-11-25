import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import Init from '../Init';

const strings = createTranslator(Init.name, Init.$trs);

function renderInput() {
  render(Init);
  return screen.getByLabelText(strings.proceed$());
}

describe('CSV file selection', () => {
  it('reports an empty file and clears the error after a non-empty selection', async () => {
    const input = renderInput();
    const next = screen.getByRole('button', { name: coreStrings.continueAction$() });
    await userEvent.upload(input, new File([], 'empty.csv', { type: 'text/csv' }));
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(next).toBeDisabled();
    expect(input).toHaveAccessibleDescription(strings.emptyFile$());
    await userEvent.upload(input, new File(['USERNAME'], 'users.csv', { type: 'text/csv' }));
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAccessibleDescription();
    expect(screen.getByTestId('csv-file-error')).toBeEmptyDOMElement();
    expect(next).toBeEnabled();
  });

  it('clears the error and disables Continue when the selection is cleared', async () => {
    const input = renderInput();
    await userEvent.upload(input, new File([], 'empty.csv', { type: 'text/csv' }));
    await userEvent.upload(input, []);
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAccessibleDescription();
    expect(screen.getByTestId('csv-file-error')).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: coreStrings.continueAction$() })).toBeDisabled();
  });
});
