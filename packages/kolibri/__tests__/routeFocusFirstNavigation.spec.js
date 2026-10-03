import { screen } from '@testing-library/vue';
import router from '../router';
import { renderAt, titledPage } from './routeFocusHelpers';

const PAGE_TITLE = 'Page title';

describe('focus on the first navigation', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      { name: 'PAGE', path: '/page', component: titledPage(PAGE_TITLE) },
    ]);
  });

  it('leaves focus alone even after a keypress during page load', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await renderAt(vueRouter, '/page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PAGE_TITLE);
    expect(document.body).toHaveFocus();
  });
});
