import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';
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

  describe('wrongSequence prop', () => {
    it('clears the sequence and disables the submit button when wrongSequence becomes true', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ wrongSequence: true });

      expect(submitButton()).toHaveAttribute('aria-disabled', 'true');
      expect(emitted()['wrongSequenceHandled']).toBeTruthy();
    });

    it('deselects all previously chosen icons when wrongSequence becomes true', async () => {
      const { updateProps } = renderComponent();

      await selectThreeIcons();

      // All 3 are selected; verify bee carries a badge before clearing.
      expect(checkbox(bee())).toBeChecked();

      await updateProps({ wrongSequence: true });

      // After the clear, all icons revert to unselected.
      expect(checkbox(bee())).not.toBeChecked();
      expect(checkbox(star())).not.toBeChecked();
      expect(checkbox(moon())).not.toBeChecked();
    });

    it('emits wrongSequenceHandled exactly once per wrongSequence flip', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ wrongSequence: true });
      expect(emitted()['wrongSequenceHandled']).toHaveLength(1);

      // Resetting wrongSequence to false should not re-emit.
      await updateProps({ wrongSequence: false });
      expect(emitted()['wrongSequenceHandled']).toHaveLength(1);
    });

    it('allows a new sequence to be built after the wrong-sequence reset', async () => {
      const { updateProps, emitted } = renderComponent();

      await selectThreeIcons();

      await updateProps({ wrongSequence: true });

      // Build a fresh sequence after the reset.
      await userEvent.click(checkbox(tree())); // id 4
      await userEvent.click(checkbox(bee())); // id 1
      await userEvent.click(checkbox(star())); // id 2
      await userEvent.click(submitButton());

      expect(emitted()['submit'][0]).toEqual(['4.1.2']);
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
