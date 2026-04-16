import { render, screen, fireEvent } from '@testing-library/vue';
import { createTranslator } from 'kolibri/utils/i18n';
import TopBar from '../TopBar';
import TocButton from '../TocButton';
import SettingsButton from '../SettingsButton';
import SearchButton from '../SearchButton';

const { toggleTocSideBar$ } = createTranslator(TocButton.name, TocButton.$trs);
const { toggleSettingsSideBar$ } = createTranslator(SettingsButton.name, SettingsButton.$trs);
const { toggleSearchSideBar$ } = createTranslator(SearchButton.name, SearchButton.$trs);
const { toggleFullscreen$ } = createTranslator(TopBar.name, TopBar.$trs);

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
    const tocButton = screen.getByRole('button', { name: toggleTocSideBar$() });
    tocButton.focus();
    expect(tocButton).toHaveFocus();
  });

  it('allows parent to focus on settings button', () => {
    renderTopBar();

    const settingsButton = screen.getByRole('button', { name: toggleSettingsSideBar$() });
    settingsButton.focus();

    expect(settingsButton).toHaveFocus();
  });

  it('allows parent to focus on search button', () => {
    renderTopBar();

    const searchButton = screen.getByRole('button', { name: toggleSearchSideBar$() });
    searchButton.focus();

    expect(searchButton).toHaveFocus();
  });

  it('emits event when table of contents button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByRole('button', { name: toggleTocSideBar$() }));

    expect(emitted().tableOfContentsButtonClicked).toBeTruthy();
  });

  it('emits event when settings button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByRole('button', { name: toggleSettingsSideBar$() }));

    expect(emitted().settingsButtonClicked).toBeTruthy();
  });

  it('emits event when search button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByRole('button', { name: toggleSearchSideBar$() }));

    expect(emitted().searchButtonClicked).toBeTruthy();
  });

  it('emits event when fullscreen button is clicked', async () => {
    const { emitted } = renderTopBar();

    await fireEvent.click(screen.getByRole('button', { name: toggleFullscreen$() }));

    expect(emitted().fullscreenButtonClicked).toBeTruthy();
  });
});
