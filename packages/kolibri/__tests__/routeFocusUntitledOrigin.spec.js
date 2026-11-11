import { screen } from '@testing-library/vue';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';
import { renderAt, settle, titledPage } from './utils/routeFocus';

const LIBRARY_TITLE = 'Library';
const OPENER = 'Opener';

const Untitled = {
  name: 'Untitled',
  render: h => h(ImmersivePage, [h('h1', 'Explore'), h('button', OPENER)]),
};

describe('focus on arriving from a page with no registered title', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      { name: 'EXPLORE', path: '/explore', component: Untitled },
      { name: 'LIBRARY', path: '/library/:id', component: titledPage(LIBRARY_TITLE) },
    ]);
  });

  it("focuses the destination page's heading", async () => {
    await renderAt(vueRouter, '/explore');
    screen.getByRole('button', { name: OPENER }).focus();
    await vueRouter.push('/library/a');
    await settle();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(LIBRARY_TITLE);
    expect(heading).toHaveFocus();
  });
});
