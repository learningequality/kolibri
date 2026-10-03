import router from '../router';
import { renderAt, titledPage } from './routeFocusHelpers';

const Redirecting = {
  name: 'Redirecting',
  created() {
    this.$router.replace('/page');
  },
  render: h => h('div'),
};

describe('focus during page load', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      { name: 'PAGE', path: '/page', component: titledPage('Page title') },
      { name: 'REDIRECTING', path: '/redirecting', component: Redirecting },
    ]);
  });

  it('leaves focus alone when a page redirects during page load', async () => {
    await renderAt(vueRouter, '/redirecting');
    expect(vueRouter.currentRoute.path).toBe('/page');
    expect(document.body).toHaveFocus();
  });
});
