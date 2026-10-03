import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { screen } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import AppBarPage from 'kolibri/components/pages/AppBarPage';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';
import { renderAt as renderRouterAt, settle } from './routeFocusHelpers';

const PAGE_TITLE = 'Page title';
const VISIBLE_HEADING = 'Visible heading';
const OPENER = 'Opener';
const PANEL_INPUT = 'Panel input';
const PANEL_OPTION = 'Panel option';
const FIELD = 'Field';

// Route components are compiled without templates in Jest, so they use render functions.
function page({ shell = ImmersivePage, title, options, content = () => [] } = {}) {
  return {
    name: 'TestPage',
    setup() {
      if (title) {
        usePageTitle(title, options);
      }
    },
    render(h) {
      return h(shell, [h('button', OPENER), ...content(h), h('router-view')]);
    },
  };
}

// Mirrors kolibri-common's SidePanelModal focus timing, which this package can't import.
const Panel = {
  name: 'TestPanel',
  setup() {
    const lastFocus = document.activeElement;
    onMounted(() => nextTick(() => screen.getByRole('textbox', { name: PANEL_INPUT }).focus()));
    onUnmounted(() => setTimeout(() => lastFocus.focus()));
  },
  render(h) {
    return h('div', { attrs: { role: 'dialog' } }, [
      h('input', { attrs: { 'aria-label': PANEL_INPUT } }),
      h('router-view'),
    ]);
  },
};

// Shells without `#main`, as user_auth's layout and the setup wizard render.
const MainRegion = {
  name: 'MainRegion',
  render(h) {
    return h('div', { attrs: { role: 'main' } }, this.$slots.default);
  },
};
const NoRegion = {
  name: 'NoRegion',
  render(h) {
    return h('div', this.$slots.default);
  },
};

function visibleHeadingPage(shell) {
  return page({
    shell,
    title: PAGE_TITLE,
    options: { hasVisibleHeading: true },
    content: h => [h('h1', VISIBLE_HEADING)],
  });
}

const Empty = { name: 'Empty', render: h => h('div') };

const loading = ref(false);

// As coach report pages render: their visible <h1> appears only once loading ends.
const LoadingPage = {
  name: 'LoadingPage',
  setup() {
    usePageTitle(PAGE_TITLE, { hasVisibleHeading: true });
    return { loading };
  },
  render(h) {
    return h(ImmersivePage, { props: { loading: this.loading } }, [
      h('button', OPENER),
      this.loading ? null : h('h1', VISIBLE_HEADING),
    ]);
  },
};

// Replaces its route before mounting, as both AllFacilitiesPage.vue files do.
const Redirecting = {
  name: 'Redirecting',
  beforeMount() {
    this.$router.replace('/loading');
  },
  render: h => h('div'),
};

const PanelOption = { name: 'PanelOption', render: h => h('button', PANEL_OPTION) };

// Focuses on insert, as KDS's `v-autofocus` does.
const AutofocusField = {
  name: 'AutofocusField',
  mounted() {
    this.$el.focus();
  },
  render: h => h('input', { attrs: { 'aria-label': FIELD } }),
};

const Topic = page({ shell: AppBarPage, title: PAGE_TITLE });

// Learn's open storage banner renders a `display: none` <h1> in the header, before `#main`.
const BannerTopic = {
  name: 'BannerTopic',
  setup() {
    usePageTitle(PAGE_TITLE);
  },
  render(h) {
    return h(AppBarPage, {
      scopedSlots: {
        storageNotif: () => h('div', [h('h1', { style: { display: 'none' } })]),
        default: () => [h('button', OPENER)],
      },
    });
  },
};

const routes = [
  { name: 'PAGE', path: '/page', component: page({ title: PAGE_TITLE }) },
  { name: 'VISIBLE', path: '/visible', component: visibleHeadingPage(ImmersivePage) },
  { name: 'MAIN_ROLE', path: '/main-role', component: visibleHeadingPage(MainRegion) },
  { name: 'NO_REGION', path: '/no-region', component: visibleHeadingPage(NoRegion) },
  {
    name: 'UNTITLED',
    path: '/untitled',
    component: page({ content: h => [h('h1', VISIBLE_HEADING)] }),
  },
  {
    name: 'HOST',
    path: '/host',
    component: page({ title: PAGE_TITLE }),
    children: [
      {
        path: 'panel',
        component: Panel,
        meta: { panel: true },
        children: [
          { name: 'PANEL_INDEX', path: '', component: PanelOption },
          { name: 'DEEPER', path: 'deeper', component: Empty },
        ],
      },
    ],
  },
  {
    name: 'TABBED',
    path: '/tabbed',
    component: page({ title: PAGE_TITLE }),
    redirect: '/tabbed/tab',
    children: [
      { name: 'TAB', path: 'tab', component: Empty },
      { name: 'TAB_PANEL', path: 'panel', component: Panel, meta: { panel: true } },
    ],
  },
  {
    name: 'COURSE',
    path: '/course',
    component: page({ title: PAGE_TITLE }),
    children: [
      { name: 'TAB_ONE', path: 'one', component: Empty, meta: { keepFocus: true } },
      { name: 'TAB_TWO', path: 'two', component: Empty, meta: { keepFocus: true } },
    ],
  },
  // AppBarPage routes navigate within one shell instance: in jsdom, a newly mounted SideNav
  // focuses its hidden first menu item, which a browser refuses.
  { name: 'TOPIC', path: '/topic/:id', component: Topic },
  { name: 'TOPIC_SEARCH', path: '/topic/:id/search', component: Topic },
  { name: 'BANNER_TOPIC', path: '/banner/:id', component: BannerTopic },
  {
    name: 'PARENT',
    path: '/parent',
    component: page({ shell: AppBarPage, title: PAGE_TITLE }),
    children: [{ name: 'STEP', path: 'step', component: Empty }],
  },
  {
    name: 'QUESTION',
    path: '/question/:n',
    component: page({ shell: AppBarPage, title: PAGE_TITLE }),
    meta: { keepFocus: true },
  },
  { name: 'LOADING', path: '/loading', component: LoadingPage },
  { name: 'LOADING_SEARCH', path: '/loading/search', component: LoadingPage },
  { name: 'REDIRECTING', path: '/redirecting', component: Redirecting },
  {
    name: 'AUTOFOCUS',
    path: '/autofocus',
    component: page({
      title: PAGE_TITLE,
      content: h => [h(AutofocusField)],
    }),
  },
];

let vueRouter;

function renderAt(path) {
  return renderRouterAt(vueRouter, path);
}

async function navigate(location, method = 'push') {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  await vueRouter[method](location);
  await settle();
}

async function focusTargetsDuring(action) {
  const targets = [];
  const onFocusIn = event => targets.push(event.target);
  document.addEventListener('focusin', onFocusIn);
  await action();
  document.removeEventListener('focusin', onFocusIn);
  return targets;
}

function opener() {
  return screen.getByRole('button', { name: OPENER });
}

function pageHeading() {
  return screen.getByRole('heading', { level: 1 });
}

describe('focus after a route change', () => {
  beforeAll(() => {
    vueRouter = router.initRoutes(routes);
  });

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
  });

  it.each([
    ['ImmersivePage', '/topic/a', '/page'],
    ['AppBarPage', '/topic/a', '/topic/b'],
    ['AppBarPage nested route', '/parent', '/parent/step'],
    ['AppBarPage with a header <h1>', '/banner/a', '/banner/b'],
  ])("focuses the %s's hidden heading", async (_, from, to) => {
    await renderAt(from);
    opener().focus();
    await navigate(to);
    expect(pageHeading()).toHaveTextContent(PAGE_TITLE);
    expect(pageHeading()).toHaveFocus();
  });

  it.each([
    ['in #main', '/visible'],
    ['in a role="main" region', '/main-role'],
    ['with no main region', '/no-region'],
  ])("focuses an opted-out page's own heading %s", async (_, to) => {
    await renderAt('/page');
    opener().focus();
    await navigate(to);
    expect(pageHeading()).toHaveTextContent(VISIBLE_HEADING);
    expect(pageHeading()).toHaveFocus();
  });

  describe('with a panel opened from its host', () => {
    let openingFocused;

    beforeEach(async () => {
      await renderAt('/host');
      opener().focus();
      openingFocused = await focusTargetsDuring(() => navigate('/host/panel'));
    });

    function panel() {
      return screen.getByRole('dialog');
    }

    it('keeps focus in the panel', () => {
      expect(panel()).toContainElement(document.activeElement);
      expect(openingFocused).not.toContain(pageHeading());
    });

    it('leaves the heading unfocused when moving deeper into the panel', async () => {
      screen.getByRole('button', { name: PANEL_OPTION }).focus();
      const focused = await focusTargetsDuring(() => navigate('/host/panel/deeper'));
      expect(focused).not.toContain(pageHeading());
    });

    it('keeps the focus the panel returns to its opener when it closes', async () => {
      const focused = await focusTargetsDuring(() => navigate('/host'));
      expect(opener()).toHaveFocus();
      expect(focused).not.toContain(pageHeading());
    });

    it('focuses the heading of another page the panel navigates to', async () => {
      await navigate('/page');
      expect(pageHeading()).toHaveFocus();
    });
  });

  it('keeps the focus a panel returns to its opener when its close redirects', async () => {
    await renderAt('/tabbed/tab');
    opener().focus();
    await navigate('/tabbed/panel');
    const focused = await focusTargetsDuring(() => navigate('/tabbed'));
    expect(opener()).toHaveFocus();
    expect(focused).not.toContain(pageHeading());
  });

  it('focuses the heading when a panel closes without an opener on the page', async () => {
    await renderAt('/host/panel');
    await navigate('/host');
    expect(pageHeading()).toHaveFocus();
  });

  it.each([
    ['switching between keepFocus sibling routes', '/course/one', '/course/two'],
    ['only the query changes', '/page', { path: '/page', query: { filter: 'on' } }],
    ['a keepFocus route changes only its params', '/question/1', '/question/2'],
  ])('keeps focus when %s', async (_, from, to) => {
    await renderAt(from);
    opener().focus();
    await navigate(to);
    expect(opener()).toHaveFocus();
  });

  // Checked through focusin: the newly mounted SideNav then takes focus in jsdom.
  it('focuses the heading when arriving at a keepFocus route from another page', async () => {
    await renderAt('/page');
    opener().focus();
    const focused = await focusTargetsDuring(() => navigate('/question/1'));
    expect(focused).toContain(pageHeading());
  });

  it.each([
    ['another route', '/topic/a/search'],
    ['new params', '/topic/b'],
  ])('keeps focus when a page replaces itself with %s after loading', async (_, location) => {
    await renderAt('/topic/c');
    await navigate('/topic/a');
    opener().focus();
    await vueRouter.replace(location);
    await settle();
    expect(opener()).toHaveFocus();
  });

  it('keeps focus when a keypress comes before a page replaces itself', async () => {
    await renderAt('/topic/c');
    await navigate('/topic/b');
    opener().focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    await settle();
    await vueRouter.replace('/topic/b/search');
    await settle();
    expect(opener()).toHaveFocus();
  });

  it('focuses the heading when the user replaces the route with new params', async () => {
    await renderAt('/topic/a');
    opener().focus();
    await navigate('/topic/b', 'replace');
    expect(pageHeading()).toHaveFocus();
  });

  it('focuses the heading when going back after a redundant replace', async () => {
    await renderAt('/topic/a');
    await navigate('/topic/b');
    await expect(vueRouter.replace('/topic/b')).rejects.toThrow();
    opener().focus();
    vueRouter.back();
    await new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
    await settle();
    expect(vueRouter.currentRoute.path).toBe('/topic/a');
    expect(pageHeading()).toHaveFocus();
  });

  it('focuses the heading when a replace changes the page', async () => {
    await renderAt('/topic/a');
    opener().focus();
    await navigate('/page', 'replace');
    expect(pageHeading()).toHaveFocus();
  });

  describe('on a page that renders its heading once loaded', () => {
    beforeEach(async () => {
      await renderAt('/page');
      opener().focus();
      loading.value = true;
      await navigate('/loading');
    });

    afterEach(() => {
      loading.value = false;
    });

    it('focuses the heading when loading ends', async () => {
      loading.value = false;
      await settle();
      expect(pageHeading()).toHaveFocus();
    });

    it('focuses the heading when the page replaces itself before loading ends', async () => {
      await vueRouter.replace('/loading/search');
      loading.value = false;
      await settle();
      expect(pageHeading()).toHaveFocus();
    });

    it('keeps the focus the user moves during loading', async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      opener().focus();
      loading.value = false;
      await settle();
      expect(opener()).toHaveFocus();
    });
  });

  it('stops waiting for the heading of a redirect target once the user acts', async () => {
    await renderAt('/page');
    opener().focus();
    loading.value = true;
    await navigate('/redirecting');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    loading.value = false;
    await settle();
    expect(document.body).toHaveFocus();
  });

  it('keeps the focus a page gives its autofocused field', async () => {
    await renderAt('/topic/a');
    opener().focus();
    await navigate('/autofocus');
    expect(screen.getByRole('textbox', { name: FIELD })).toHaveFocus();
  });

  it('leaves focus alone on a page with no registered title', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/untitled');
    expect(document.body).toHaveFocus();
  });
});
