import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import CookiePolicy from '../CookiePolicy';

const { cookiePolicy$ } = coreStrings;

describe('CookiePolicy page title', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('sets the tab title to the page label', async () => {
    render(CookiePolicy, { routes: [] });
    await nextTick();
    expect(document.title).toBe(`${cookiePolicy$()} - Kolibri`);
  });

  it('renders its visible heading as the only h1', () => {
    render(CookiePolicy, { routes: [] });
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(cookiePolicy$());
  });
});
