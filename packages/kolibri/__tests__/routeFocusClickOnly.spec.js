import { screen } from '@testing-library/vue';
import router from '../router';
import { renderAt, settle, titledPage } from './routeFocusHelpers';

const OTHER_TITLE = 'Other title';
const LINK = 'Link';

describe('focus after the first input', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      {
        name: 'PAGE',
        path: '/page',
        component: titledPage('Page title', h => [
          h('router-link', { props: { to: '/other' } }, LINK),
        ]),
      },
      { name: 'OTHER', path: '/other', component: titledPage(OTHER_TITLE) },
    ]);
  });

  it('focuses the heading after a navigation by click alone', async () => {
    await renderAt(vueRouter, '/page');
    screen.getByRole('link', { name: LINK }).click();
    await settle();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(OTHER_TITLE);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });
});
