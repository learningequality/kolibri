import { ref, nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useWindowSize } from '@vueuse/core';
import { picturePasswordStrings } from 'kolibri-common/strings/picturePasswords';
import PicturePasswordConfirmModal from '../PicturePasswordConfirmModal.vue';

jest.mock('@vueuse/core', () => ({
  useWindowSize: jest.fn(),
}));

jest.mock('kolibri-common/composables/useReturnFocusOnUnmount', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const defaultProps = {
  learnerName: 'Alice Example',
  picturePassword: '1.2.3',
};

function renderComponent(props = {}, windowHeight = 800) {
  useWindowSize.mockReturnValue({ height: ref(windowHeight) });
  return render(PicturePasswordConfirmModal, { props: { ...defaultProps, ...props } });
}

describe('PicturePasswordConfirmModal', () => {
  describe('rendering', () => {
    it('displays the learner name', () => {
      renderComponent();
      expect(screen.getByText(defaultProps.learnerName)).toBeInTheDocument();
    });

    it('renders a dialog with the correct aria label', () => {
      renderComponent();
      expect(
        screen.getByRole('dialog', { name: picturePasswordStrings.isThisYou$() }),
      ).toBeInTheDocument();
    });

    it('announces the icon sequence via a visually hidden label', () => {
      renderComponent();
      const expected = picturePasswordStrings.yourPasswordIs$({
        labels: [
          picturePasswordStrings.bee$(),
          picturePasswordStrings.star$(),
          picturePasswordStrings.moon$(),
        ].join(', '),
      });
      expect(screen.getByText(expected)).toHaveClass('visuallyhidden');
    });
  });

  describe('events', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function createUser() {
      return userEvent.setup({ advanceTimers: jest.advanceTimersByTime.bind(jest) });
    }

    it('emits confirm when the confirm button is clicked', async () => {
      const { emitted } = renderComponent();
      await createUser().click(
        screen.getByRole('button', { name: picturePasswordStrings.yesConfirmAction$() }),
      );
      jest.runAllTimers();
      expect(emitted()['confirm']).toBeTruthy();
    });

    it('emits cancel when the cancel button is clicked', async () => {
      const { emitted } = renderComponent();
      await createUser().click(
        screen.getByRole('button', { name: picturePasswordStrings.noGoBackAction$() }),
      );
      jest.runAllTimers();
      expect(emitted()['cancel']).toBeTruthy();
    });
  });

  describe('prefers-reduced-motion', () => {
    beforeEach(() => {
      window.matchMedia = jest.fn(q => ({
        matches: q === '(prefers-reduced-motion: reduce)',
        media: q,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    });

    afterEach(() => {
      window.matchMedia = undefined;
    });

    it('emits cancel immediately without a timer when reduced motion is preferred', async () => {
      const { emitted } = renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.noGoBackAction$() }),
      );
      expect(emitted()['cancel']).toBeTruthy();
    });

    it('emits confirm immediately without a timer when reduced motion is preferred', async () => {
      const { emitted } = renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.yesConfirmAction$() }),
      );
      expect(emitted()['confirm']).toBeTruthy();
    });

    it('does not apply animation classes when reduced motion is preferred', async () => {
      renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.noGoBackAction$() }),
      );
      expect(document.body.querySelector('.action-buttons')).not.toHaveClass('gap-collapsed');
    });
  });

  describe('button animations', () => {
    it('disables both buttons after one is pressed', async () => {
      renderComponent();
      const cancelBtn = screen.getByRole('button', {
        name: picturePasswordStrings.noGoBackAction$(),
      });
      await userEvent.click(cancelBtn);
      expect(
        screen.getByRole('button', { name: picturePasswordStrings.yesConfirmAction$() }),
      ).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
    });

    it('applies btn-collapsed to the confirm button when cancel is pressed', async () => {
      renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.noGoBackAction$() }),
      );
      // KOverlay portals into document.body; query from there
      const btnBgs = document.body.querySelectorAll('.btn-bg');
      expect(btnBgs[1]).toHaveClass('btn-collapsed');
      expect(btnBgs[0]).not.toHaveClass('btn-collapsed');
    });

    it('applies btn-collapsed to the cancel button when confirm is pressed', async () => {
      renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.yesConfirmAction$() }),
      );
      const btnBgs = document.body.querySelectorAll('.btn-bg');
      expect(btnBgs[0]).toHaveClass('btn-collapsed');
      expect(btnBgs[1]).not.toHaveClass('btn-collapsed');
    });

    it('applies gap-collapsed to the action-buttons container when a button is pressed', async () => {
      renderComponent();
      await userEvent.click(
        screen.getByRole('button', { name: picturePasswordStrings.noGoBackAction$() }),
      );
      expect(document.body.querySelector('.action-buttons')).toHaveClass('gap-collapsed');
    });
  });

  describe('scroll lock', () => {
    it('sets overflow hidden on the document root when mounted', () => {
      renderComponent();
      expect(document.documentElement).toHaveStyle({ overflow: 'hidden' });
    });

    it('restores document overflow when unmounted', () => {
      const { unmount } = renderComponent();
      unmount();
      expect(document.documentElement).toHaveStyle({ overflow: '' });
    });
  });

  describe('landscape scaling', () => {
    const CARD_HEIGHT = 420;

    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => CARD_HEIGHT,
      });
    });

    afterEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: () => 0,
      });
    });

    it('applies zoom when the card is taller than the available viewport height', async () => {
      // viewport 400px → available 368px → scale = 368/420
      renderComponent({}, 400);
      await nextTick(); // wait for the re-render after naturalCardHeight is set in onMounted
      const card = screen.getByRole('dialog');
      const expectedScale = (400 - 32) / CARD_HEIGHT;
      // Vue 2.7 vendor-prefixes zoom to -webkit-zoom in jsdom; match either form
      const styleAttr = card.getAttribute('style') || '';
      const zoomMatch = styleAttr.match(/zoom:\s*([\d.]+)/);
      expect(zoomMatch).toBeTruthy();
      expect(parseFloat(zoomMatch[1])).toBeCloseTo(expectedScale, 5);
    });

    it('does not apply zoom when the card fits within the viewport', async () => {
      // viewport 800px → available 768px → scale = 1 (no zoom needed)
      renderComponent({}, 800);
      await nextTick();
      const card = screen.getByRole('dialog');
      expect(card.getAttribute('style') || '').not.toMatch(/zoom/);
    });
  });
});
