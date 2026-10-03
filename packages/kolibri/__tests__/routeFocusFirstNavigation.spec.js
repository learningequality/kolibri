import { render, screen } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';

const PAGE_TITLE = 'Page title';

const Page = {
  name: 'TestPage',
  setup() {
    usePageTitle(PAGE_TITLE);
  },
  render: h => h(ImmersivePage),
};

// Separate from routeFocus.spec.js: the first navigation happens once per module registry.
describe('focus on the first navigation', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([{ name: 'PAGE', path: '/page', component: Page }]);
  });

  it('leaves focus alone even after a keypress during page load', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.location.hash = '#/page';
    render({ name: 'App', render: h => h('router-view') }, { router: vueRouter });
    await new Promise(resolve => setTimeout(resolve));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PAGE_TITLE);
    expect(document.body).toHaveFocus();
  });
});
