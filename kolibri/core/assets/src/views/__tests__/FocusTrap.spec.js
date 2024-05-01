import { render, screen, fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import FocusTrap from '../FocusTrap.vue';
import FocusTrapWrapper from './FocusTrapWrapper.vue';

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

  // it("should reset state when 'reset' method is called", async () => {
  //   // FocusTrapWrapper is used to test the FocusTrap component's reset method
  //   // It has a button which calls the reset method of the FocusTrap component
  //   const { emitted } = render(FocusTrapWrapper);

  //   await fireEvent.focus(screen.getByTestId('focusTrap'));
  //   // Activate the focus trap
  //   await userEvent.tab();
  //   await userEvent.tab();
  //   await userEvent.tab({ shift: true });

  //   // The focus trap should be active
  //   expect(emitted()).toHaveProperty('shouldFocusLastEl');
  //   expect(emitted().shouldFocusLastEl.length).toBe(1);

  //   // Reset the focus trap
  //   await userEvent.click(screen.getByRole('button'));

  //   await userEvent.tab();
  //   expect(emitted()).toHaveProperty('shouldFocusFirstEl');
  //   expect(emitted().shouldFocusFirstEl.length).toBe(2);
  // });
});
