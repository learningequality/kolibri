import router from '../router';
import { renderAt, settle, titledPage } from './utils/routeFocus';

const Redirecting = {
  ...titledPage('Redirecting title'),
  name: 'Redirecting',
  async mounted() {
    await Promise.resolve();
    this.$router.replace('/page');
  },
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
    await settle();
    expect(vueRouter.currentRoute.path).toBe('/page');
    expect(document.body).toHaveFocus();
  });
});
