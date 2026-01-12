import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import ViewerToolbar, { viewerToolbarStrings } from '../ViewerToolbar';

const { enterFullscreen$, exitFullscreen$ } = viewerToolbarStrings;

function renderToolbar(props = {}, slots = {}) {
  return render(ViewerToolbar, {
    props: {
      isInFullscreen: false,
      ...props,
    },
    slots,
  });
}

describe('ViewerToolbar', () => {
  it('should mount', () => {
    const { container } = renderToolbar();
    expect(container.firstChild).toBeTruthy();
  });

  it('shows enter fullscreen button when not in fullscreen', () => {
    renderToolbar({ isInFullscreen: false });
    screen.getByRole('button', { name: enterFullscreen$() });
  });

  it('shows exit fullscreen button when in fullscreen', () => {
    renderToolbar({ isInFullscreen: true });
    screen.getByRole('button', { name: exitFullscreen$() });
  });

  it('emits toggleFullscreen when fullscreen button is clicked', async () => {
    const { emitted } = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: enterFullscreen$() }));
    expect(emitted().toggleFullscreen).toBeTruthy();
  });

  it('renders left slot content', () => {
    const { container } = renderToolbar(
      {},
      { left: '<span data-testid="left-content">Left</span>' },
    );
    within(container.querySelector('.toolbar-left')).getByTestId('left-content');
  });

  it('renders center slot content', () => {
    const { container } = renderToolbar(
      {},
      { center: '<span data-testid="center-content">Center</span>' },
    );
    within(container.querySelector('.toolbar-center')).getByTestId('center-content');
  });

  it('renders right slot content', () => {
    const { container } = renderToolbar(
      {},
      { right: '<span data-testid="right-content">Right</span>' },
    );
    within(container.querySelector('.toolbar-right')).getByTestId('right-content');
  });
});
