import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FocusTrap from '../FocusTrap.vue';

const renderComponent = (props = {}) => {
  return render(FocusTrap, {
    props: {
      disabled: false,
      ...props,
    },
  });
};

describe('FocusTrap', () => {
  it('should emit the "shouldFocusFirstEl" element when the tab key is pressed once', async () => {
    const { emitted } = renderComponent();

    await userEvent.tab();
    expect(emitted()).toHaveProperty('shouldFocusFirstEl');
    expect(emitted().shouldFocusFirstEl.length).toBe(1);
  });

  it("should trap the focus and emit 'shouldFocusFirstEl' if the last focusable element is focused and we focus the next element", async () => {
    const { emitted } = renderComponent();

    await userEvent.tab();
    await userEvent.tab();

    expect(emitted()).toHaveProperty('shouldFocusFirstEl');
    expect(emitted().shouldFocusFirstEl.length).toBe(2);
  });

  it('should trap the focus and emit "shouldFocusLastEl" when the first element is focused and we focus the previous element', async () => {
    const { emitted } = renderComponent();

    await userEvent.tab();
    await userEvent.tab();

    // Shift + Tab is used to focus on the initial element again
    await userEvent.tab({ shift: true });

    expect(emitted()).toHaveProperty('shouldFocusLastEl');
    expect(emitted().shouldFocusLastEl.length).toBe(1);
  });

  it("should not trap focus when 'disabled' prop is set to true", async () => {
    const { emitted } = renderComponent({ disabled: true });

    await userEvent.tab();
    expect(emitted()).not.toHaveProperty('shouldFocusFirstEl');

    await userEvent.tab();
    expect(emitted()).not.toHaveProperty('shouldFocusFirstEl');

    await userEvent.tab({ shift: true });
    expect(emitted()).not.toHaveProperty('shouldFocusLastEl');
  });
});
