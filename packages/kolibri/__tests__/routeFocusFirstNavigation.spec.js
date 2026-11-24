import { render, screen } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';
import { settle } from './utils/routeFocus';

const PAGE_TITLE = 'Page title';
const FIELD_LABEL = 'Autofocused field';

const Root = {
  name: 'Root',
  setup() {
    usePageTitle(PAGE_TITLE);
  },
  render: h =>
    h(ImmersivePage, [h('input', { attrs: { 'aria-label': FIELD_LABEL } }), h('router-view')]),
};

describe('focus on the first navigation', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      { name: 'PAGE', path: '/page', component: { name: 'Page', render: h => h('div') } },
    ]);
    vueRouter.beforeEach((to, from, next) => setTimeout(next));
  });

  it('leaves focus on a control focused before the page load resolves', async () => {
    window.location.hash = '#/page';
    render(Root, { router: vueRouter });
    const field = screen.getByRole('textbox', { name: FIELD_LABEL });
    field.focus();
    await settle();
    await settle();
    expect(vueRouter.currentRoute.path).toBe('/page');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(PAGE_TITLE);
    expect(field).toHaveFocus();
  });
});
