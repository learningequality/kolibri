import { ref, nextTick } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import useKResponsiveElement from 'kolibri-design-system/lib/composables/useKResponsiveElement';
import PicturePasswordGrid from '../PicturePasswordGrid.vue';

const mockSendPoliteMessage = jest.fn();

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => ({
  __esModule: true,
  default: jest.fn(() => ({ sendPoliteMessage: mockSendPoliteMessage })),
}));

jest.mock('kolibri-design-system/lib/composables/useKResponsiveElement', () => ({
  __esModule: true,
  default: jest.fn(),
}));

function renderComponent(props = {}) {
  return render(PicturePasswordGrid, { props });
}

async function selectThreeIcons() {
  await userEvent.click(checkbox(bee()));
  await userEvent.click(checkbox(star()));
  await userEvent.click(checkbox(moon()));
  // Confirm the sequence is complete before returning.
  expect(submitButton()).toBeEnabled();
}

// Convenience helpers so tests read as the icon's English label.
const bee = () => picturePasswordStrings.bee$(); // id 1
const star = () => picturePasswordStrings.star$(); // id 2
const moon = () => picturePasswordStrings.moon$(); // id 3
const tree = () => picturePasswordStrings.tree$(); // id 4

const checkbox = name => screen.getByRole('checkbox', { name });
const submitButton = () => screen.getByTestId('submit-button');

describe('PicturePasswordGrid', () => {
  beforeEach(() => {
    mockSendPoliteMessage.mockClear();
    useKResponsiveElement.mockReturnValue({ elementWidth: ref(0) });
  });

  describe('accessibility', () => {
    it('has an accessible form role with the correct label', () => {
      renderComponent();
      expect(
        screen.getByRole('form', { name: picturePasswordStrings.formAriaLabel$() }),
      ).toBeInTheDocument();
    });

    it('has tabindex="-1" on the form so it is programmatically focusable', () => {
      renderComponent();
      expect(screen.getByRole('form')).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('public focus() method', () => {
    it('focuses the form element when called', () => {
      const wrapper = mount(PicturePasswordGrid, {
        propsData: { iconStyle: 'colorful', showIconText: true },
      });
      const formEl = wrapper.find('form').element;
      formEl.focus = jest.fn();

      wrapper.vm.focus();

      expect(formEl.focus).toHaveBeenCalled();
    });

    it('does not throw when called before the DOM is mounted', () => {
      // Vue Test Utils calls setup() synchronously when mounting, so formRef
      // will already be set.  We simulate the edge case by clearing the ref.
      const wrapper = mount(PicturePasswordGrid, {
        propsData: { iconStyle: 'colorful', showIconText: true },
      });
      wrapper.vm.formRef = null;

      expect(() => wrapper.vm.focus()).not.toThrow();
    });
  });

  describe('submit event', () => {
    it('emits the dot-separated sequence ID string on submit after 3 selections', async () => {
      const { emitted } = renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));
      await userEvent.click(submitButton());

      // bee=1, star=2, moon=3
      expect(emitted()['submit'][0]).toEqual(['1.2.3']);
    });

    it('does not emit submit when fewer than 3 icons are selected', async () => {
      const { emitted } = renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));

      expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

      // Button is still focusable/clickable but the handler guards against emitting.
      await userEvent.click(submitButton());
      expect(emitted()['submit']).toBeFalsy();
    });
  });

  describe('sequence management', () => {
    it('tapping the icon at position 2 removes it and position 3, leaving position 1', async () => {
      const { emitted } = renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      // Deselect star (position 2) — moon (position 3) should also be dropped.
      await userEvent.click(checkbox(star()));

      // Only bee remains; submit is disabled.
      expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

      // Complete with different icons to verify bee (id 1) is still first.
      await userEvent.click(checkbox(moon())); // id 3
      await userEvent.click(checkbox(tree())); // id 4
      await userEvent.click(submitButton());

      expect(emitted()['submit'][0]).toEqual(['1.3.4']);
    });

    it('disables all unselected icons once 3 have been chosen', async () => {
      renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      // tree is unselected → should be disabled
      expect(checkbox(tree())).toHaveAttribute('aria-disabled', 'true');
      // bee is selected → should not be disabled
      expect(checkbox(bee())).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('clearSequence prop', () => {
    it('clears the sequence and disables the submit button when clearSequence becomes true', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ clearSequence: true });

      expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
      expect(emitted()['update:clearSequence']).toBeTruthy();
    });

    it('deselects all previously chosen icons when clearSequence becomes true', async () => {
      const { updateProps } = renderComponent();

      await selectThreeIcons();

      // All 3 are selected; verify bee carries a badge before clearing.
      expect(checkbox(bee())).toBeChecked();

      await updateProps({ clearSequence: true });

      // After the clear, all icons revert to unselected.
      expect(checkbox(bee())).not.toBeChecked();
      expect(checkbox(star())).not.toBeChecked();
      expect(checkbox(moon())).not.toBeChecked();
    });

    it('emits update:clearSequence exactly once per clearSequence flip', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ clearSequence: true });
      expect(emitted()['update:clearSequence']).toHaveLength(1);

      // Resetting clearSequence to false should not re-emit.
      await updateProps({ clearSequence: false });
      expect(emitted()['update:clearSequence']).toHaveLength(1);
    });

    it('allows a new sequence to be built after the clear-sequence reset', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ clearSequence: true });

      // Build a fresh sequence after the reset.
      await userEvent.click(checkbox(tree())); // id 4
      await userEvent.click(checkbox(bee())); // id 1
      await userEvent.click(checkbox(star())); // id 2
      await userEvent.click(submitButton());

      expect(emitted()['submit'][0]).toEqual(['4.1.2']);
    });
  });

  describe('submit button pulse', () => {
    it('pulses after 3 consecutive disabled taps when sequence is full', async () => {
      renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      await userEvent.click(checkbox(tree()));
      await userEvent.click(checkbox(tree()));
      await userEvent.click(checkbox(tree()));

      expect(submitButton()).toHaveClass('pulsing');
    });

    it('resets pulse when sequence changes', async () => {
      renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      await userEvent.click(checkbox(tree()));
      await userEvent.click(checkbox(tree()));
      await userEvent.click(checkbox(tree()));

      expect(submitButton()).toHaveClass('pulsing');

      // Deselect bee — this also drops star and moon.
      await userEvent.click(checkbox(bee()));
      expect(submitButton()).not.toHaveClass('pulsing');
    });
  });

  describe('overfill nudge animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('applies the bouncing class to the tapped disabled option, then clears it', async () => {
      renderComponent();

      await fireEvent.click(checkbox(bee()));
      await fireEvent.click(checkbox(star()));
      await fireEvent.click(checkbox(moon()));

      // tree is now disabled; tap its checkbox (which carries the @click handler).
      const treeCheckbox = checkbox(tree());
      const treeOption = treeCheckbox.closest('.picture-password-option');
      await fireEvent.click(treeCheckbox);

      expect(treeOption).toHaveClass('bouncing');

      jest.advanceTimersByTime(380);
      await nextTick();
      expect(treeOption).not.toHaveClass('bouncing');
    });

    it('does not re-trigger the bounce while one is in flight', async () => {
      renderComponent();

      await fireEvent.click(checkbox(bee()));
      await fireEvent.click(checkbox(star()));
      await fireEvent.click(checkbox(moon()));

      const treeCheckbox = checkbox(tree());
      const treeOption = treeCheckbox.closest('.picture-password-option');
      await fireEvent.click(treeCheckbox);
      expect(treeOption).toHaveClass('bouncing');

      // Tap the same option again 100ms in — the timer must not be reset.
      jest.advanceTimersByTime(100);
      await fireEvent.click(treeCheckbox);
      expect(treeOption).toHaveClass('bouncing');

      // 280ms more (total 380) should clear the class.
      jest.advanceTimersByTime(280);
      await nextTick();
      expect(treeOption).not.toHaveClass('bouncing');
    });
  });

  describe('playSuccessAnimation', () => {
    let originalMatchMedia;

    function mountComponent() {
      return mount(PicturePasswordGrid, {
        propsData: {
          iconStyle: 'colorful',
          showIconText: true,
        },
        stubs: ['PicturePasswordOption', 'KIcon'],
      });
    }

    beforeEach(() => {
      jest.useFakeTimers('modern');
      originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    afterEach(() => {
      jest.useRealTimers();
      window.matchMedia = originalMatchMedia;
    });

    it('bounces each selected icon in sequence, then the submit icon, then resolves', async () => {
      const wrapper = mountComponent();

      // Set up a sequence
      wrapper.vm.sequence = [1, 2, 3]; // bee, star, moon

      // Start the animation
      let resolved = false;
      wrapper.vm.playSuccessAnimation().then(() => {
        resolved = true;
      });

      // Flush the 0ms setTimeout for the first stagger
      jest.advanceTimersByTime(0);
      await nextTick();

      // First icon (bee) bouncing
      expect(wrapper.vm.bouncingId).toBe(1);
      expect(wrapper.vm.arrowBouncing).toBe(false);

      // After 150ms stagger, second icon (star) starts
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(wrapper.vm.bouncingId).toBe(2);

      // After another 150ms, third (moon) starts AND submit arrow bounces
      jest.advanceTimersByTime(150);
      await nextTick();
      expect(wrapper.vm.bouncingId).toBe(3);
      expect(wrapper.vm.arrowBouncing).toBe(true);

      // After the final 380ms, bouncing clears and Promise resolves
      jest.advanceTimersByTime(380);
      await nextTick();
      expect(wrapper.vm.bouncingId).toBeNull();
      expect(wrapper.vm.arrowBouncing).toBe(false);
      expect(resolved).toBe(true);
    });

    it('resolves immediately with prefers-reduced-motion', async () => {
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const wrapper = mountComponent();
      wrapper.vm.sequence = [1, 2, 3];

      let resolved = false;
      wrapper.vm.playSuccessAnimation().then(() => {
        resolved = true;
      });

      // With reduced motion (stagger=0, dur=0), run all timers to completion
      jest.runAllTimers();
      await nextTick();
      expect(resolved).toBe(true);
      expect(wrapper.vm.arrowBouncing).toBe(false);
    });
  });

  describe('live region', () => {
    it('announces the correct ordinal string after the first selection', async () => {
      renderComponent();

      await userEvent.click(checkbox(bee()));

      expect(mockSendPoliteMessage).toHaveBeenCalledWith(
        picturePasswordStrings.iconSelectedAsFirst$({ icon: bee() }),
      );
    });

    it('sets the live region to the "already selected" string when a disabled icon is tapped', async () => {
      const { emitted } = renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      // tree is now disabled; tap it.
      await userEvent.click(checkbox(tree()));

      expect(mockSendPoliteMessage).toHaveBeenCalledWith(
        picturePasswordStrings.allIconsSelected$(),
      );

      // The sequence must be unchanged — submit still emits the original 3.
      await userEvent.click(submitButton());
      expect(emitted()['submit'][0]).toEqual(['1.2.3']);
    });

    it('re-triggers the announcement on repeated taps of the same disabled icon', async () => {
      renderComponent();

      await userEvent.click(checkbox(bee()));
      await userEvent.click(checkbox(star()));
      await userEvent.click(checkbox(moon()));

      // First tap.
      await userEvent.click(checkbox(tree()));

      // Second tap on the same icon: sendPoliteMessage should be called again.
      await userEvent.click(checkbox(tree()));

      expect(mockSendPoliteMessage).toHaveBeenCalledTimes(5); // 3 selections + 2 disabled taps
      expect(mockSendPoliteMessage).toHaveBeenLastCalledWith(
        picturePasswordStrings.allIconsSelected$(),
      );
    });
  });

  describe('responsive columns', () => {
    it.each([
      [3, 100],
      [3, 240],
      [3, 319],
      [4, 320],
      [4, 479],
      [6, 480],
      [6, 1000],
    ])('shows %i-column grid at %i px wide', (expectedColumns, width) => {
      useKResponsiveElement.mockReturnValue({ elementWidth: ref(width) });
      const { container } = renderComponent();
      const grid = container.querySelector('.icon-grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: `repeat(${expectedColumns}, 1fr)` });
    });

    it('falls back to 3 columns when elementWidth is 0', () => {
      const { container } = renderComponent();
      const grid = container.querySelector('.icon-grid');
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
    });
  });
});
