/* global describe, it, expect, beforeEach, afterEach */
import { screen, within } from '@testing-library/vue';
import { nextTick } from 'vue';
import themeConfig from 'kolibri/styles/themeConfig';

/**
 * Tests the page's tab title and its single h1 under both `signIn.showTitle` settings.
 * @param {Function} renderInLayout - Must mount the page inside UserAuthLayout.
 * @param {Function} title$ - Translator returning the title the page registers.
 */
export default function describeAuthPageTitle(renderInLayout, title$) {
  describe('page title', () => {
    function pageHeadings() {
      return screen.queryAllByRole('heading', { level: 1 });
    }

    beforeEach(() => {
      document.title = '';
    });

    afterEach(() => {
      delete themeConfig.signIn.showTitle;
    });

    it('sets the tab title to the page title', async () => {
      renderInLayout();
      await nextTick();
      expect(document.title).toBe(`${title$()} - Kolibri`);
    });

    it('renders the visible sign-in title as the only h1 when the theme shows it', async () => {
      themeConfig.signIn.showTitle = true;
      renderInLayout();
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).not.toHaveClass('visuallyhidden');
    });

    it('renders the page title as a hidden h1 when the theme hides its title', async () => {
      themeConfig.signIn.showTitle = false;
      renderInLayout();
      await nextTick();
      const headings = pageHeadings();
      expect(headings).toHaveLength(1);
      expect(headings[0]).toHaveTextContent(title$());
      expect(headings[0]).toHaveClass('visuallyhidden');
      expect(within(screen.getByRole('main')).getByRole('heading', { level: 1 })).toBe(headings[0]);
    });
  });
}
