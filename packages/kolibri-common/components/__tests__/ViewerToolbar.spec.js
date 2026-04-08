import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import ViewerToolbar from '../ViewerToolbar';

const { enterFullscreen$, exitFullscreen$ } = createTranslator(
  ViewerToolbar.name,
  ViewerToolbar.$trs,
);

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
    expect(screen.getByText(enterFullscreen$())).toBeInTheDocument();
  });

  it('shows exit fullscreen button when in fullscreen', () => {
    renderToolbar({ isInFullscreen: true });
    expect(screen.getByText(exitFullscreen$())).toBeInTheDocument();
  });

  it('shows primary fullscreen button when embedded', () => {
    renderToolbar({ embedded: true });
    expect(screen.getByText(enterFullscreen$())).toBeInTheDocument();
  });

  it('emits toggleFullscreen when fullscreen button is clicked', async () => {
    const { emitted } = renderToolbar();
    await userEvent.click(screen.getByText(enterFullscreen$()));
    expect(emitted().toggleFullscreen).toBeTruthy();
  });

  it('renders left slot content', () => {
    renderToolbar({}, { left: '<span data-testid="left-content">Left</span>' });
    expect(screen.getByTestId('left-content')).toBeInTheDocument();
  });

  it('renders center slot content', () => {
    renderToolbar({}, { center: '<span data-testid="center-content">Center</span>' });
    expect(screen.getByTestId('center-content')).toBeInTheDocument();
  });

  it('renders right slot content', () => {
    renderToolbar({}, { right: '<span data-testid="right-content">Right</span>' });
    expect(screen.getByTestId('right-content')).toBeInTheDocument();
  });
});
