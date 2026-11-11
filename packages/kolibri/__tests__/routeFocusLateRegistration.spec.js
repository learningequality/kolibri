import { ref } from 'vue';
import { screen } from '@testing-library/vue';
import usePageTitle, { pageHeading } from 'kolibri/composables/usePageTitle';
import router from '../router';
import { renderAt, settle, titledPage } from './utils/routeFocus';

const PAGE_TITLE = 'Page title';
const CONTENT_TITLE = 'Content title';
const OPENER = 'Opener';

const contentLoaded = ref(false);

const Content = {
  name: 'Content',
  setup() {
    usePageTitle(CONTENT_TITLE);
  },
  render: h => h('div'),
};

const ContentHost = {
  name: 'ContentHost',
  setup() {
    return { contentLoaded, pageHeading };
  },
  render(h) {
    return h('div', { attrs: { role: 'main' } }, [
      this.pageHeading ? h('h1', this.pageHeading) : null,
      this.contentLoaded ? h(Content) : null,
    ]);
  },
};

describe('focus on a page whose title registers once its content loads', () => {
  let vueRouter;
  beforeAll(() => {
    vueRouter = router.initRoutes([
      {
        name: 'PAGE',
        path: '/page',
        component: titledPage(PAGE_TITLE, h => [h('button', OPENER)]),
      },
      { name: 'CONTENT', path: '/content', component: ContentHost },
      { name: 'CONTENT_TWO', path: '/content/two', component: ContentHost },
    ]);
  });

  it('focuses the heading once the content registers its title', async () => {
    await renderAt(vueRouter, '/page');
    screen.getByRole('button', { name: OPENER }).focus();
    await vueRouter.push('/content');
    await settle();
    contentLoaded.value = true;
    await settle();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(CONTENT_TITLE);
    expect(heading).toHaveFocus();
  });

  it('focuses the heading when the page redirects before its content registers the title', async () => {
    contentLoaded.value = false;
    await renderAt(vueRouter, '/page');
    screen.getByRole('button', { name: OPENER }).focus();
    await vueRouter.push('/content');
    await settle();
    await vueRouter.replace('/content/two');
    await settle();
    contentLoaded.value = true;
    await settle();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });
});
