import { render, screen, fireEvent } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import ViewerToolbar from 'kolibri-common/components/ViewerToolbar';
import TopBar from '../TopBar';

const { enterFullscreen$ } = createTranslator(ViewerToolbar.name, ViewerToolbar.$trs);

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

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('allows parent to focus on table of contents button', () => {
    renderTopBar();
    const tocButton = screen.getByTestId('toc button');
    tocButton.focus();
    expect(tocButton).toHaveFocus();
  });

  it('allows parent to focus on settings button', () => {
    renderTopBar();

    const settingsButton = screen.getByTestId('settings button');
    settingsButton.focus();

    expect(settingsButton).toHaveFocus();
  });

  it('allows parent to focus on search button', () => {
    renderTopBar();

    const searchButton = screen.getByTestId('search button');
    searchButton.focus();

    expect(searchButton).toHaveFocus();
  });

  it('emits event when table of contents button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByTestId('toc button'));

    expect(emitted().tableOfContentsButtonClicked).toBeTruthy();
  });

  it('emits event when settings button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByTestId('settings button'));

    expect(emitted().settingsButtonClicked).toBeTruthy();
  });

  it('emits event when search button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByTestId('search button'));

    expect(emitted().searchButtonClicked).toBeTruthy();
  });

  it('emits event when fullscreen button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByRole('button', { name: enterFullscreen$() }));

    expect(emitted().fullscreenButtonClicked).toBeTruthy();
  });
});
