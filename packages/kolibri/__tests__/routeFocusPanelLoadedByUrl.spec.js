import { screen } from '@testing-library/vue';
import router from '../router';
import { renderAt, settle, titledPage } from './utils/routeFocus';

const PAGE_TITLE = 'Page title';
const PANEL_OPTION = 'Panel option';

const Panel = { name: 'Panel', render: h => h('button', PANEL_OPTION) };

describe('focus when closing a panel loaded by URL', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      {
        name: 'HOST',
        path: '/host',
        component: titledPage(PAGE_TITLE, h => [h('router-view')]),
        children: [{ name: 'PANEL', path: 'panel', component: Panel, meta: { panel: true } }],
      },
    ]);
  });

  it("focuses the host's heading", async () => {
    await renderAt(vueRouter, '/host/panel');
    screen.getByRole('button', { name: PANEL_OPTION }).focus();
    await vueRouter.push('/host');
    await settle();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });
});
