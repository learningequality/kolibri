import { render, screen, fireEvent } from '@testing-library/vue';
import TopBar from '../TopBar';

function renderTopBar(props = {}) {
  return render(TopBar, {
    props: {
      isInFullscreen: false,
      ...props,
    },
  });
}

describe('Top bar', () => {
  it('does not show heading when title is not provided', () => {
    renderTopBar();

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows heading when title is provided', () => {
    const title = 'Book title';
    renderTopBar({ title });

    expect(
      screen.getByRole('heading', { name: title })
    ).toBeInTheDocument();
  });

  it('allows parent to focus on table of contents button', () => {
    renderTopBar();
    const tocButton = screen.getByRole('button', { name: /toggle table of contents/i });
    tocButton.focus();
    expect(document.activeElement).toBe(tocButton);
  });

  it('allows parent to focus on settings button', () => {
    renderTopBar();

    const settingsButton = screen.getByRole('button', { name: /toggle settings/i });
    settingsButton.focus();

    expect(document.activeElement).toBe(settingsButton);
  });

  it('allows parent to focus on search button', () => {
    renderTopBar();

    const searchButton = screen.getByRole('button', { name: /toggle search/i });
    searchButton.focus();

    expect(document.activeElement).toBe(searchButton);
  });

  it('emits event when table of contents button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getAllByRole('button')[0]);

    expect(emitted().tableOfContentsButtonClicked).toBeTruthy();
  });

  it('emits event when settings button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getAllByRole('button')[1]);

    expect(emitted().settingsButtonClicked).toBeTruthy();
  });

  it('emits event when search button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getAllByRole('button')[2]);

    expect(emitted().searchButtonClicked).toBeTruthy();
  });

  it('emits event when fullscreen button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getAllByRole('button')[3]);

    expect(emitted().fullscreenButtonClicked).toBeTruthy();
  });
});