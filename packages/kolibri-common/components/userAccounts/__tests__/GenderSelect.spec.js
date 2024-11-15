import { render, screen, fireEvent } from '@testing-library/vue';
import GenderSelect from '../GenderSelect';
import '@testing-library/jest-dom';

const renderComponent = () => {
  return render(GenderSelect);
};

describe('GenderSelect', () => {
  const labelOptions = ['Male', 'Female', 'Not specified'];

  test('renders correctly with label placeholder and options', async () => {
    renderComponent();

    expect(screen.getByText('Gender')).toBeInTheDocument();
    labelOptions.forEach(option => {
      expect(screen.getByText(option)).toBeInTheDocument();
    });
  });

  test("emits 'update:value' event when an option is selected", async () => {
    const { emitted } = renderComponent();

    const selectedOption = labelOptions[0];
    await fireEvent.click(screen.getByText(selectedOption));

    const emittedEvents = emitted();
    expect(emittedEvents).toHaveProperty('update:value');
    expect(emittedEvents['update:value'][0]).toEqual([selectedOption.toUpperCase()]);
  });

  test("the value of 'update:value' event is changed when a different option is selected", async () => {
    const { emitted } = renderComponent();

    const selectedOption = labelOptions[0];
    await fireEvent.click(screen.getByText(selectedOption));
    const newSelectedOption = labelOptions[1];
    await fireEvent.click(screen.getByText(newSelectedOption));

    const emittedEvents = emitted();
    expect(emittedEvents).toHaveProperty('update:value');
    expect(emittedEvents['update:value']).toHaveLength(2); // As the event is emitted twice
    expect(emittedEvents['update:value']).toEqual([
      [selectedOption.toUpperCase()],
      [newSelectedOption.toUpperCase()],
    ]);
  });
});
