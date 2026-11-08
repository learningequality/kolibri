import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { render, screen } from '@testing-library/vue';
import usePageTitle from 'kolibri/composables/usePageTitle';
import AppBarPage from 'kolibri/components/pages/AppBarPage';
import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
import router from '../router';
import { renderAt as renderRouterAt, settle } from './utils/routeFocus';

const PAGE_TITLE = 'Page title';
const VISIBLE_HEADING = 'Visible heading';
const OPENER = 'Opener';
const PANEL_INPUT = 'Panel input';
const PANEL_OPTION = 'Panel option';
const FIELD = 'Field';
const PERSISTENT = 'Persistent control';
const HEADER_HEADING = 'Header heading';

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
const HeaderBeforeMainRegion = {
  name: 'HeaderBeforeMainRegion',
  render(h) {
    return h('div', [
      h('h1', HEADER_HEADING),
      h('div', { attrs: { role: 'main' } }, this.$slots.default),
    ]);
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

const Wizard = {
  name: 'Wizard',
  setup() {
    usePageTitle(PAGE_TITLE, { hasVisibleHeading: true });
  },
  render: h => h(NoRegion, [h('router-view')]),
};

function wizardStep(heading) {
  return { name: 'WizardStep', render: h => h('div', [h('h1', heading), h('button', OPENER)]) };
}

const loading = ref(false);

const changingTitle = ref(PAGE_TITLE);

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

const ReloadingPage = {
  name: 'ReloadingPage',
  setup() {
    usePageTitle(PAGE_TITLE, { hasVisibleHeading: true });
    return { loading };
  },
  render(h) {
    return h(
      ImmersivePage,
      { props: { loading: this.loading } },
      this.loading ? [] : [h('button', OPENER), h('h1', VISIBLE_HEADING)],
    );
  },
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
  { name: 'CHANGING_TITLE', path: '/changing-title', component: page({ title: changingTitle }) },
  { name: 'VISIBLE', path: '/visible', component: visibleHeadingPage(ImmersivePage) },
  { name: 'MAIN_ROLE', path: '/main-role', component: visibleHeadingPage(MainRegion) },
  { name: 'NO_REGION', path: '/no-region', component: visibleHeadingPage(NoRegion) },
  {
    name: 'HEADER_MAIN_ROLE',
    path: '/header-main-role',
    component: visibleHeadingPage(HeaderBeforeMainRegion),
  },
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
    name: 'OTHER_HOST',
    path: '/other-host',
    component: page({ title: PAGE_TITLE }),
    children: [{ name: 'OTHER_PANEL', path: 'panel', component: Panel, meta: { panel: true } }],
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
      { name: 'OVERVIEW', path: 'overview', component: Empty },
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
    children: [
      { name: 'QUESTION_PANEL', path: 'details', component: Panel, meta: { panel: true } },
    ],
  },
  {
    name: 'RELOADING',
    path: '/reloading/:id',
    component: ReloadingPage,
    meta: { keepFocus: true },
  },
  {
    name: 'GUARDED_RELOADING',
    path: '/guarded-reloading/:id',
    component: ReloadingPage,
    meta: { keepFocus: true },
  },
  { name: 'STEP_ONE', path: '/step/one', component: wizardStep('Step one') },
  { name: 'STEP_TWO', path: '/step/two', component: wizardStep('Step two') },
  { name: 'LOADING', path: '/loading', component: LoadingPage },
  { name: 'LOADING_SEARCH', path: '/loading/search', component: LoadingPage },
  {
    name: 'LOADING_REPORT',
    path: '/report/:id',
    component: LoadingPage,
    meta: { keepFocus: true },
  },
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

async function renderWithPersistentControlAt(path) {
  window.location.hash = `#${path}`;
  render(
    { name: 'App', render: h => h('div', [h('button', PERSISTENT), h('router-view')]) },
    { router: vueRouter },
  );
  await settle();
}

function persistentControl() {
  return screen.getByRole('button', { name: PERSISTENT });
}

async function navigate(location, method = 'push') {
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
    // Coach's global guard shows its loader, then waits on class data before calling next().
    vueRouter.beforeEach((to, from, next) => {
      if (to.name !== 'GUARDED_RELOADING' || to.params.id === from.params.id) {
        next();
        return;
      }
      loading.value = true;
      setTimeout(next);
    });
  });

  it.each([
    ['ImmersivePage', '/topic/a', '/page'],
    ['AppBarPage', '/topic/a', '/topic/b'],
    ['AppBarPage nested route', '/parent', '/parent/step'],
    ['AppBarPage with a header <h1>', '/banner/a', '/banner/b'],
    ['nested keepFocus route', '/page', '/course/one'],
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

  it('focuses a role="main" region\'s heading over a heading before it', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/header-main-role');
    expect(screen.getByRole('heading', { name: VISIBLE_HEADING })).toHaveFocus();
  });

  describe('from a control that stays mounted', () => {
    it.each([
      ['a page change', '/page', '/visible'],
      ['arriving at a keepFocus route from another page', '/page', '/course/one'],
      ['switching to a keepFocus sibling from an unflagged one', '/course/overview', '/course/one'],
      ['switching between unrelated top-level keepFocus routes', '/question/1', '/reloading/a'],
    ])('focuses the heading on %s', async (_, from, to) => {
      await renderWithPersistentControlAt(from);
      persistentControl().focus();
      await navigate(to);
      expect(pageHeading()).toHaveFocus();
    });
  });

  it('focuses the next step heading when the root component registers the title', async () => {
    window.location.hash = '#/step/one';
    render(Wizard, { router: vueRouter });
    await settle();
    opener().focus();
    await navigate('/step/two', 'replace');
    expect(pageHeading()).toHaveTextContent('Step two');
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

    it('keeps the focus the panel returns to its opener when it closes from deeper in', async () => {
      await navigate('/host/panel/deeper');
      const focused = await focusTargetsDuring(() => navigate('/host'));
      expect(opener()).toHaveFocus();
      expect(focused).not.toContain(pageHeading());
    });

    it('focuses the heading of another page the panel navigates to', async () => {
      await navigate('/page');
      expect(pageHeading()).toHaveFocus();
    });

    it('focuses the heading of another page the panel navigates to after its control disables', async () => {
      const control = screen.getByRole('textbox', { name: PANEL_INPUT });
      // jsdom keeps focus on a control that disables, so it is disabled as Chrome blurs it.
      window.addEventListener('focusout', () => (control.disabled = true), {
        capture: true,
        once: true,
      });
      control.blur();
      await navigate('/page');
      expect(pageHeading()).toHaveFocus();
    });
  });

  it('focuses the heading when a panel closes onto a page other than its opener', async () => {
    await renderAt('/host');
    opener().focus();
    await navigate('/other-host/panel');
    await navigate('/other-host');
    expect(pageHeading()).toHaveFocus();
  });

  it('keeps the focus a panel returns to its opener when it closes onto new keepFocus params', async () => {
    await renderAt('/question/2');
    opener().focus();
    await navigate('/question/2/details');
    const focused = await focusTargetsDuring(() => navigate('/question/1', 'replace'));
    expect(opener()).toHaveFocus();
    expect(focused).not.toContain(pageHeading());
  });

  it('keeps the focus a panel returns to its opener when its close redirects', async () => {
    await renderAt('/tabbed/tab');
    opener().focus();
    await navigate('/tabbed/panel');
    const focused = await focusTargetsDuring(() => navigate('/tabbed'));
    expect(opener()).toHaveFocus();
    expect(focused).not.toContain(pageHeading());
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

  // Safari does not focus a clicked button or link.
  it('leaves focus alone when a page changes with nothing focused after an earlier heading focus', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/visible');
    expect(pageHeading()).toHaveFocus();
    opener().focus();
    opener().blur();
    await navigate('/main-role');
    expect(document.body).toHaveFocus();
  });

  it('leaves focus alone when a keepFocus param change reloads the heading the user left', async () => {
    await renderAt('/page');
    opener().focus();
    await navigate('/report/a');
    expect(pageHeading()).toHaveFocus();
    pageHeading().blur();
    loading.value = true;
    await navigate('/report/b');
    loading.value = false;
    await settle();
    expect(document.body).toHaveFocus();
  });

  it('focuses the heading when a keepFocus param change reloads away the focused control', async () => {
    await renderAt('/reloading/a');
    opener().focus();
    loading.value = true;
    await navigate('/reloading/b');
    loading.value = false;
    await settle();
    expect(pageHeading()).toHaveFocus();
  });

  async function arriveAtGuardedReloadingPage() {
    await renderAt('/page');
    opener().focus();
    await navigate('/guarded-reloading/a');
    loading.value = false;
    await settle();
  }

  async function reloadToAnotherId() {
    await navigate('/guarded-reloading/b');
    loading.value = false;
    await settle();
  }

  it('focuses the heading when a guard reloads away the focused control before the route changes', async () => {
    await arriveAtGuardedReloadingPage();
    opener().focus();
    await navigate({ path: '/guarded-reloading/a', query: { tab: 'two' } });
    await reloadToAnotherId();
    expect(pageHeading()).toHaveFocus();
  });

  it('focuses the heading when a guard reloads away the focused control after a heading focus', async () => {
    await arriveAtGuardedReloadingPage();
    expect(pageHeading()).toHaveFocus();
    opener().focus();
    await reloadToAnotherId();
    expect(pageHeading()).toHaveFocus();
  });

  // Checked through focusin: the newly mounted SideNav then takes focus in jsdom.
  it('focuses the heading when arriving at a keepFocus route from another page', async () => {
    await renderAt('/page');
    opener().focus();
    const focused = await focusTargetsDuring(() => navigate('/question/1'));
    expect(focused).toContain(pageHeading());
  });

  it('focuses the heading when going back', async () => {
    await renderAt('/topic/a');
    await navigate('/topic/b');
    opener().focus();
    vueRouter.back();
    await new Promise(resolve => window.addEventListener('popstate', resolve, { once: true }));
    await settle();
    expect(vueRouter.currentRoute.path).toBe('/topic/a');
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
      opener().focus();
      loading.value = false;
      await settle();
      expect(opener()).toHaveFocus();
    });
  });

  it('leaves focus on the body when the title changes after focus left the heading', async () => {
    changingTitle.value = PAGE_TITLE;
    await renderAt('/page');
    opener().focus();
    await navigate('/changing-title');
    expect(pageHeading()).toHaveFocus();
    pageHeading().blur();
    changingTitle.value = VISIBLE_HEADING;
    await settle();
    expect(pageHeading()).toHaveTextContent(VISIBLE_HEADING);
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
