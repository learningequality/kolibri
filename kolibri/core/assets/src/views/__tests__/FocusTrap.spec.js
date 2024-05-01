import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import FocusTrap from '../FocusTrap.vue';

const renderComponent = (props = {}) => {
  return render(FocusTrap, {
    props: {
      disabled: false,
      ...props,
    },
    routes: new VueRouter(),
  });
};

describe('FocusTrap', () => {
  it('should emit the "shouldFocusFirstEl" element when the tab key is pressed once', async () => {
    const { emitted } = renderComponent();

    await userEvent.tab();
    expect(emitted()).toHaveProperty('shouldFocusFirstEl');
    expect(emitted().shouldFocusFirstEl.length).toBe(1);
  });

  it("should trap the focus ('shouldFocusFirstEl' should be emitted twice) on pressing tab twice ", async () => {
    const { emitted } = renderComponent();

    await userEvent.tab();
    await userEvent.tab();

    expect(emitted()).toHaveProperty('shouldFocusFirstEl');
    expect(emitted().shouldFocusFirstEl.length).toBe(2);
  });

  it('should emit "shouldFocusLastEl" when the element is subsequently focused after the inital focus', async () => {
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

  it("should reset state when 'reset' method is called", async () => {
    // Create a wrapper component with a Reset button to call the component's public method "reset"
    const WrapperComponent = {
      template: `
        <div>
          <FocusTrap ref="focusTrap" />
          <button @click="reset">Reset</button>
        </div>
      `,
      components: {
        FocusTrap,
      },
      methods: {
        reset() {
          this.$refs.focusTrap.reset();
        },
      },
    };

    const { emitted } = render(WrapperComponent, {
      routes: new VueRouter(),
    });

    // Activate the focus trap
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab({ shift: true });

    // Check if the focus trap is working
    expect(emitted()).toHaveProperty('shouldFocusLastEl');
    expect(emitted().shouldFocusLastEl.length).toBe(1);

    // Reset the focus trap
    await userEvent.click(document.querySelector('button'));

    await userEvent.tab();
    expect(emitted()).toHaveProperty('shouldFocusFirstEl');
    expect(emitted().shouldFocusFirstEl.length).toBe(2);
  });
});
