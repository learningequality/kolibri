import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import PicturePasswordOption from '../PicturePasswordOption.vue';

function renderComponent(props = {}) {
  return render(PicturePasswordOption, {
    props: {
      icon: 'birdColorful',
      iconName: 'bird',
      ...props,
    },
  });
}

describe('PicturePasswordOption', () => {
  describe('select event', () => {
    it('emits select when clicked and not disabled', async () => {
      const { emitted } = renderComponent();

      await userEvent.click(screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }));

      expect(emitted()['select']).toBeTruthy();
      expect(emitted()['select'][0]).toEqual(['birdColorful']);
    });

    it('does not emit select when disabled', async () => {
      const { emitted } = renderComponent({ disabled: true });

      await userEvent.click(screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }));

      expect(emitted()['select']).toBeFalsy();
    });

    it('emits disabledSelect instead of select when disabled', async () => {
      const { emitted } = renderComponent({ disabled: true });

      await userEvent.click(screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }));

      expect(emitted()['disabledSelect']).toBeTruthy();
    });
  });

  describe('numbered badge', () => {
    it('renders the badge with the sequence position when selected', () => {
      renderComponent({ sequencePosition: 2 });

      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent.trim()).toBe('2');
    });

    it('does not render the badge when sequencePosition is null', () => {
      renderComponent({ sequencePosition: null });

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('sets aria-disabled when disabled', () => {
      renderComponent({ disabled: true });

      expect(
        screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }),
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not set aria-disabled when not disabled', () => {
      renderComponent({ disabled: false });

      expect(
        screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }),
      ).not.toHaveAttribute('aria-disabled');
    });

    it('uses the translated object name as the checkbox accessible label', () => {
      renderComponent({ iconName: 'bird' });

      expect(
        screen.getByRole('checkbox', { name: picturePasswordStrings.bird$() }),
      ).toBeInTheDocument();
    });
  });
});
